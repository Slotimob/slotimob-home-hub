// Motor da régua de cobrança (somente e-mail). Chamado por cron (x-cron-secret).
// IMPORTANTE: esta função NÃO chama a edge function `send-email` — o Resend é
// usado diretamente aqui, porque `send-email` só permite enviar ao próprio usuário.
// Não há envio automático por WhatsApp (Evolution API não é oficial): o WhatsApp
// é apenas atalho manual na interface.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const JSON_H = { ...corsHeaders, "Content-Type": "application/json" };

const MAX_REMINDERS = 500;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://app.slotimob.com.br";
const LOGO_URL = `${SITE_URL}/sloti-logo.png`;

const BRAND = {
  primary: "#170075",
  accent: "#2db88a",
  mutedFg: "#6b6e99",
  bg: "#ffffff",
  mutedBg: "#f4f4f9",
  radius: "8px",
};

function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(url: string | undefined | null): string | null {
  const candidate = String(url ?? "").trim();
  return /^https:\/\//i.test(candidate) ? candidate : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

/** Data de hoje em America/Sao_Paulo no formato yyyy-MM-dd. */
function todayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA => yyyy-MM-dd
}

/** dueDate (yyyy-MM-dd) + offset dias, como yyyy-MM-dd. */
function shiftDate(dueDate: string, offsetDays: number): string {
  const d = new Date(`${dueDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function emailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});padding:32px 24px;text-align:center;">
<img src="${LOGO_URL}" alt="SlotiMob" width="160" style="display:block;margin:0 auto;" />
</td></tr>
<tr><td style="padding:32px 28px;background:${BRAND.bg};color:#333;font-size:16px;line-height:1.7;">
${bodyHtml}
</td></tr>
<tr><td style="padding:20px 28px;background:${BRAND.mutedBg};text-align:center;font-size:12px;color:${BRAND.mutedFg};">
<p style="margin:0;">© ${new Date().getFullYear()} SlotiMob — O futuro da gestão imobiliária</p>
<p style="margin:4px 0 0;">Dúvidas sobre esta cobrança? Basta responder este e-mail.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function offsetCopy(offset: number): { title: string; intro: string; subject: string } {
  if (offset < 0) {
    return {
      subject: `Lembrete: sua cobrança vence em ${Math.abs(offset)} dia(s)`,
      title: "Lembrete de vencimento",
      intro: `Este é um lembrete amigável: sua cobrança vence em <strong>${Math.abs(offset)} dia(s)</strong>.`,
    };
  }
  if (offset === 0) {
    return {
      subject: "Sua cobrança vence hoje",
      title: "Vencimento hoje",
      intro: "Sua cobrança <strong>vence hoje</strong>.",
    };
  }
  return {
    subject: `Cobrança em aberto há ${offset} dia(s)`,
    title: "Cobrança em aberto",
    intro: `Identificamos que esta cobrança está em aberto há <strong>${offset} dia(s)</strong>.`,
  };
}

/** Offsets habilitados no formato novo: steps: { "-3": true, "0": true, ... } → [-3, 0, ...] */
function enabledOffsetsFromSteps(steps: unknown): number[] {
  if (!steps || typeof steps !== "object") return [];
  const out: number[] = [];
  for (const [key, value] of Object.entries(steps as Record<string, unknown>)) {
    if (value !== true) continue;
    const offset = Number(key);
    if (Number.isFinite(offset)) out.push(offset);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Autenticação server-to-server (mesmo padrão de expire-trials / audit-logs-retention)
  const cronSecret = req.headers.get("x-cron-secret");
  const { data: isValidCron, error: cronCheckError } = await supabase.rpc("verify_cron_secret", {
    p_secret: cronSecret,
  });
  if (cronCheckError || !isValidCron) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: JSON_H });
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendKey ? new Resend(resendKey) : null;

    const today = todayInSaoPaulo();

    const { data: leases, error: leasesError } = await supabase
      .from("leases")
      .select("id, broker_id, billing_automation, status, tenant_contact_id")
      .eq("status", "active")
      .filter("billing_automation->>enabled", "eq", "true");

    if (leasesError) {
      console.error("[billing-reminders] erro ao buscar contratos:", leasesError.message);
      return new Response(JSON.stringify({ error: leasesError.message }), { status: 200, headers: JSON_H });
    }

    const brokerCache = new Map<string, { name: string; email: string | null }>();
    const logs: Record<string, unknown>[] = [];
    let budget = MAX_REMINDERS;

    for (const lease of leases ?? []) {
      if (budget <= 0) break;
      try {
        const automation = (lease.billing_automation ?? {}) as Record<string, any>;
        const enabledOffsets = enabledOffsetsFromSteps(automation.steps);
        if (enabledOffsets.length === 0) continue;

        // Destinatário alternativo configurado na régua; nulo = e-mail do inquilino
        const overrideTo =
          typeof automation.email_to === "string" && EMAIL_RE.test(automation.email_to)
            ? (automation.email_to as string)
            : null;

        const brokerId = lease.broker_id as string;

        const { data: transactions, error: txError } = await supabase
          .from("financial_transactions")
          .select("id, description, amount, due_date, status, contact_id, broker_id")
          .eq("broker_id", brokerId)
          .eq("reference", `lease:${lease.id}`)
          .eq("status", "pending")
          .eq("type", "income");

        if (txError) {
          console.error(`[billing-reminders] erro nas transações do contrato ${lease.id}:`, txError.message);
          continue;
        }

        // Dados do corretor (cache por broker)
        if (!brokerCache.has(brokerId)) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", brokerId)
            .maybeSingle();
          brokerCache.set(brokerId, {
            name: (profile?.full_name as string) || "Sua imobiliária",
            email: (profile?.email as string) ?? null,
          });
        }
        const broker = brokerCache.get(brokerId)!;

        for (const tx of transactions ?? []) {
          if (budget <= 0) break;
          try {
            if (!tx.due_date) continue;
            const dueOffsets = enabledOffsets.filter((o) => shiftDate(tx.due_date as string, o) === today);
            if (dueOffsets.length === 0) continue;

            let tenantName = "Cliente";
            let tenantEmail: string | null = null;
            if (!overrideTo && tx.contact_id) {
              const { data: contact } = await supabase
                .from("contacts")
                .select("name, email")
                .eq("id", tx.contact_id)
                .eq("broker_id", brokerId)
                .maybeSingle();
              if (contact) {
                tenantName = (contact.name as string) || "Cliente";
                tenantEmail = (contact.email as string) ?? null;
              }
            }
            const to = overrideTo ?? tenantEmail;

            // Link de pagamento, quando houver cobrança Asaas
            let paymentUrl: string | null = null;
            const { data: payment } = await supabase
              .from("asaas_payments")
              .select("invoice_url, bank_slip_url")
              .eq("financial_transaction_id", tx.id)
              .eq("broker_id", brokerId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            paymentUrl =
              safeUrl((payment as any)?.invoice_url) ??
              safeUrl((payment as any)?.bank_slip_url);

            for (const offset of dueOffsets) {
              if (budget <= 0) break;

              const { data: existing } = await supabase
                .from("billing_reminder_logs")
                .select("id")
                .eq("transaction_id", tx.id)
                .eq("channel", "email")
                .eq("schedule_offset", offset)
                .eq("status", "sent")
                .limit(1)
                .maybeSingle();

              // Já enviado: pula em SILÊNCIO (sem log). A linha `sent` original já prova o envio.
              if (existing) {
                skipped++;
                continue;
              }

              budget--;
              processed++;

              if (!resend || !to || !EMAIL_RE.test(to)) {
                skipped++;
                logs.push({
                  broker_id: brokerId,
                  lease_id: lease.id,
                  transaction_id: tx.id,
                  channel: "email",
                  schedule_offset: offset,
                  status: "skipped",
                  recipient: to ?? null,
                  error_message: !resend ? "RESEND_API_KEY não configurada." : "Inquilino sem e-mail válido.",
                });
                continue;
              }

              const copy = offsetCopy(offset);
              const html = emailLayout(
                copy.title,
                `
      <h1 style="color:${BRAND.primary};font-size:24px;margin:0 0 16px;">Olá, ${escapeHtml(tenantName)}!</h1>
      <p>${copy.intro}</p>
      <table role="presentation" width="100%" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:${BRAND.radius};overflow:hidden;">
        <tr style="background:${BRAND.mutedBg};"><td style="padding:12px 16px;font-weight:600;color:${BRAND.primary};width:140px;">Descrição</td><td style="padding:12px 16px;">${escapeHtml(tx.description)}</td></tr>
        <tr><td style="padding:12px 16px;font-weight:600;color:${BRAND.primary};">Valor</td><td style="padding:12px 16px;">${escapeHtml(formatCurrency(Number(tx.amount)))}</td></tr>
        <tr style="background:${BRAND.mutedBg};"><td style="padding:12px 16px;font-weight:600;color:${BRAND.primary};">Vencimento</td><td style="padding:12px 16px;">${escapeHtml(formatDateBR(tx.due_date as string))}</td></tr>
      </table>
      ${
        paymentUrl
          ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;"><tr><td style="background:${BRAND.primary};border-radius:${BRAND.radius};padding:14px 32px;"><a href="${escapeHtml(paymentUrl)}" target="_blank" style="color:#fff;text-decoration:none;font-weight:600;font-size:16px;display:block;">Ver e pagar cobrança</a></td></tr></table>`
          : ""
      }
      <p style="color:${BRAND.mutedFg};font-size:14px;">Se o pagamento já foi realizado, desconsidere este aviso.</p>
      <p style="color:${BRAND.mutedFg};font-size:14px;">Atenciosamente, ${escapeHtml(broker.name)}.</p>
    `,
              );

              try {
                const result = await resend.emails.send({
                  from: `${broker.name.replace(/[<>"]/g, "")} via Slotimob <cobranca@slotimob.com.br>`,
                  to: [to],
                  reply_to: broker.email && EMAIL_RE.test(broker.email) ? broker.email : undefined,
                  subject: copy.subject,
                  html,
                } as any);

                if ((result as any)?.error) {
                  throw new Error(String((result as any).error?.message ?? "Falha no envio do e-mail"));
                }

                sent++;
                logs.push({
                  broker_id: brokerId,
                  lease_id: lease.id,
                  transaction_id: tx.id,
                  channel: "email",
                  schedule_offset: offset,
                  status: "sent",
                  recipient: to,
                  provider_id: (result as any)?.data?.id ?? null,
                });
              } catch (err) {
                failed++;
                console.error("[billing-reminders] falha no e-mail:", String(err));
                logs.push({
                  broker_id: brokerId,
                  lease_id: lease.id,
                  transaction_id: tx.id,
                  channel: "email",
                  schedule_offset: offset,
                  status: "failed",
                  recipient: to,
                  error_message: String(err).slice(0, 500),
                });
              }
            }
          } catch (txErr) {
            failed++;
            console.error(`[billing-reminders] erro na transação ${tx.id}:`, String(txErr));
          }
        }
      } catch (leaseErr) {
        console.error(`[billing-reminders] erro no contrato ${lease.id}:`, String(leaseErr));
      }
    }

    if (logs.length > 0) {
      const { error: logError } = await supabase.from("billing_reminder_logs").insert(logs);
      if (logError) console.error("[billing-reminders] erro ao gravar logs:", logError.message);
    }

    console.log(`[billing-reminders] processed=${processed} sent=${sent} skipped=${skipped} failed=${failed}`);
    return new Response(
      JSON.stringify({ success: true, processed, sent, skipped, failed }),
      { status: 200, headers: JSON_H },
    );
  } catch (err) {
    console.error("[billing-reminders] erro inesperado:", String(err));
    return new Response(
      JSON.stringify({ success: true, processed, sent, skipped, failed, error: String(err).slice(0, 500) }),
      { status: 200, headers: JSON_H },
    );
  }
});
