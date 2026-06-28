import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

async function asaasRequest(path: string, method = "GET", body?: unknown) {
  const apiKey = Deno.env.get("ASAAS_API_KEY")!;
  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.errors?.[0]?.description || `Asaas API error ${res.status}`;
    console.error("[Asaas]", path, errMsg, JSON.stringify(data));
    throw new Error(errMsg);
  }
  return data;
}

function nextDueDateStr(daysAhead = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Autenticação necessária" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email ?? "";
    const body = await req.json();
    const { product_type, plan_id, billing_cycle, addon_id, credit_pack_id } = body;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, cpf, cnpj")
      .eq("id", userId)
      .single();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("billing_provider, asaas_customer_id, status, price_locked, is_early_adopter")
      .eq("user_id", userId)
      .single();

    if (subscription?.billing_provider === "stripe") {
      return new Response(JSON.stringify({ error: "Sua assinatura está gerenciada via Stripe. Entre em contato com o suporte." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create Asaas customer
    let asaasCustomerId: string = subscription?.asaas_customer_id ?? "";
    if (!asaasCustomerId) {
      const customerPayload: Record<string, unknown> = {
        name: profile?.full_name || userEmail || "Cliente Slotimob",
        email: profile?.email || userEmail,
        notificationDisabled: false,
      };
      if (profile?.phone) {
        customerPayload.mobilePhone = profile.phone.replace(/\D/g, "");
      }
      const customer = await asaasRequest("/customers", "POST", customerPayload);
      asaasCustomerId = customer.id;
      await supabase
        .from("subscriptions")
        .update({ asaas_customer_id: asaasCustomerId, billing_provider: "asaas" })
        .eq("user_id", userId);
    }

    // ─── SUBSCRIPTION (plano) ─────────────────────────────────────────────
    if (product_type === "subscription") {
      if (!plan_id || !billing_cycle) {
        return new Response(JSON.stringify({ error: "plan_id e billing_cycle são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id, price_original, price_early_adopter, price_annual, price_annual_early_adopter")
        .eq("id", plan_id)
        .single();

      if (!plan) {
        return new Response(JSON.stringify({ error: "Plano não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Early adopter: já tem lock, ou verificar vagas restantes
      const alreadyEa = !!(subscription?.price_locked || subscription?.is_early_adopter);
      let earlyAdopterEligible = false;
      if (!alreadyEa) {
        const { data: remaining } = await supabase.rpc("get_early_adopter_remaining_slots", { p_plan_id: plan_id });
        earlyAdopterEligible = Number(remaining ?? 0) > 0;
      }
      const useEarlyAdopter = alreadyEa || earlyAdopterEligible;

      const isAnnual = billing_cycle === "annual";
      let value: number;
      let cycle: string;
      let extRef: string;

      if (isAnnual) {
        cycle = "YEARLY";
        if (useEarlyAdopter && plan.price_annual_early_adopter) {
          // price_annual_early_adopter está salvo como valor mensal; total = × 12
          value = Number(plan.price_annual_early_adopter) * 12;
          extRef = `${userId}:${plan_id}:yearly:ea`;
        } else {
          value = Number(plan.price_annual); // já é o total anual
          extRef = `${userId}:${plan_id}:yearly`;
        }
      } else {
        cycle = "MONTHLY";
        if (useEarlyAdopter && plan.price_early_adopter) {
          value = Number(plan.price_early_adopter);
          extRef = `${userId}:${plan_id}:monthly:ea`;
        } else {
          value = Number(plan.price_original);
          extRef = `${userId}:${plan_id}:monthly`;
        }
      }

      const planName = plan_id.charAt(0).toUpperCase() + plan_id.slice(1);
      const sub = await asaasRequest("/subscriptions", "POST", {
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value,
        nextDueDate: nextDueDateStr(1),
        cycle,
        description: `Slotimob ${planName} ${isAnnual ? "Anual" : "Mensal"}`,
        externalReference: extRef,
      });

      await supabase
        .from("subscriptions")
        .update({
          asaas_subscription_id: sub.id,
          billing_provider: "asaas",
          asaas_customer_id: asaasCustomerId,
          ...(useEarlyAdopter ? { price_locked: true, is_early_adopter: true } : {}),
        })
        .eq("user_id", userId);

      const invoiceUrl = sub.invoiceUrl || `https://www.asaas.com/s/${sub.id}`;
      return new Response(JSON.stringify({ url: invoiceUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ADDON ────────────────────────────────────────────────────────────
    if (product_type === "addon") {
      if (!addon_id) {
        return new Response(JSON.stringify({ error: "addon_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: addon } = await supabase
        .from("subscription_addons")
        .select("id, name, price")
        .eq("id", addon_id)
        .single();

      if (!addon) {
        return new Response(JSON.stringify({ error: "Add-on não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const extRef = `${userId}:addon:${addon_id}`;
      const sub = await asaasRequest("/subscriptions", "POST", {
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: Number(addon.price),
        nextDueDate: nextDueDateStr(1),
        cycle: "MONTHLY",
        description: `Slotimob Add-on: ${addon.name}`,
        externalReference: extRef,
      });

      await supabase
        .from("asaas_addon_subscriptions")
        .insert({
          broker_id: userId,
          addon_id: addon.id,
          asaas_subscription_id: sub.id,
          quantity: 1,
          status: "pending",
        });

      const invoiceUrl = sub.invoiceUrl || `https://www.asaas.com/s/${sub.id}`;
      return new Response(JSON.stringify({ url: invoiceUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── AI CREDITS ───────────────────────────────────────────────────────
    if (product_type === "ai_credits") {
      if (!credit_pack_id) {
        return new Response(JSON.stringify({ error: "credit_pack_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: pack } = await supabase
        .from("ai_credit_packs")
        .select("id, name, price, credits_amount")
        .eq("id", credit_pack_id)
        .single();

      if (!pack) {
        return new Response(JSON.stringify({ error: "Pack de créditos não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const extRef = `${userId}:ai_credits:${pack.credits_amount}`;
      const payment = await asaasRequest("/payments", "POST", {
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: Number(pack.price),
        dueDate: nextDueDateStr(1),
        description: `Slotimob IA: ${pack.name}`,
        externalReference: extRef,
      });

      const invoiceUrl = payment.invoiceUrl || payment.bankSlipUrl || `https://www.asaas.com/i/${payment.id}`;
      return new Response(JSON.stringify({ url: invoiceUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `product_type inválido: ${product_type}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[create-checkout-session]", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar checkout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
