import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_H = { ...CORS, "Content-Type": "application/json" };
const ASAAS = "https://api.asaas.com/v3";

function resp(body: object) {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_H });
}

// Compute next YYYY-MM-DD for a given due_day (>= today)
function nextDueDate(dueDay: number): string {
  const day = Math.min(Math.max(dueDay || 1, 1), 28);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let target = new Date(y, m, day);
  if (target.getTime() <= now.getTime()) {
    target = new Date(y, m + 1, day);
  }
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getOrCreateCustomer(
  supabase: ReturnType<typeof createClient>,
  subKey: string,
  brokerId: string,
  tenant: any
): Promise<{ id: string | null; error?: string }> {
  const { data: existingCustomer } = await supabase
    .from("asaas_customers")
    .select("asaas_customer_id")
    .eq("broker_id", brokerId)
    .eq("contact_id", tenant.id)
    .maybeSingle();

  if (existingCustomer?.asaas_customer_id) {
    return { id: existingCustomer.asaas_customer_id as string };
  }

  const cleanDoc = tenant.document_number?.replace(/\D/g, "") || "";
  const customerPayload: Record<string, unknown> = {
    name: tenant.name,
    externalReference: `slotimob:contact:${tenant.id}`,
  };
  if (tenant.email) customerPayload.email = tenant.email;
  if (tenant.phone) customerPayload.mobilePhone = tenant.phone.replace(/\D/g, "");
  if (cleanDoc) customerPayload.cpfCnpj = cleanDoc;
  if (tenant.address) customerPayload.address = tenant.address;
  if (tenant.neighborhood) customerPayload.province = tenant.neighborhood;
  if (tenant.city) customerPayload.city = tenant.city;
  if (tenant.state) customerPayload.state = tenant.state;
  if (tenant.postal_code) customerPayload.postalCode = tenant.postal_code.replace(/\D/g, "");

  const customerRes = await fetch(`${ASAAS}/customers`, {
    method: "POST",
    headers: { "access_token": subKey, "Content-Type": "application/json" },
    body: JSON.stringify(customerPayload),
  });
  const customerData = await customerRes.json();
  console.log("[asaas-subscription] Customer:", JSON.stringify(customerData));

  let asaasCustomerId: string | null = null;
  if (!customerRes.ok) {
    if (cleanDoc && (customerData?.errors?.[0]?.description?.toLowerCase().includes("já utilizado") ||
        customerData?.errors?.[0]?.code?.includes("cpfCnpj"))) {
      const searchRes = await fetch(`${ASAAS}/customers?cpfCnpj=${cleanDoc}&limit=1`, {
        headers: { "access_token": subKey },
      });
      const searchData = await searchRes.json();
      asaasCustomerId = searchData?.data?.[0]?.id ?? null;
    }
    if (!asaasCustomerId) {
      return { id: null, error: customerData?.errors?.[0]?.description || "Erro ao criar cliente no Asaas" };
    }
  } else {
    asaasCustomerId = customerData.id;
  }

  if (asaasCustomerId) {
    supabase.from("asaas_customers").insert({
      broker_id: brokerId,
      contact_id: tenant.id,
      asaas_customer_id: asaasCustomerId,
    }).then(({ error }: { error: unknown }) => {
      if (error) console.warn("[asaas-subscription] Customer insert:", (error as Error).message);
    });
  }

  return { id: asaasCustomerId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return resp({ error: "Não autorizado" });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return resp({ error: "Token inválido" });

    const body = await req.json();
    const {
      action,
      lease_id,
      broker_id: brokerIdOverride,
      billing_type,
      value: valueParam,
      next_due_date: nextDueDateParam,
      fine: fineParam,
      interest: interestParam,
    } = body;

    if (!action || !lease_id) {
      return resp({ error: "action e lease_id são obrigatórios." });
    }
    const VALID_ACTIONS = ["create", "update", "cancel", "get", "sync_payments"];
    if (!VALID_ACTIONS.includes(action)) {
      return resp({ error: `action inválida. Use: ${VALID_ACTIONS.join(", ")}` });
    }

    // super_admin override
    let effectiveBrokerId = user.id;
    if (brokerIdOverride && brokerIdOverride !== user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "super_admin") {
        effectiveBrokerId = brokerIdOverride;
      }
    }

    // Load lease
    const { data: lease, error: leaseErr } = await supabase
      .from("leases")
      .select(`
        id, broker_id, rent_amount, due_day, end_date, billing_automation,
        tenant_contact:contacts!leases_tenant_contact_id_fkey (
          id, name, email, phone, document_number,
          address, neighborhood, city, state, postal_code
        ),
        unit:units!leases_unit_id_fkey (id, name, address, neighborhood, city, state)
      `)
      .eq("id", lease_id)
      .maybeSingle();

    if (leaseErr || !lease) return resp({ error: "Contrato não encontrado." });
    if ((lease as any).broker_id !== effectiveBrokerId) {
      return resp({ error: "Você não tem permissão para este contrato." });
    }

    // Load asaas account of broker (marketplace subaccount key)
    const { data: account } = await supabase
      .from("asaas_accounts")
      .select("asaas_api_key, status")
      .eq("broker_id", effectiveBrokerId)
      .eq("status", "active")
      .maybeSingle();

    if (!account?.asaas_api_key) {
      return resp({ error: "Subconta Asaas não configurada. Acesse /settings > Integração Asaas para ativar." });
    }
    const subKey = account.asaas_api_key as string;

    const currentAutomation: Record<string, any> =
      (lease as any).billing_automation && typeof (lease as any).billing_automation === "object"
        ? { ...(lease as any).billing_automation }
        : {};
    const currentSub = currentAutomation.asaas_subscription || null;

    // -----------------------------------------------------------------
    // CREATE
    // -----------------------------------------------------------------
    if (action === "create") {
      const tenant = (lease as any).tenant_contact;
      if (!tenant) return resp({ error: "Inquilino não cadastrado neste contrato." });

      const { id: customerId, error: customerErr } = await getOrCreateCustomer(
        supabase, subKey, effectiveBrokerId, tenant
      );
      if (!customerId) return resp({ error: customerErr || "Não foi possível identificar o cliente no Asaas." });

      const bType = ["BOLETO", "PIX", "UNDEFINED"].includes(billing_type) ? billing_type : "UNDEFINED";
      const value = valueParam ? Math.abs(parseFloat(String(valueParam))) : Number((lease as any).rent_amount);
      const nextDue = nextDueDateParam || nextDueDate((lease as any).due_day || 10);
      const fineVal = fineParam !== undefined ? Number(fineParam) : 10;
      const interestVal = interestParam !== undefined ? Number(interestParam) : 1;

      const unit = (lease as any).unit;
      const enderecoParts = [unit?.address, unit?.neighborhood, unit?.city].filter(Boolean);
      const endereco = enderecoParts.length ? enderecoParts.join(", ") : (unit?.name || "imóvel");

      const subPayload: Record<string, unknown> = {
        customer: customerId,
        billingType: bType,
        value,
        nextDueDate: nextDue,
        cycle: "MONTHLY",
        description: `Aluguel — ${endereco}`,
        externalReference: lease_id,
        fine: { value: fineVal },
        interest: { value: interestVal },
      };
      if ((lease as any).end_date) subPayload.endDate = (lease as any).end_date;

      const subRes = await fetch(`${ASAAS}/subscriptions`, {
        method: "POST",
        headers: { "access_token": subKey, "Content-Type": "application/json" },
        body: JSON.stringify(subPayload),
      });
      const subData = await subRes.json();
      console.log("[asaas-subscription] create:", JSON.stringify(subData));

      if (!subRes.ok) {
        const errMsg = subData?.errors?.[0]?.description || subData?.message || "Erro ao criar assinatura no Asaas";
        return resp({ error: errMsg });
      }

      const merged = {
        ...currentAutomation,
        asaas_subscription: {
          id: subData.id,
          status: "ACTIVE",
          billing_type: bType,
          value,
          cycle: "MONTHLY",
          next_due_date: nextDue,
          fine: fineVal,
          interest: interestVal,
          created_at: new Date().toISOString(),
        },
      };

      const { error: updErr } = await supabase
        .from("leases")
        .update({ billing_automation: merged })
        .eq("id", lease_id);
      if (updErr) console.error("[asaas-subscription] lease update err:", updErr);

      return resp({ success: true, subscription: subData, billing_automation: merged });
    }

    // -----------------------------------------------------------------
    // UPDATE
    // -----------------------------------------------------------------
    if (action === "update") {
      if (!currentSub?.id) return resp({ error: "Nenhuma assinatura ativa encontrada para este contrato." });

      const updatePayload: Record<string, unknown> = {};
      if (valueParam !== undefined) updatePayload.value = Math.abs(parseFloat(String(valueParam)));
      if (nextDueDateParam) updatePayload.nextDueDate = nextDueDateParam;
      if (billing_type && ["BOLETO", "PIX", "UNDEFINED"].includes(billing_type)) {
        updatePayload.billingType = billing_type;
      }
      if (fineParam !== undefined) updatePayload.fine = { value: Number(fineParam) };
      if (interestParam !== undefined) updatePayload.interest = { value: Number(interestParam) };

      if (Object.keys(updatePayload).length === 0) {
        return resp({ error: "Nenhum campo enviado para atualização." });
      }

      const upRes = await fetch(`${ASAAS}/subscriptions/${currentSub.id}`, {
        method: "POST",
        headers: { "access_token": subKey, "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const upData = await upRes.json();
      console.log("[asaas-subscription] update:", JSON.stringify(upData));

      if (!upRes.ok) {
        const errMsg = upData?.errors?.[0]?.description || upData?.message || "Erro ao atualizar assinatura";
        return resp({ error: errMsg });
      }

      const mergedSub = {
        ...currentSub,
        ...(updatePayload.value !== undefined && { value: updatePayload.value }),
        ...(updatePayload.nextDueDate && { next_due_date: updatePayload.nextDueDate }),
        ...(updatePayload.billingType && { billing_type: updatePayload.billingType }),
        ...(fineParam !== undefined && { fine: Number(fineParam) }),
        ...(interestParam !== undefined && { interest: Number(interestParam) }),
        updated_at: new Date().toISOString(),
      };
      const merged = { ...currentAutomation, asaas_subscription: mergedSub };

      const { error: updErr } = await supabase
        .from("leases")
        .update({ billing_automation: merged })
        .eq("id", lease_id);
      if (updErr) console.error("[asaas-subscription] lease update err:", updErr);

      return resp({ success: true, subscription: upData, billing_automation: merged });
    }

    // -----------------------------------------------------------------
    // CANCEL
    // -----------------------------------------------------------------
    if (action === "cancel") {
      if (!currentSub?.id) return resp({ error: "Nenhuma assinatura ativa encontrada para este contrato." });

      const delRes = await fetch(`${ASAAS}/subscriptions/${currentSub.id}`, {
        method: "DELETE",
        headers: { "access_token": subKey },
      });
      const delData = await delRes.json().catch(() => ({}));
      console.log("[asaas-subscription] cancel:", JSON.stringify(delData));

      if (!delRes.ok && delRes.status !== 404) {
        const errMsg = delData?.errors?.[0]?.description || "Erro ao cancelar assinatura";
        return resp({ error: errMsg });
      }

      const mergedSub = { ...currentSub, status: "CANCELLED", cancelled_at: new Date().toISOString() };
      const merged = { ...currentAutomation, asaas_subscription: mergedSub };

      const { error: updErr } = await supabase
        .from("leases")
        .update({ billing_automation: merged })
        .eq("id", lease_id);
      if (updErr) console.error("[asaas-subscription] lease update err:", updErr);

      return resp({ success: true, billing_automation: merged });
    }

    // -----------------------------------------------------------------
    // GET
    // -----------------------------------------------------------------
    if (action === "get") {
      if (!currentSub?.id) return resp({ error: "Nenhuma assinatura vinculada a este contrato." });

      const gRes = await fetch(`${ASAAS}/subscriptions/${currentSub.id}`, {
        headers: { "access_token": subKey },
      });
      const gData = await gRes.json();
      if (!gRes.ok) {
        const errMsg = gData?.errors?.[0]?.description || "Erro ao consultar assinatura";
        return resp({ error: errMsg });
      }
      return resp({ success: true, subscription: gData, local: currentSub });
    }

    // -----------------------------------------------------------------
    // SYNC_PAYMENTS
    // -----------------------------------------------------------------
    if (action === "sync_payments") {
      const collected: any[] = [];

      if (currentSub?.id) {
        const sRes = await fetch(
          `${ASAAS}/subscriptions/${currentSub.id}/payments?limit=100`,
          { headers: { "access_token": subKey } }
        );
        const sData = await sRes.json();
        if (sRes.ok && Array.isArray(sData?.data)) {
          collected.push(...sData.data);
        }
      }

      const eRes = await fetch(
        `${ASAAS}/payments?externalReference=${encodeURIComponent(lease_id)}&limit=100`,
        { headers: { "access_token": subKey } }
      );
      const eData = await eRes.json();
      if (eRes.ok && Array.isArray(eData?.data)) {
        for (const p of eData.data) {
          if (!collected.find((c) => c.id === p.id)) collected.push(p);
        }
      }

      let synced = 0;
      for (const p of collected) {
        const row = {
          broker_id: effectiveBrokerId,
          lease_id,
          asaas_payment_id: p.id,
          asaas_subscription_id: p.subscription ?? null,
          billing_type: p.billingType ?? "UNDEFINED",
          value: p.value,
          due_date: p.dueDate,
          status: p.status ?? "PENDING",
          bank_slip_url: p.bankSlipUrl ?? null,
          invoice_url: p.invoiceUrl ?? null,
        };
        const { error: upErr } = await supabase
          .from("asaas_payments")
          .upsert(row, { onConflict: "asaas_payment_id" });
        if (upErr) console.warn("[asaas-subscription] upsert err:", upErr.message);
        else synced++;
      }

      return resp({ success: true, synced, total_fetched: collected.length });
    }

    return resp({ error: "action não implementada." });

  } catch (err) {
    console.error("[asaas-subscription] Error:", err);
    return resp({ error: "Erro inesperado: " + (err as Error).message });
  }
});
