import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const LOG = "[asaas-platform-webhook]";

const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "Cartão recusado pelo banco. Tente outro cartão ou pague com PIX.",
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: "Pagamento não aprovado na análise de segurança. Tente outro cartão ou pague com PIX.",
  PAYMENT_CREDIT_CARD_THREE_D_SECURE_CHALLENGE_FAILED: "A autenticação do cartão não foi concluída. Tente de novo ou pague com PIX.",
  PAYMENT_AWAITING_RISK_ANALYSIS: "Pagamento em análise de segurança. Avisaremos quando for aprovado.",
};

// Comparação em tempo constante (byte a byte, sem saída antecipada).
function safeEqual(a: string | null, b: string | null): boolean {
  if (a == null || b == null) return false;
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// externalReference format: "{userId}:{type}:{detail...}"
// type pode ser: 'pro', 'business', 'essencial' (plano), 'addon', 'ai_credits'
function parseExternalRef(ref: string | null | undefined) {
  if (!ref) return null;
  const parts = ref.split(":");
  if (parts.length < 2) return null;
  const userId = parts[0];
  const type = parts[1];
  const detail = parts.slice(2).join(":");
  const isYearly = detail.includes("yearly");
  const isEarlyAdopter = detail.includes("ea");
  return { userId, type, detail, isYearly, isEarlyAdopter };
}

// Registra a linha de efeito; retorna true se for nova (efeito deve ser aplicado).
async function claimEffect(supabase: SupabaseClient, eventName: string, paymentId: string, subscriptionId: string | null, effect: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("asaas_webhook_events")
    .upsert(
      { event_id: `${paymentId}:${effect}`, event: eventName, payment_id: paymentId, subscription_id: subscriptionId, effect },
      { onConflict: "event_id", ignoreDuplicates: true },
    )
    .select("event_id");
  if (error) throw new Error(`claimEffect: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

async function releaseEffect(supabase: SupabaseClient, paymentId: string, effect: string) {
  await supabase.from("asaas_webhook_events").delete().eq("event_id", `${paymentId}:${effect}`);
}

// Executa o efeito uma única vez por pagamento; libera a linha se falhar para permitir reenvio.
async function applyOnce(supabase: SupabaseClient, eventName: string, payment: any, effect: string, fn: () => Promise<void>): Promise<boolean> {
  if (!payment?.id) {
    await fn();
    return true;
  }
  const isNew = await claimEffect(supabase, eventName, payment.id, payment.subscription ?? null, effect);
  if (!isNew) {
    console.log(`${LOG} efeito '${effect}' já aplicado para payment=${payment.id}, ignorando.`);
    return false;
  }
  try {
    await fn();
    return true;
  } catch (e) {
    await releaseEffect(supabase, payment.id, effect);
    throw e;
  }
}

function check(error: any, ctx: string) {
  if (error) throw new Error(`${ctx}: ${error.message}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let supabase: SupabaseClient | null = null;
  let claimedEventId: string | null = null;

  try {
    const token = req.headers.get("asaas-access-token");
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (!expectedToken || !safeEqual(token, expectedToken)) {
      console.error(`${LOG} Webhook token inválido`);
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    const { event, payment, subscription } = payload;
    console.log(`${LOG} Asaas webhook: ${event}`, JSON.stringify({ id: payload?.id, externalRef: payment?.externalReference || subscription?.externalReference }));

    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Idempotência por evento
    if (payload?.id) {
      const { data, error } = await supabase
        .from("asaas_webhook_events")
        .upsert(
          {
            event_id: String(payload.id),
            event: String(event ?? "unknown"),
            payment_id: payment?.id ?? null,
            subscription_id: payment?.subscription ?? subscription?.id ?? null,
          },
          { onConflict: "event_id", ignoreDuplicates: true },
        )
        .select("event_id");
      check(error, "registrar evento");
      if (!data || data.length === 0) {
        console.log(`${LOG} evento duplicado ignorado: ${payload.id}`);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      claimedEventId = String(payload.id);
    }

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const parsed = parseExternalRef(payment?.externalReference);
        if (!parsed) {
          console.log(`${LOG} ${event} sem externalReference reconhecível, ignorando.`);
          break;
        }
        const { userId, type, detail, isYearly } = parsed;

        // Créditos de IA: uma vez só por pagamento
        if (type === "ai_credits") {
          const creditsToAdd = parseInt(detail, 10);
          if (isNaN(creditsToAdd) || creditsToAdd <= 0) break;
          await applyOnce(supabase, event, payment, "ai_credits", async () => {
            const { data: sub, error } = await supabase!
              .from("subscriptions")
              .select("id, ai_credits_limit")
              .eq("user_id", userId)
              .maybeSingle();
            check(error, "buscar subscription (ai)");
            if (!sub) {
              console.log(`${LOG} créditos de IA sem assinatura local para user ${userId}`);
              return;
            }
            const { error: upErr } = await supabase!
              .from("subscriptions")
              .update({
                ai_credits_limit: (Number(sub.ai_credits_limit) || 0) + creditsToAdd,
                updated_at: new Date().toISOString(),
              })
              .eq("id", sub.id);
            check(upErr, "creditar IA");
            console.log(`${LOG} IA credits +${creditsToAdd} para user ${userId}`);
          });
          break;
        }

        // Add-on: ativar uma vez por pagamento
        if (type === "addon" && payment?.subscription) {
          await applyOnce(supabase, event, payment, "activate", async () => {
            const { error } = await supabase!
              .from("asaas_addon_subscriptions")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("asaas_subscription_id", payment.subscription);
            check(error, "ativar add-on");
            console.log(`${LOG} Add-on ativado: ${payment.subscription}`);
          });
          break;
        }

        // Plano: ativação/renovação uma vez por pagamento
        if (payment?.subscription) {
          const { data: sub, error } = await supabase
            .from("subscriptions")
            .select("id, user_id, status, current_period_end")
            .eq("asaas_subscription_id", payment.subscription)
            .maybeSingle();
          check(error, "buscar subscription (plano)");
          if (!sub) {
            console.log(`${LOG} pagamento de assinatura órfã, nenhuma linha local: ${payment.subscription}`);
            break;
          }

          await applyOnce(supabase, event, payment, "activate", async () => {
            const now = new Date();
            const months = isYearly ? 12 : 1;
            const currentEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
            const isRenewal = sub.status === "active" && currentEnd && currentEnd > now;
            const start = isRenewal ? currentEnd! : now;
            const end = addMonths(start, months);

            const { error: upErr } = await supabase!.from("subscriptions").update({
              status: "active",
              plan_id: type,
              current_period_start: start.toISOString(),
              current_period_end: end.toISOString(),
              trial_ends_at: null,
              billing_provider: "asaas",
              billing_cycle: isYearly ? "annual" : "monthly",
              cancel_at_period_end: false,
              canceled_at: null,
              last_payment_error: null,
              last_payment_error_at: null,
              updated_at: now.toISOString(),
            }).eq("id", sub.id);
            check(upErr, "ativar plano");
            console.log(`${LOG} Plano ${isRenewal ? "renovado" : "ativado"} para user ${sub.user_id}: plan_id=${type} até ${end.toISOString()}`);
          });
        }
        break;
      }

      case "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED":
      case "PAYMENT_REPROVED_BY_RISK_ANALYSIS":
      case "PAYMENT_CREDIT_CARD_THREE_D_SECURE_CHALLENGE_FAILED":
      case "PAYMENT_AWAITING_RISK_ANALYSIS": {
        const message = PAYMENT_ERROR_MESSAGES[event];
        const parsed = parseExternalRef(payment?.externalReference);
        const nowIso = new Date().toISOString();
        const patch = { last_payment_error: message, last_payment_error_at: nowIso, updated_at: nowIso };

        // Plano: pela assinatura Asaas; add-on/avulso: pela assinatura do usuário
        if (parsed?.type !== "addon" && parsed?.type !== "ai_credits" && payment?.subscription) {
          const { error } = await supabase.from("subscriptions").update(patch).eq("asaas_subscription_id", payment.subscription);
          check(error, "gravar erro de pagamento (plano)");
        } else if (parsed?.userId) {
          const { error } = await supabase.from("subscriptions").update(patch).eq("user_id", parsed.userId);
          check(error, "gravar erro de pagamento (add-on)");
        } else {
          console.log(`${LOG} ${event} sem referência reconhecível, ignorando.`);
          break;
        }
        console.log(`${LOG} ${event} registrado: payment=${payment?.id}`);
        break;
      }

      case "PAYMENT_OVERDUE": {
        const parsed = parseExternalRef(payment?.externalReference);

        if (parsed?.type === "addon" && payment?.subscription) {
          const { error } = await supabase
            .from("asaas_addon_subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("asaas_subscription_id", payment.subscription);
          check(error, "add-on past_due");
          break;
        }

        if (payment?.subscription) {
          const { error } = await supabase.from("subscriptions").update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          }).eq("asaas_subscription_id", payment.subscription);
          check(error, "plano past_due");
        }
        break;
      }

      case "SUBSCRIPTION_INACTIVATED":
      case "SUBSCRIPTION_DELETED": {
        if (!subscription?.id) break;
        const parsed = parseExternalRef(subscription.externalReference);

        if (parsed?.type === "addon") {
          const { error } = await supabase
            .from("asaas_addon_subscriptions")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("asaas_subscription_id", subscription.id);
          check(error, "cancelar add-on");
          console.log(`${LOG} Add-on cancelado: ${subscription.id}`);
          break;
        }

        const { data: planRow, error } = await supabase
          .from("subscriptions")
          .select("id, user_id, cancel_at_period_end, current_period_end")
          .eq("asaas_subscription_id", subscription.id)
          .maybeSingle();
        check(error, "buscar plano removido");

        if (!planRow) {
          console.log(`${LOG} assinatura órfã removida, nenhuma linha local: ${subscription.id}`);
          break;
        }

        const periodEnd = planRow.current_period_end ? new Date(planRow.current_period_end) : null;
        if (planRow.cancel_at_period_end === true && periodEnd && periodEnd > new Date()) {
          console.log(`${LOG} cancelamento agendado, acesso mantido até ${planRow.current_period_end}`);
          break;
        }

        const { error: upErr } = await supabase.from("subscriptions").update({
          plan_id: "start",
          status: "active",
          asaas_subscription_id: null,
          cancel_at_period_end: false,
          billing_cycle: null,
          current_period_start: null,
          current_period_end: null,
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        }).eq("id", planRow.id);
        check(upErr, "downgrade start");

        console.log(`${LOG} Assinatura removida → downgrade para start ativo: ${subscription.id}`);
        break;
      }

      case "PAYMENT_DELETED": {
        console.log(`${LOG} cobrança removida: payment=${payment?.id} subscription=${payment?.subscription}`);
        break;
      }

      case "PAYMENT_REFUNDED": {
        if (!payment?.subscription) break;
        const { data: planRow, error } = await supabase
          .from("subscriptions")
          .select("id, user_id")
          .eq("asaas_subscription_id", payment.subscription)
          .maybeSingle();
        check(error, "buscar plano estornado");

        if (!planRow) {
          console.log(`${LOG} estorno de assinatura órfã, nenhuma linha local: ${payment.subscription}`);
          break;
        }

        const { error: upErr } = await supabase.from("subscriptions").update({
          plan_id: "start",
          status: "active",
          asaas_subscription_id: null,
          cancel_at_period_end: false,
          billing_cycle: null,
          current_period_start: null,
          current_period_end: null,
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        }).eq("id", planRow.id);
        check(upErr, "downgrade estorno");

        await supabase.from("audit_logs").insert({
          broker_id: planRow.user_id,
          action: "subscription_refunded_downgrade",
          table_name: "subscriptions",
          record_id: planRow.id,
          metadata: { payment_id: payment.id, value: payment.value },
        });

        console.log(`${LOG} Estorno → downgrade para start ativo: ${payment.subscription}`);
        break;
      }

      case "SUBSCRIPTION_UPDATED": {
        console.log(`${LOG} Assinatura atualizada: ${subscription?.id}`);
        break;
      }

      case "ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED": {
        console.log(`${LOG} Subconta aprovada`);
        break;
      }

      default:
        console.log(`${LOG} Evento não tratado: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`${LOG} Erro no webhook Asaas:`, error);
    // Libera o evento para que o reenvio do Asaas seja processado.
    if (supabase && claimedEventId) {
      try {
        await supabase.from("asaas_webhook_events").delete().eq("event_id", claimedEventId);
      } catch (_) { /* ignore */ }
    }
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
