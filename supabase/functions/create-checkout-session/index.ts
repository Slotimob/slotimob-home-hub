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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email ?? "";

    // Bloqueia membros convidados: apenas o dono da conta gerencia a assinatura da plataforma
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) {
      return new Response(JSON.stringify({
        error: "Você é um usuário convidado. Assinaturas e planos da plataforma são gerenciados pelo administrador (proprietário) da conta principal."
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Trava: e-mail precisa estar verificado antes de qualquer chamada à Asaas
    const { data: verifyProfile } = await supabase
      .from("profiles")
      .select("email_verified_at")
      .eq("id", userId)
      .maybeSingle();

    if (!verifyProfile?.email_verified_at) {
      return new Response(JSON.stringify({
        error: "email_nao_verificado",
        message: "Confirme seu e-mail antes de continuar com o pagamento."
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit: 5 tentativas de checkout / 10 min por usuário
    const rlWindowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: rlError } = await supabase
      .from("rate_limits")
      .select("id")
      .eq("identifier", userId)
      .eq("endpoint", "checkout_session")
      .gte("window_start", rlWindowStart);

    if (rlError) {
      console.error("[checkout] erro ao consultar rate_limits:", rlError.message);
    }

    if ((recentAttempts?.length ?? 0) >= 5) {
      console.log("[checkout] rate limit atingido");
      return new Response(JSON.stringify({
        error: "Muitas tentativas de pagamento. Aguarde alguns minutos."
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("rate_limits").insert({
      identifier: userId,
      endpoint: "checkout_session",
      request_count: 1,
      window_start: new Date().toISOString(),
    });


    const body = await req.json();
    const { product_type, plan_id, billing_cycle, billing_type, addon_id, credit_pack_id } = body;
    console.log("[checkout] body recebido:", JSON.stringify({ product_type, plan_id, billing_cycle, billing_type }));

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, cpf, cnpj")
      .eq("id", userId)
      .single();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("billing_provider, asaas_customer_id, status, plan_id, current_period_end, asaas_subscription_id")
      .eq("user_id", userId)
      .single();

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
      const cpfCnpjValue = (profile as any)?.cpf || (profile as any)?.cnpj;
      if (cpfCnpjValue) {
        customerPayload.cpfCnpj = cpfCnpjValue.replace(/\D/g, "");
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
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id, price_original, price_annual")
        .eq("id", plan_id)
        .single();

      if (!plan) {
        return new Response(JSON.stringify({ error: "Plano não encontrado" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isAnnual = billing_cycle === "annual";
      let value: number;
      let cycle: string;
      let extRef: string;

      if (isAnnual) {
        cycle = "YEARLY";
        value = Number(plan.price_annual); // total anual
        extRef = `${userId}:${plan_id}:yearly`;
      } else {
        cycle = "MONTHLY";
        value = Number(plan.price_original);
        extRef = `${userId}:${plan_id}:monthly`;
      }

      const planName = plan_id.charAt(0).toUpperCase() + plan_id.slice(1);
      const asaasBillingType = billing_type || "BOLETO";
      console.log("[checkout] billing_type recebido:", billing_type, "→ usando:", asaasBillingType);

      if (asaasBillingType === "BOLETO") {
        const cpfCnpjRaw = (profile as any)?.cpf || (profile as any)?.cnpj;
        if (!cpfCnpjRaw) {
          return new Response(JSON.stringify({
            error: "Para boleto bancário, CPF ou CNPJ é obrigatório. Preencha seus dados fiscais e tente novamente."
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      // ── Upgrade de plano: cancelar subscription Asaas anterior se existir ──────
      // Garante que o usuário não pague duplo ao fazer upgrade (Pro → Business)
      const planHierarchy: Record<string, number> = { start: 0, free: 0, essencial: 1, pro: 2, business: 3 };
      const currentPlanRank = planHierarchy[subscription?.plan_id ?? 'start'] ?? 0;
      const newPlanRank = planHierarchy[plan_id] ?? 0;
      const isUpgrade = newPlanRank > currentPlanRank && !!subscription?.asaas_subscription_id;

      if (isUpgrade) {
        console.log(`[checkout] Upgrade detectado: ${subscription?.plan_id} → ${plan_id}. Cancelando sub anterior: ${subscription?.asaas_subscription_id}`);
        const cancelRes = await fetch(`${ASAAS_API_URL}/subscriptions/${subscription!.asaas_subscription_id}`, {
          method: "DELETE",
          headers: { "access_token": Deno.env.get("ASAAS_API_KEY")!, "Content-Type": "application/json" },
        });
        if (cancelRes.ok || cancelRes.status === 404) {
          console.log("[checkout] Subscription anterior cancelada com sucesso.");
        } else {
          const errData = await cancelRes.json().catch(() => ({}));
          console.warn("[checkout] Aviso: não foi possível cancelar subscription anterior:", errData?.errors?.[0]?.description);
          // Não bloquear o upgrade por causa disso — continuar criando a nova subscription
        }
      }

      // ── Guarda de duplicidade: mesmo plano, sem upgrade, assinatura já existente ──
      if (subscription?.asaas_subscription_id && subscription?.plan_id === plan_id && !isUpgrade) {
        try {
          const existingPayments = await asaasRequest(`/subscriptions/${subscription.asaas_subscription_id}/payments`);
          const firstExisting = existingPayments?.data?.[0] ?? null;
          if (firstExisting) {
            console.log(`[checkout] pedido duplicado, reaproveitando subscription ${subscription.asaas_subscription_id}`);
            if (asaasBillingType === "PIX") {
              const pixData = await asaasRequest(`/payments/${firstExisting.id}/pixQrCode`);
              return new Response(JSON.stringify({
                type: "pix",
                reused: true,
                pix: {
                  encodedImage: pixData.encodedImage,
                  payload: pixData.payload,
                  expirationDate: pixData.expirationDate,
                },
              }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            if (asaasBillingType === "BOLETO") {
              return new Response(JSON.stringify({
                type: "boleto",
                reused: true,
                boleto: {
                  bankSlipUrl: firstExisting.bankSlipUrl,
                  barCode: firstExisting.barCode ?? null,
                  dueDate: firstExisting.dueDate,
                },
              }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            const reusedUrl = firstExisting.invoiceUrl || `https://www.asaas.com/i/${firstExisting.id}`;
            return new Response(JSON.stringify({ type: "redirect", reused: true, url: reusedUrl }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          console.warn("[checkout] assinatura existente sem pagamentos, seguindo criação normal");
        } catch (dupErr) {
          console.warn("[checkout] falha ao reaproveitar assinatura existente:", dupErr instanceof Error ? dupErr.message : dupErr);
        }
      }


      // Se houver data de renovação do plano atual, usar como nextDueDate do novo (sem cobrança dupla)
      const upgradeDueDate = isUpgrade && subscription?.current_period_end
        ? new Date(subscription.current_period_end).toISOString().split("T")[0]
        : nextDueDateStr(1);
      // ── fim do bloco de upgrade ──────────────────────────────────────────────────

      const sub = await asaasRequest("/subscriptions", "POST", {
        customer: asaasCustomerId,
        billingType: asaasBillingType,
        value,
        nextDueDate: upgradeDueDate,
        cycle,
        description: `Slotimob ${planName} ${isAnnual ? "Anual" : "Mensal"}`,
        externalReference: extRef,
      });

      const { error: subUpdateError } = await supabase
        .from("subscriptions")
        .update({
          asaas_subscription_id: sub.id,
          billing_provider: "asaas",
          asaas_customer_id: asaasCustomerId,
          plan_id: plan_id,
          // Bloqueia o acesso até a Asaas confirmar o pagamento.
          // O webhook (PAYMENT_CONFIRMED / PAYMENT_RECEIVED) libera com status "active".
          status: "pending_payment",
          cancel_at_period_end: false,
        })
        .eq("user_id", userId);


      if (subUpdateError) {
        console.error("[checkout] falha ao salvar assinatura local:", subUpdateError);
      }

      // PIX: buscar QR code inline
      if (asaasBillingType === "PIX") {
        let firstPayment: any = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const paymentsData = await asaasRequest(`/subscriptions/${sub.id}/payments`);
          if (paymentsData?.data?.length > 0) {
            firstPayment = paymentsData.data[0];
            break;
          }
          if (attempt < 4) await new Promise(r => setTimeout(r, 1500));
        }
        if (firstPayment) {
          const pixData = await asaasRequest(`/payments/${firstPayment.id}/pixQrCode`);
          return new Response(JSON.stringify({
            type: "pix",
            pix: {
              encodedImage: pixData.encodedImage,
              payload: pixData.payload,
              expirationDate: pixData.expirationDate,
            },
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // BOLETO: buscar bankSlipUrl inline
      if (asaasBillingType === "BOLETO") {
        let firstPayment: any = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const paymentsData = await asaasRequest(`/subscriptions/${sub.id}/payments`);
          if (paymentsData?.data?.length > 0) {
            firstPayment = paymentsData.data[0];
            break;
          }
          if (attempt < 4) await new Promise(r => setTimeout(r, 1500));
        }
        if (firstPayment) {
          return new Response(JSON.stringify({
            type: "boleto",
            boleto: {
              bankSlipUrl: firstPayment.bankSlipUrl,
              barCode: firstPayment.barCode ?? null,
              dueDate: firstPayment.dueDate,
            },
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // CREDIT_CARD ou fallback:
      // a URL correta é a do PAGAMENTO (/i/{paymentId}), nunca montada com o id da assinatura.
      let invoiceUrl: string | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const paymentsData = await asaasRequest(`/subscriptions/${sub.id}/payments`);
          const firstPayment = paymentsData?.data?.[0];
          if (firstPayment) {
            invoiceUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl || null;
            if (invoiceUrl) break;
          }
        } catch (payErr) {
          console.warn("[checkout] falha ao buscar pagamento da assinatura:", payErr instanceof Error ? payErr.message : payErr);
        }
        if (attempt < 4) await new Promise(r => setTimeout(r, 1500));
      }
      if (!invoiceUrl) invoiceUrl = sub.invoiceUrl ?? null;
      if (!invoiceUrl) {
        return new Response(JSON.stringify({
          error: "A cobrança foi criada, mas o link de pagamento ainda não está disponível. Aguarde alguns segundos e verifique em Configurações › Assinatura.",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ type: "redirect", url: invoiceUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ADDON ────────────────────────────────────────────────────────────
    if (product_type === "addon") {
      if (!addon_id) {
        return new Response(JSON.stringify({ error: "addon_id é obrigatório" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const quantity = Math.max(1, Math.min(Number(body.quantity) || 1, 20));
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return new Response(
          JSON.stringify({ error: "Quantidade de add-on inválida. Mínimo 1, máximo 20." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: addon } = await supabase
        .from("subscription_addons")
        .select("id, name, price")
        .eq("id", addon_id)
        .single();

      if (!addon) {
        return new Response(JSON.stringify({ error: "Add-on não encontrado" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const extRef = `${userId}:addon:${addon_id}:qty${quantity}`;
      const sub = await asaasRequest("/subscriptions", "POST", {
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: Number(addon.price) * quantity,
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
          quantity: quantity,
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
          status: 200,
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
          status: 200,
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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[create-checkout-session]", errMsg, err);
    return new Response(
      JSON.stringify({ error: "Não foi possível processar o pagamento. Tente novamente." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
