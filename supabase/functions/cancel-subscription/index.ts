import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";
const LOG = "[cancel-subscription]";
const PAID_PLANS = ["essencial", "pro", "business"];
const VALID_REASONS = [
  "caro",
  "pouco_uso",
  "falta_funcionalidade",
  "outra_ferramenta",
  "problema_tecnico",
  "outro",
];

function json(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

async function asaasDelete(apiKey: string, id: string): Promise<boolean> {
  const res = await fetch(`${ASAAS_API_URL}/subscriptions/${id}`, {
    method: "DELETE",
    headers: { access_token: apiKey, "Content-Type": "application/json" },
  });
  if (res.ok || res.status === 404) return true;
  const body = await res.text().catch(() => "");
  console.error(`${LOG} Asaas DELETE ${id} falhou`, res.status, body);
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Autenticação necessária" });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Sessão inválida" });

    // Convidado não cancela
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) {
      return json({ error: "Apenas o proprietário da conta pode cancelar a assinatura." });
    }

    // Body opcional
    let reason: string | null = null;
    let feedback: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        if (typeof body.reason === "string" && VALID_REASONS.includes(body.reason)) {
          reason = body.reason;
        }
        if (typeof body.feedback === "string") {
          const t = body.feedback.trim().slice(0, 500);
          feedback = t.length > 0 ? t : null;
        }
      }
    } catch (_) {
      // sem body
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(
        "id, plan_id, status, billing_provider, asaas_customer_id, asaas_subscription_id, current_period_end, cancel_at_period_end, billing_cycle",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subscription) {
      return json({ error: "Não encontramos uma assinatura ativa para cancelar." });
    }

    if (subscription.cancel_at_period_end === true) {
      return json({
        error: "Sua assinatura já está cancelada. O acesso continua até o fim do período pago.",
      });
    }

    const paidPlan = PAID_PLANS.includes(subscription.plan_id);
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null;
    const periodInFuture = !!periodEnd && periodEnd.getTime() > Date.now();
    const hasPaidPeriod = subscription.status === "active" && paidPlan && periodInFuture;

    if (
      !subscription.asaas_subscription_id &&
      !["pending_payment", "past_due"].includes(subscription.status) &&
      !hasPaidPeriod
    ) {
      return json({ error: "Não encontramos uma assinatura ativa para cancelar." });
    }

    const apiKey = Deno.env.get("ASAAS_API_KEY")!;
    const nowIso = new Date().toISOString();

    // --- Remoção na Asaas (assinatura principal + órfãs + add-ons) ---
    const removeOnAsaas = async (): Promise<boolean> => {
      let mainOk = true;
      if (subscription.asaas_subscription_id) {
        mainOk = await asaasDelete(apiKey, subscription.asaas_subscription_id);
      }

      // Órfãs do mesmo customer
      if (subscription.asaas_customer_id) {
        try {
          const res = await fetch(
            `${ASAAS_API_URL}/subscriptions?customer=${subscription.asaas_customer_id}&status=ACTIVE&limit=100`,
            { headers: { access_token: apiKey, "Content-Type": "application/json" } },
          );
          if (res.ok) {
            const list = await res.json();
            for (const sub of list?.data ?? []) {
              const ref: string = sub?.externalReference ?? "";
              if (!ref.startsWith(`${user.id}:`) || ref.includes(":addon:")) continue;
              if (sub.id === subscription.asaas_subscription_id) continue;
              await asaasDelete(apiKey, sub.id);
            }
          } else {
            console.error(`${LOG} varredura de órfãs falhou`, res.status);
          }
        } catch (e) {
          console.error(`${LOG} erro na varredura de órfãs`, e);
        }
      }

      // Add-ons
      try {
        const { data: addons } = await supabase
          .from("asaas_addon_subscriptions")
          .select("id, asaas_subscription_id")
          .eq("broker_id", user.id)
          .in("status", ["active", "pending", "past_due"]);

        for (const addon of addons ?? []) {
          if (addon.asaas_subscription_id) {
            await asaasDelete(apiKey, addon.asaas_subscription_id);
          }
          await supabase
            .from("asaas_addon_subscriptions")
            .update({ status: "canceled" })
            .eq("id", addon.id);
        }
      } catch (e) {
        console.error(`${LOG} erro ao cancelar add-ons`, e);
      }

      return mainOk;
    };

    let immediate: boolean;
    let accessUntil: string | null = null;

    if (hasPaidPeriod) {
      // Caminho A: agenda cancelamento ANTES do DELETE (webhook precisa ver)
      const { error: updErr } = await supabase
        .from("subscriptions")
        .update({
          cancel_at_period_end: true,
          canceled_at: nowIso,
          cancel_reason: reason,
          cancel_feedback: feedback,
        })
        .eq("user_id", user.id);

      if (updErr) {
        console.error(`${LOG} falha ao agendar cancelamento`, updErr);
        return json({ error: "Não foi possível cancelar agora. Tente novamente em instantes." });
      }

      const ok = await removeOnAsaas();
      if (!ok) {
        await supabase
          .from("subscriptions")
          .update({ cancel_at_period_end: false, canceled_at: null })
          .eq("user_id", user.id);
        return json({ error: "Não foi possível cancelar agora. Tente novamente em instantes." });
      }

      immediate = false;
      accessUntil = subscription.current_period_end;
    } else {
      // Caminho B: rebaixa para Start ativo antes do DELETE
      const { error: updErr } = await supabase
        .from("subscriptions")
        .update({
          plan_id: "start",
          status: "active",
          asaas_subscription_id: null,
          cancel_at_period_end: false,
          billing_cycle: null,
          current_period_start: null,
          current_period_end: null,
          canceled_at: nowIso,
          cancel_reason: reason,
          cancel_feedback: feedback,
        })
        .eq("user_id", user.id);

      if (updErr) {
        console.error(`${LOG} falha ao rebaixar para Start`, updErr);
        return json({ error: "Não foi possível cancelar agora. Tente novamente em instantes." });
      }

      const ok = await removeOnAsaas();
      if (!ok) {
        return json({ error: "Não foi possível cancelar agora. Tente novamente em instantes." });
      }

      immediate = true;
      accessUntil = null;
    }

    const d = new Date();
    const protocol = `CANC-${String(subscription.id).slice(0, 8).toUpperCase()}-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

    try {
      await supabase.from("audit_logs").insert({
        broker_id: user.id,
        action: "subscription_cancel_requested",
        table_name: "subscriptions",
        record_id: subscription.id,
        old_data: { plan_id: subscription.plan_id, status: subscription.status },
        new_data: { immediate, access_until: accessUntil },
        metadata: { reason, protocol },
      });
    } catch (e) {
      console.error(`${LOG} falha ao gravar audit_log`, e);
    }

    // E-mail de comprovante (não bloqueante)
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey && user.email) {
        const accessLine = immediate
          ? "Sua conta voltou ao plano <strong>Start (gratuito)</strong>."
          : `Você mantém o acesso até <strong>${
            accessUntil
              ? `${pad(new Date(accessUntil).getDate())}/${pad(new Date(accessUntil).getMonth() + 1)}/${new Date(accessUntil).getFullYear()}`
              : "-"
          }</strong>.`;

        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6">
            <h2 style="color:#0B0073">Cancelamento confirmado</h2>
            <p>Protocolo: <strong>${protocol}</strong></p>
            <p>Plano cancelado: <strong>${subscription.plan_id}</strong></p>
            <p>${accessLine}</p>
            <p>Nenhuma nova cobrança será feita.</p>
            <p>Seus dados continuam salvos.</p>
            <p>Para reativar, acesse <strong>Configurações › Assinatura</strong>.</p>
            <p style="margin-top:24px;color:#6b7280;font-size:12px">Equipe SlotiMob</p>
          </div>`;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Equipe SlotiMob <contato@slotimob.com.br>",
            to: [user.email],
            subject: "Cancelamento da sua assinatura Slotimob",
            html,
          }),
        });
        if (!res.ok) {
          console.error(`${LOG} falha ao enviar e-mail`, res.status, await res.text().catch(() => ""));
        }
      }
    } catch (e) {
      console.error(`${LOG} erro no envio do e-mail`, e);
    }

    console.log(`${LOG} cancelado`, { user: user.id, immediate, protocol });

    return json({ success: true, immediate, access_until: accessUntil, protocol });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Erro interno ao cancelar assinatura";
    console.error(`${LOG} erro inesperado`, errMsg);
    return json({ error: errMsg });
  }
});
