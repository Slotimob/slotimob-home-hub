import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") ?? "https://www.asaas.com/api/v3";

// actions suportadas: get_slip_url | send_email | cancel | update_due_date | update_value
function resp(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return resp({ error: "Sem Authorization header" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return resp({ error: "Usuário não autenticado" });

    const body = await req.json();
    const { payment_id, action } = body;
    if (!payment_id || !action) return resp({ error: "payment_id e action são obrigatórios" });

    // Resolve effective broker: members act under the owner's subaccount + require permission.
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
      const required: Record<string, "view" | "create" | "edit" | "delete"> = {
        get_slip_url: "view",
        send_email: "edit",
        cancel: "delete",
        update_due_date: "edit",
        update_value: "edit",
      };
      const need = required[action];
      if (need && boletos[need] !== true) {
        const label =
          need === "view" ? "consultar a cobrança" :
          need === "edit" ? "atualizar a cobrança" :
          need === "delete" ? "cancelar a cobrança" :
          "executar esta ação";
        return resp({ error: `Você não tem permissão para ${label}. Fale com o administrador da sua conta.` });
      }
    }

    // Buscar payment e verificar que pertence ao broker efetivo via lease
    const { data: payment, error: payErr } = await supabase
      .from("asaas_payments")
      .select("id, asaas_payment_id, lease_id, status, bank_slip_url")
      .eq("id", payment_id)
      .single();
    if (payErr || !payment) return resp({ error: "Pagamento não encontrado" });

    const { data: lease, error: leaseErr } = await supabase
      .from("leases")
      .select("broker_id")
      .eq("id", payment.lease_id)
      .single();
    if (leaseErr || !lease || lease.broker_id !== effectiveBrokerId) {
      return resp({ error: "Sem permissão para este pagamento" });
    }

    // Buscar API key cifrada do broker efetivo (dono da subconta) e decriptar
    const { data: asaasAccount, error: asaasErr } = await supabase
      .from("asaas_accounts")
      .select("asaas_api_key_encrypted")
      .eq("broker_id", effectiveBrokerId)
      .eq("status", "active")
      .single();
    if (asaasErr || !asaasAccount) return resp({ error: "Conta Asaas não encontrada" });

    const { data: decryptedKey, error: decryptErr } = await supabase.rpc("decrypt_asaas_api_key", { p_encrypted: asaasAccount.asaas_api_key_encrypted });
    if (decryptErr || !decryptedKey) {
      console.error("[asaas-payment-action] Decrypt error:", decryptErr);
      return resp({ error: "Erro ao acessar a chave da subconta Asaas" });
    }

    const apiKey = decryptedKey as string;
    const asaasId = payment.asaas_payment_id;
    if (!asaasId) return resp({ error: "Pagamento não tem ID Asaas associado" });

    if (action === "get_slip_url") {
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${asaasId}`, {
        headers: { "access_token": apiKey },
      });
      const data = await res.json();
      if (data.bankSlipUrl) {
        await supabase.from("asaas_payments")
          .update({ bank_slip_url: data.bankSlipUrl, updated_at: new Date().toISOString() })
          .eq("id", payment_id);
      }
      return new Response(
        JSON.stringify({ success: true, bank_slip_url: data.bankSlipUrl || payment.bank_slip_url, status: data.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send_email") {
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${asaasId}/resend`, {
        method: "POST",
        headers: { "access_token": apiKey, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.status >= 400) throw new Error(`Asaas retornou ${res.status}: ${JSON.stringify(data)}`);
      return new Response(
        JSON.stringify({ success: true, result: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cancel") {
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${asaasId}`, {
        method: "DELETE",
        headers: { "access_token": apiKey },
      });
      if (res.status !== 200 && res.status !== 204) {
        let errData: unknown;
        try { errData = await res.json(); } catch { errData = res.statusText; }
        throw new Error(`Erro ao cancelar no Asaas: ${JSON.stringify(errData)}`);
      }
      await supabase.from("asaas_payments")
        .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
        .eq("id", payment_id);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_due_date") {
      const { new_due_date } = body;
      if (!new_due_date) throw new Error("new_due_date é obrigatório");
      // Asaas espera dueDate no formato YYYY-MM-DD
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${asaasId}`, {
        method: "POST",
        headers: { "access_token": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: new_due_date }),
      });
      const data = await res.json();
      if (res.status >= 400) throw new Error(`Asaas retornou ${res.status}: ${JSON.stringify(data)}`);
      // Atualizar due_date local na tabela asaas_payments se existir a coluna
      await supabase.from("asaas_payments")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", payment_id);
      return new Response(
        JSON.stringify({ success: true, result: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_value") {
      const { new_value } = body;
      if (!new_value || isNaN(Number(new_value))) throw new Error("new_value inválido");
      const res = await fetch(`${ASAAS_BASE_URL}/payments/${asaasId}`, {
        method: "POST",
        headers: { "access_token": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ value: Number(new_value) }),
      });
      const data = await res.json();
      if (res.status >= 400) throw new Error(`Asaas retornou ${res.status}: ${JSON.stringify(data)}`);
      await supabase.from("asaas_payments")
        .update({ value: Number(new_value), updated_at: new Date().toISOString() })
        .eq("id", payment_id);
      return new Response(
        JSON.stringify({ success: true, result: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`action desconhecida: ${action}`);

  } catch (error) {
    console.error("Erro em asaas-payment-action:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
