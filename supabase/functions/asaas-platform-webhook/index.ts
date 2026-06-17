import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

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

    console.log(`Asaas webhook recebido: ${event}`, JSON.stringify(payload, null, 2));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        if (payment?.subscription) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, user_id, plan_id")
            .eq("asaas_subscription_id", payment.subscription)
            .single();

          if (sub) {
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            await supabase.from("subscriptions").update({
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", sub.id);

            console.log(`Plano ativado para user ${sub.user_id}`);
          }
        }

        if (payment?.id) {
          await supabase.from("asaas_payments")
            .update({ status: payment.status, updated_at: new Date().toISOString() })
            .eq("asaas_payment_id", payment.id);
        }

        break;
      }

      case "PAYMENT_OVERDUE": {
        if (payment?.subscription) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, user_id")
            .eq("asaas_subscription_id", payment.subscription)
            .single();

          if (sub) {
            await supabase.from("subscriptions").update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            }).eq("id", sub.id);
          }
        }

        if (payment?.id) {
          await supabase.from("asaas_payments")
            .update({ status: "OVERDUE", updated_at: new Date().toISOString() })
            .eq("asaas_payment_id", payment.id);
        }

        break;
      }

      case "SUBSCRIPTION_INACTIVATED":
      case "SUBSCRIPTION_DELETED": {
        if (!subscription?.id) break;

        await supabase.from("subscriptions").update({
          status: "canceled",
          plan_id: "start",
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }).eq("asaas_subscription_id", subscription.id);

        console.log(`Assinatura cancelada/inativada: ${subscription.id}`);
        break;
      }

      case "SUBSCRIPTION_UPDATED": {
        if (!subscription?.id) break;
        console.log(`Assinatura atualizada: ${subscription.id}`);
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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
