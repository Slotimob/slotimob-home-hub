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
    const { lease_id, billing_type, due_date, description, amount_override, broker_id: brokerIdOverride } = body;

    if (!lease_id || !billing_type || !due_date) {
      return resp({ error: "lease_id, billing_type e due_date são obrigatórios." });
    }
    if (!["BOLETO", "PIX"].includes(billing_type)) {
      return resp({ error: "billing_type deve ser BOLETO ou PIX." });
    }

    // Valida due_date: formato YYYY-MM-DD e não pode ser no passado
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(due_date)) || Number.isNaN(new Date(`${due_date}T12:00:00`).getTime())) {
      return resp({ error: "A data de vencimento não pode ser no passado." });
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (String(due_date) < todayStr) {
      return resp({ error: "A data de vencimento não pode ser no passado." });
    }

    // Valida amount_override quando enviado
    let overrideValue: number | null = null;
    if (amount_override !== undefined && amount_override !== null && amount_override !== "") {
      const parsed = Math.abs(parseFloat(String(amount_override)));
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1000000) {
        return resp({ error: "Valor da cobrança inválido." });
      }
      overrideValue = parsed;
    }



    // Resolve effective broker: members act under the owner's Asaas subaccount.
    let effectiveBrokerId = user.id;
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_owner_id, permissions")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) {
      effectiveBrokerId = membership.organization_owner_id as string;
      const perms = (membership.permissions as any) || {};
      const boletos = perms.management_boletos || {};
      if (boletos.create !== true) {
        return resp({ error: "Você não tem permissão para emitir cobranças. Fale com o administrador da sua conta." });
      }
    }

    // super_admin override (canonical: is_super_admin via user_roles) — applies on top.
    if (brokerIdOverride && brokerIdOverride !== effectiveBrokerId) {
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { p_user_id: user.id });
      if (isSuperAdmin === true) {
        effectiveBrokerId = brokerIdOverride;
      }
    }

    const { data: account } = await supabase
      .from("asaas_accounts")
      .select("asaas_api_key_encrypted, status")
      .eq("broker_id", effectiveBrokerId)
      .eq("status", "active")
      .maybeSingle();

    if (!account?.asaas_api_key_encrypted) {
      return resp({ error: "Subconta Asaas não configurada. Acesse Configurações > Integração Asaas para ativar." });
    }

    const { data: decryptedKey, error: decryptErr } = await supabase.rpc("decrypt_asaas_api_key", { p_encrypted: account.asaas_api_key_encrypted });
    if (decryptErr || !decryptedKey) {
      console.error("[create-asaas-charge] Decrypt error:", decryptErr);
      return resp({ error: "Erro ao acessar a chave da subconta Asaas." });
    }
    const subKey = decryptedKey as string;

    const { data: lease, error: leaseErr } = await supabase
      .from("leases")
      .select(`
        id, rent_amount, due_day,
        tenant_contact:contacts!leases_tenant_contact_id_fkey (
          id, name, email, phone, document_number, document_type,
          address, neighborhood, city, state, postal_code
        ),
        unit:units!leases_unit_id_fkey (id, name)
      `)
      .eq("id", lease_id)
      .eq("broker_id", effectiveBrokerId)
      .maybeSingle();

    if (leaseErr || !lease) return resp({ error: "Contrato não encontrado." });

    const tenant = (lease as any).tenant_contact;
    if (!tenant) return resp({ error: "Inquilino não cadastrado neste contrato." });

    let asaasCustomerId: string | null = null;

    const { data: existingCustomer } = await supabase
      .from("asaas_customers")
      .select("asaas_customer_id")
      .eq("broker_id", effectiveBrokerId)
      .eq("contact_id", tenant.id)
      .maybeSingle();

    if (existingCustomer?.asaas_customer_id) {
      asaasCustomerId = existingCustomer.asaas_customer_id;
    } else {
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
      console.log("[create-asaas-charge] Customer:", JSON.stringify(customerData));

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
          const errMsg = customerData?.errors?.[0]?.description || "Erro ao criar cliente no Asaas";
          return resp({ error: errMsg });
        }
      } else {
        asaasCustomerId = customerData.id;
      }

      if (asaasCustomerId) {
        supabase.from("asaas_customers").insert({
          broker_id: effectiveBrokerId,
          contact_id: tenant.id,
          asaas_customer_id: asaasCustomerId,
        }).then(({ error }) => {
          if (error) console.warn("[create-asaas-charge] Customer insert:", error.message);
        });
      }
    }

    if (!asaasCustomerId) return resp({ error: "Não foi possível identificar o cliente no Asaas." });

    const value = amount_override ? Math.abs(parseFloat(String(amount_override))) : Number(lease.rent_amount);
    const unitName = (lease as any).unit?.name || "";
    const dueDateObj = new Date(due_date + "T12:00:00");
    const monthYear = dueDateObj.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const chargeDesc = description || `Aluguel${unitName ? " — " + unitName : ""} (${monthYear})`;

    const paymentRes = await fetch(`${ASAAS}/payments`, {
      method: "POST",
      headers: { "access_token": subKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: billing_type,
        value,
        dueDate: due_date,
        description: chargeDesc,
        externalReference: `slotimob:lease:${lease_id}:${due_date}`,
      }),
    });

    const paymentData = await paymentRes.json();
    console.log("[create-asaas-charge] Payment:", JSON.stringify(paymentData));

    if (!paymentRes.ok) {
      const errMsg = paymentData?.errors?.[0]?.description || paymentData?.message || "Erro ao criar cobrança no Asaas";
      return resp({ error: errMsg });
    }

    const asaasPaymentId = paymentData.id;
    const bankSlipUrl: string | null = paymentData.bankSlipUrl ?? null;
    const invoiceUrl: string | null = paymentData.invoiceUrl ?? null;
    let pixQrCode: string | null = null;
    let pixCopyPaste: string | null = null;

    if (billing_type === "PIX") {
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 1500));
        const pixRes = await fetch(`${ASAAS}/payments/${asaasPaymentId}/pixQrCode`, {
          headers: { "access_token": subKey },
        });
        if (pixRes.ok) {
          const pixData = await pixRes.json();
          pixQrCode = pixData.encodedImage ?? null;
          pixCopyPaste = pixData.payload ?? null;
          if (pixCopyPaste) break;
        }
      }
    }

    const { data: savedPayment, error: saveErr } = await supabase
      .from("asaas_payments")
      .insert({
        broker_id: effectiveBrokerId,
        lease_id,
        asaas_payment_id: asaasPaymentId,
        billing_type,
        value,
        due_date,
        status: paymentData.status || "PENDING",
        bank_slip_url: bankSlipUrl,
        pix_qr_code: pixQrCode,
        pix_copy_paste: pixCopyPaste,
        invoice_url: invoiceUrl,
      })
      .select()
      .single();

    if (saveErr) {
      console.error("[create-asaas-charge] DB save error:", saveErr);
      return resp({
        success: true,
        warning: "Cobrança criada no Asaas mas erro ao salvar localmente.",
        asaas_payment_id: asaasPaymentId,
        billing_type,
        value,
        due_date,
        status: paymentData.status || "PENDING",
        bank_slip_url: bankSlipUrl,
        pix_qr_code: pixQrCode,
        pix_copy_paste: pixCopyPaste,
        invoice_url: invoiceUrl,
      });
    }

    console.log(`[create-asaas-charge] Payment ${asaasPaymentId} saved (lease ${lease_id})`);
    return resp({
      success: true,
      id: savedPayment.id,
      asaas_payment_id: asaasPaymentId,
      billing_type,
      value,
      due_date,
      status: savedPayment.status,
      bank_slip_url: bankSlipUrl,
      pix_qr_code: pixQrCode,
      pix_copy_paste: pixCopyPaste,
      invoice_url: invoiceUrl,
      tenant_name: tenant.name,
      unit_name: unitName,
    });

  } catch (err) {
    console.error("[create-asaas-charge] Error:", err);
    return resp({ error: "Erro inesperado: " + (err as Error).message });
  }
});
