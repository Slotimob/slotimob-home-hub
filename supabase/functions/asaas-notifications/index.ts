// Delegação da régua de cobrança para as notificações padrão da Asaas.
// Usa SEMPRE a chave da subconta do broker (nunca a ASAAS_API_KEY master).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_H = { ...corsHeaders, "Content-Type": "application/json" };
const ASAAS = "https://api.asaas.com/v3";

function resp(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_H });
}

interface AsaasNotification {
  id: string;
  event: string;
  scheduleOffset: number;
  emailEnabledForCustomer?: boolean;
  smsEnabledForCustomer?: boolean;
  phoneCallEnabledForCustomer?: boolean;
  whatsappEnabledForCustomer?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return resp({ error: "Não autorizado" });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return resp({ error: "Token inválido" });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return resp({ error: "JSON inválido" });
    }

    const action = String(body?.action ?? "");
    if (action !== "get" && action !== "sync") {
      return resp({ error: "action deve ser 'get' ou 'sync'" });
    }

    // Broker efetivo: membros operam sob a conta do proprietário.
    let brokerId = user.id;
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_owner_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (membership?.organization_owner_id) brokerId = membership.organization_owner_id as string;

    // Resolve o customerId da Asaas (sempre escopado ao broker).
    let customerId: string | null = body?.customerId ? String(body.customerId) : null;
    if (!customerId && body?.contactId) {
      const { data: customer } = await supabase
        .from("asaas_customers")
        .select("asaas_customer_id")
        .eq("broker_id", brokerId)
        .eq("contact_id", String(body.contactId))
        .maybeSingle();
      customerId = (customer?.asaas_customer_id as string) ?? null;
    } else if (customerId) {
      const { data: owned } = await supabase
        .from("asaas_customers")
        .select("id")
        .eq("broker_id", brokerId)
        .eq("asaas_customer_id", customerId)
        .maybeSingle();
      if (!owned) return resp({ error: "Cliente Asaas não pertence a esta conta." });
    }
    if (!customerId) return resp({ error: "Cliente Asaas não encontrado para este contato." });

    // Chave da SUBCONTA do broker.
    const { data: account } = await supabase
      .from("asaas_accounts")
      .select("asaas_api_key_encrypted, status")
      .eq("broker_id", brokerId)
      .eq("status", "active")
      .maybeSingle();

    if (!account?.asaas_api_key_encrypted) {
      return resp({ error: "Subconta Asaas não configurada. Acesse Configurações > Integração Asaas para ativar." });
    }

    const { data: decrypted, error: decryptErr } = await supabase.rpc("decrypt_asaas_api_key", {
      p_encrypted: account.asaas_api_key_encrypted,
    });
    if (decryptErr || !decrypted) {
      console.error("[asaas-notifications] erro ao descriptografar chave:", decryptErr?.message);
      return resp({ error: "Erro ao acessar a chave da subconta Asaas." });
    }
    const subKey = decrypted as string;
    const asaasHeaders = { "Content-Type": "application/json", access_token: subKey };

    // Lista das notificações padrão do cliente.
    const listRes = await fetch(`${ASAAS}/customers/${customerId}/notifications`, { headers: asaasHeaders });
    const listBody = await listRes.json().catch(() => ({}));
    if (!listRes.ok) {
      console.error("[asaas-notifications] falha ao listar:", listRes.status, JSON.stringify(listBody));
      return resp({ error: "Não foi possível consultar as notificações na Asaas.", details: listBody });
    }

    const notifications: AsaasNotification[] = (listBody as any)?.data ?? [];

    if (action === "get") {
      return resp({ success: true, customerId, notifications });
    }

    // ── sync ────────────────────────────────────────────────────────────────
    let automation: Record<string, any> | null = body?.automation ?? null;
    let leaseId: string | null = body?.leaseId ? String(body.leaseId) : null;
    if (!automation && leaseId) {
      const { data: lease } = await supabase
        .from("leases")
        .select("billing_automation")
        .eq("id", leaseId)
        .eq("broker_id", brokerId)
        .maybeSingle();
      automation = (lease?.billing_automation as Record<string, any>) ?? null;
    }
    if (!automation) return resp({ error: "Envie 'automation' ou 'leaseId' para sincronizar a régua." });

    const channels = (automation.channels ?? {}) as Record<string, boolean>;
    const emailOn = channels.email === true;
    const whatsappOn = channels.whatsapp === true;

    // Mapeamento régua Slotimob → notificações padrão da Asaas.
    const plan: { flag: string; event: string; matchOffset: number; targetOffset: number; logOffset: number }[] = [
      { flag: "reminder_5_days", event: "PAYMENT_DUEDATE_WARNING", matchOffset: 10, targetOffset: 5, logOffset: -5 },
      { flag: "reminder_due_day", event: "PAYMENT_DUEDATE_WARNING", matchOffset: 0, targetOffset: 0, logOffset: 0 },
      { flag: "reminder_7_days_late", event: "PAYMENT_OVERDUE", matchOffset: 7, targetOffset: 7, logOffset: 7 },
    ];

    const unsupported: string[] = [];
    // A Asaas só possui PAYMENT_OVERDUE com offset 0 e 7 e não permite criar notificações.
    if (automation.reminder_3_days_late === true) unsupported.push("reminder_3_days_late");

    const updated: Record<string, unknown>[] = [];
    const errors: Record<string, unknown>[] = [];
    const logs: Record<string, unknown>[] = [];

    for (const step of plan) {
      const enabled = automation[step.flag] === true;
      const target =
        notifications.find((n) => n.event === step.event && n.scheduleOffset === step.targetOffset) ??
        notifications.find((n) => n.event === step.event && n.scheduleOffset === step.matchOffset);

      if (!target) {
        errors.push({ flag: step.flag, error: `Notificação ${step.event} não encontrada na Asaas.` });
        continue;
      }

      const payload = {
        enabled,
        scheduleOffset: step.targetOffset,
        emailEnabledForCustomer: enabled && emailOn,
        whatsappEnabledForCustomer: enabled && whatsappOn,
      };

      try {
        const putRes = await fetch(`${ASAAS}/notifications/${target.id}`, {
          method: "PUT",
          headers: asaasHeaders,
          body: JSON.stringify(payload),
        });
        const putBody = await putRes.json().catch(() => ({}));
        if (!putRes.ok) {
          console.error("[asaas-notifications] falha no PUT:", putRes.status, JSON.stringify(putBody));
          errors.push({ flag: step.flag, status: putRes.status, details: putBody });
          continue;
        }

        updated.push({ flag: step.flag, notificationId: target.id, scheduleOffset: step.targetOffset, enabled });
        logs.push({
          broker_id: brokerId,
          lease_id: leaseId,
          channel: "asaas",
          schedule_offset: step.logOffset,
          status: "sent",
          recipient: customerId,
          provider_id: target.id,
          metadata: { event: step.event, enabled, email: payload.emailEnabledForCustomer, whatsapp: payload.whatsappEnabledForCustomer },
        });
      } catch (err) {
        console.error("[asaas-notifications] erro ao atualizar notificação:", String(err));
        errors.push({ flag: step.flag, error: String(err).slice(0, 500) });
      }
    }

    if (logs.length > 0) {
      const { error: logError } = await supabase.from("billing_reminder_logs").insert(logs);
      if (logError) console.error("[asaas-notifications] erro ao gravar logs:", logError.message);
    }

    return resp({ success: true, customerId, updated, unsupported, errors });
  } catch (err) {
    console.error("[asaas-notifications] erro inesperado:", String(err));
    return resp({ error: "Erro interno ao sincronizar notificações." });
  }
});
