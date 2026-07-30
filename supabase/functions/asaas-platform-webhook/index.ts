import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = req.headers.get("asaas-access-token");
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (!expectedToken || token !== expectedToken) {
      console.error("Webhook token inválido");
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = await req.json();
    const { event, payment, subscription } = payload;
    console.log(`Asaas webhook: ${event}`, JSON.stringify({ externalRef: payment?.externalReference || subscription?.externalReference }));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const extRef = payment?.externalReference;
        const parsed = parseExternalRef(extRef);

        if (!parsed) {
          console.log("PAYMENT_CONFIRMED sem externalReference reconhecível, ignorando.");
          break;
        }

        const { userId, type, detail, isYearly } = parsed;

        // AI Credits: pagamento avulso → creditar ai_credits_limit
        if (type === "ai_credits") {
          const creditsToAdd = parseInt(detail, 10);
          if (!isNaN(creditsToAdd) && creditsToAdd > 0) {
            const { data: sub } = await supabase
              .from("subscriptions")
              .select("id, ai_credits_limit")
              .eq("user_id", userId)
              .single();
            if (sub) {
              await supabase
                .from("subscriptions")
                .update({
                  ai_credits_limit: (Number(sub.ai_credits_limit) || 0) + creditsToAdd,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", sub.id);
              console.log(`IA credits +${creditsToAdd} para user ${userId}`);
            }
          }
          break;
        }

        // Add-on: ativar na tabela asaas_addon_subscriptions
        if (type === "addon" && payment?.subscription) {
          await supabase
            .from("asaas_addon_subscriptions")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("asaas_subscription_id", payment.subscription);
          console.log(`Add-on ativado: ${payment.subscription}`);
          break;
        }

        // Plano: ativar subscription com período correto
        if (payment?.subscription) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, user_id")
            .eq("asaas_subscription_id", payment.subscription)
            .single();

          if (sub) {
            const now = new Date();
            const periodEnd = isYearly ? addMonths(now, 12) : addMonths(now, 1);

            await supabase.from("subscriptions").update({
              status: "active",
              plan_id: type,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              trial_ends_at: null,
              billing_provider: "asaas",
              updated_at: now.toISOString(),
            }).eq("id", sub.id);

            console.log(`Plano ativado para user ${sub.user_id}: plan_id=${type} (${isYearly ? "+12 meses" : "+1 mês"})`);
          }
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        const extRef = payment?.externalReference;
        const parsed = parseExternalRef(extRef);

        if (parsed?.type === "addon" && payment?.subscription) {
          await supabase
            .from("asaas_addon_subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("asaas_subscription_id", payment.subscription);
          break;
        }

        if (payment?.subscription) {
          await supabase.from("subscriptions").update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          }).eq("asaas_subscription_id", payment.subscription);
        }
        break;
      }

      case "SUBSCRIPTION_INACTIVATED":
      case "SUBSCRIPTION_DELETED": {
        if (!subscription?.id) break;
        const parsed = parseExternalRef(subscription.externalReference);

        if (parsed?.type === "addon") {
          await supabase
            .from("asaas_addon_subscriptions")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("asaas_subscription_id", subscription.id);
          console.log(`Add-on cancelado: ${subscription.id}`);
          break;
        }

        // Plano cancelado → downgrade para start
        await supabase.from("subscriptions").update({
          status: "canceled",
          plan_id: "start",
          cancel_at_period_end: false,
          asaas_subscription_id: null,
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        }).eq("asaas_subscription_id", subscription.id);

        console.log(`Assinatura cancelada → downgrade para start: ${subscription.id}`);
        break;
      }

      case "SUBSCRIPTION_UPDATED": {
        console.log(`Assinatura atualizada: ${subscription?.id}`);
        break;
      }

      case "ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED": {
        console.log("Subconta aprovada:", payload);
        break;
      }

      default:
        console.log(`Evento não tratado: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro no webhook Asaas:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
