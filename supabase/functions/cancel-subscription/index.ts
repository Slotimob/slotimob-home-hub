import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

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
      return new Response(
        JSON.stringify({ error: "Autenticação necessária" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("asaas_subscription_id, status, billing_provider, cancel_at_period_end")
      .eq("user_id", user.id)
      .single();

    if (!subscription?.asaas_subscription_id) {
      return new Response(
        JSON.stringify({ error: "Assinatura Asaas não encontrada." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subscription.billing_provider !== "asaas") {
      return new Response(
        JSON.stringify({ error: "Esta assinatura não é gerenciada pelo Asaas." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subscription.cancel_at_period_end) {
      return new Response(
        JSON.stringify({ error: "Assinatura já está com cancelamento agendado." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ASAAS_API_KEY")!;
    const res = await fetch(`${ASAAS_API_URL}/subscriptions/${subscription.asaas_subscription_id}`, {
      method: "DELETE",
      headers: {
        "access_token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok && res.status !== 404) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.errors?.[0]?.description || `Erro Asaas ${res.status}`;
      console.error("[cancel-subscription] Asaas error:", errMsg);
      return new Response(
        JSON.stringify({ error: `Erro ao cancelar no Asaas: ${errMsg}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("user_id", user.id);

    console.log("[cancel-subscription] Cancelled for user:", user.id, "sub:", subscription.asaas_subscription_id);

    return new Response(
      JSON.stringify({ success: true, message: "Assinatura cancelada. Acesso ativo até o fim do período atual." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Erro interno ao cancelar assinatura";
    console.error("[cancel-subscription]", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
