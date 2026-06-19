import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';
import { corsHeaders } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));


const FROM_DEFAULT = "Equipe SlotiMob <contato@slotimob.com.br>";

// Brand colors (HSL from index.css)
const BRAND = {
  primary: "#170075",        // hsl(246,100%,23%)
  accent: "#2db88a",         // hsl(170,62%,49%)
  foreground: "#170075",
  mutedFg: "#6b6e99",
  bg: "#ffffff",
  mutedBg: "#f4f4f9",
  radius: "8px",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://app.slotimob.com.br";
const LOGO_URL = `${SITE_URL}/sloti-logo.png`;

// SECURITY: escape user-supplied values before interpolating into HTML.
function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// SECURITY: only allow https URLs in CTA links (blocks javascript:, data:, etc.).
function safeUrl(url: string | undefined, fallback: string): string {
  const candidate = String(url ?? "").trim();
  if (/^https:\/\//i.test(candidate)) return candidate;
  return fallback;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function emailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<!-- Header -->
<tr><td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});padding:32px 24px;text-align:center;">
<img src="${LOGO_URL}" alt="SlotiMob" width="160" style="display:block;margin:0 auto;" />
</td></tr>
<!-- Body -->
<tr><td style="padding:32px 28px;background:${BRAND.bg};color:#333;font-size:16px;line-height:1.7;">
${bodyHtml}
</td></tr>
<!-- Footer -->
<tr><td style="padding:20px 28px;background:${BRAND.mutedBg};text-align:center;font-size:12px;color:${BRAND.mutedFg};">
<p style="margin:0;">© ${new Date().getFullYear()} SlotiMob — O futuro da gestão imobiliária</p>
<p style="margin:4px 0 0;">Este e-mail foi enviado automaticamente. Não é necessário responder.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">
<tr><td style="background:${BRAND.primary};border-radius:${BRAND.radius};padding:14px 32px;">
<a href="${url}" target="_blank" style="color:#fff;text-decoration:none;font-weight:600;font-size:16px;display:block;">${text}</a>
</td></tr></table>`;
}

// ─── Templates ───────────────────────────────────────────────────────────────

function welcomeEmail(userName: string, dashboardUrl: string): { subject: string; html: string } {
  return {
    subject: "O futuro da sua gestão imobiliária começou! 🏠",
    html: emailLayout("Bem-vindo à SlotiMob", `
      <h1 style="color:${BRAND.foreground};font-size:24px;margin:0 0 16px;">Seja muito bem-vindo(a) à SlotiMob, ${userName}!</h1>
      <p>Você não acabou de contratar um software — <strong>você ganhou um novo sócio tecnológico</strong>. Agora, seus leads do WhatsApp não ficam mais perdidos e sua gestão financeira está a um clique de distância.</p>
      <p style="font-weight:600;color:${BRAND.foreground};margin:24px 0 12px;">Seus próximos passos:</p>
      <ul style="padding-left:20px;color:#555;line-height:2;">
        <li>📲 Conectar seu WhatsApp em <strong>Integrações</strong></li>
        <li>🏠 Cadastrar seu primeiro imóvel</li>
        <li>👥 Importar sua lista de contatos</li>
      </ul>
      ${ctaButton("Começar agora", dashboardUrl)}
      <p style="color:${BRAND.mutedFg};font-size:14px;">Precisa de ajuda? Nossa equipe está pronta para te apoiar.</p>
    `),
  };
}

function leadAssignedEmail(
  agentName: string,
  leadName: string,
  leadPhone: string,
  chatUrl: string,
): { subject: string; html: string } {
  return {
    subject: "⚡ URGENTE: Novo Lead para você!",
    html: emailLayout("Novo Lead Atribuído", `
      <h1 style="color:${BRAND.foreground};font-size:24px;margin:0 0 16px;">Som de dinheiro! 💰 Um novo lead acaba de entrar.</h1>
      <p>Olá, <strong>${agentName}</strong>! A roleta de leads da SlotiMob acabou de te atribuir um novo contato vindo do WhatsApp. O tempo médio de resposta é o <strong>fator principal para o fechamento</strong>.</p>
      <table role="presentation" width="100%" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:${BRAND.radius};overflow:hidden;">
        <tr style="background:${BRAND.mutedBg};">
          <td style="padding:12px 16px;font-weight:600;color:${BRAND.foreground};width:120px;">Nome</td>
          <td style="padding:12px 16px;">${leadName}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-weight:600;color:${BRAND.foreground};">Origem</td>
          <td style="padding:12px 16px;">WhatsApp</td>
        </tr>
      </table>
      ${ctaButton("Falar com o Lead agora", chatUrl)}
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 ${BRAND.radius} ${BRAND.radius} 0;margin-top:20px;">
        <p style="margin:0;font-size:14px;color:#92400e;">
          ⏱️ <strong>Dica:</strong> Responda em menos de 5 minutos para aumentar as chances de fechamento em até 80%!
        </p>
      </div>
    `),
  };
}

// ─── Main handler ────────────────────────────────────────────────────────────

interface SendEmailRequest {
  template: "welcome" | "lead_assigned" | "custom";
  to: string;
  // welcome
  user_name?: string;
  dashboard_url?: string;
  // lead_assigned
  agent_name?: string;
  lead_name?: string;
  lead_phone?: string;
  chat_url?: string;
  // custom
  subject?: string;
  html?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Create admin client for logging
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      safeWarn('JWT inválido ou expirado: %s', userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return new Response(JSON.stringify({ error: "Invalid user context" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendEmailRequest = await req.json();
    const { template, to } = body;

    if (!to || !template) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'template'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject: string;
    let html: string;

    switch (template) {
      case "welcome": {
        const result = welcomeEmail(
          body.user_name || "Usuário",
          body.dashboard_url || `${SITE_URL}/dashboard`,

        );
        subject = result.subject;
        html = result.html;
        break;
      }
      case "lead_assigned": {
        const result = leadAssignedEmail(
          body.agent_name || "Agente",
          body.lead_name || "Novo Lead",
          body.lead_phone || "",
          body.chat_url || `${SITE_URL}/whatsapp`,

        );
        subject = result.subject;
        html = result.html;
        break;
      }
      case "custom": {
        if (!body.subject || !body.html) {
          return new Response(JSON.stringify({ error: "Custom template requires 'subject' and 'html'" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // SECURITY: the 'custom' template lets the caller fully control subject/html sent
        // from the platform's official address. Restrict the recipient to the authenticated
        // caller's own email address to prevent phishing/email-reputation abuse.
        const callerEmail = (user.email || "").toLowerCase();
        if (!callerEmail || callerEmail !== String(to).toLowerCase()) {
          return new Response(
            JSON.stringify({ error: "Custom emails can only be sent to your own account email" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        subject = String(body.subject).slice(0, 200);
        html = body.html;
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown template: ${template}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    safeLog('Sending %s email to: %s', template, to);

    const emailResponse = await resend.emails.send({
      from: FROM_DEFAULT,
      to: [to],
      subject,
      html,
    });

    console.log("Email sent:", emailResponse);

    // Log to email_notifications
    await adminClient.from("email_notifications").insert({
      broker_id: userId,
      recipient_email: to,
      email_type: template,
      subject,
      status: "sent",
      resend_id: emailResponse?.id || null,
      metadata: { template, ...body },
    });

    return new Response(JSON.stringify({ success: true, id: emailResponse?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-email:", error);

    // Try to log the failure
    try {
      const body = { template: "unknown", to: "unknown" };
      await adminClient.from("email_notifications").insert({
        broker_id: "00000000-0000-0000-0000-000000000000",
        recipient_email: "error",
        email_type: "error",
        subject: "Send failed",
        status: "failed",
        error_message: error.message?.substring(0, 500),
      });
    } catch (_) { /* ignore logging errors */ }

    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
