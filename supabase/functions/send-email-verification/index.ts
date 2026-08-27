import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_SENDS_PER_WINDOW = 3;
const CODE_TTL_MINUTES = 10;

const FROM_DEFAULT = "Equipe SlotiMob <contato@slotimob.com.br>";

function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function emailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Código de verificação</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid #e5e7eb;border-radius:12px;">
<tr><td style="padding:32px 28px;color:#333;font-size:16px;line-height:1.7;">
<h1 style="color:#170075;font-size:22px;margin:0 0 16px;">Confirme seu e-mail</h1>
<p style="margin:0 0 12px;">Use o código abaixo para confirmar seu e-mail e continuar com sua assinatura Slotimob:</p>
<div style="margin:24px 0;text-align:center;">
<span style="display:inline-block;background:#f4f4f9;color:#170075;font-size:34px;font-weight:700;letter-spacing:10px;padding:16px 24px;border-radius:8px;">${code}</span>
</div>
<p style="margin:0 0 8px;color:#6b6e99;font-size:14px;">Este código é válido por ${CODE_TTL_MINUTES} minutos.</p>
<p style="margin:0;color:#6b6e99;font-size:14px;">Se você não solicitou este código, ignore este e-mail.</p>
</td></tr></table></td></tr></table>
</body></html>`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Autenticação necessária" });
    }
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user?.id || !user.email) {
      return json({ error: "Sessão inválida" });
    }

    // Já verificado?
    const { data: profile } = await supabase
      .from("profiles")
      .select("email_verified_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.email_verified_at) {
      console.log("[send-email-verification] usuário já verificado");
      return json({ success: true, already_verified: true });
    }

    // Rate limit: 3 envios / 15 min por usuário
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data: recent, error: rlError } = await supabase
      .from("rate_limits")
      .select("id")
      .eq("identifier", user.id)
      .eq("endpoint", "email_verification_send")
      .gte("window_start", windowStart);

    if (rlError) {
      console.error("[send-email-verification] erro ao consultar rate_limits");
    }

    if ((recent?.length ?? 0) >= MAX_SENDS_PER_WINDOW) {
      console.log("[send-email-verification] rate limit atingido");
      return json({ error: "Muitas tentativas. Aguarde 15 minutos." });
    }

    const code = generateCode();
    const codeHash = await sha256Hex(code);

    // Invalida códigos anteriores
    await supabase
      .from("email_verifications")
      .update({ consumed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("consumed_at", null);

    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
    const { error: insertError } = await supabase.from("email_verifications").insert({
      user_id: user.id,
      email: user.email,
      code_hash: codeHash,
      attempts: 0,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("[send-email-verification] falha ao gravar verificação:", insertError.message);
      return json({ error: "Não foi possível enviar o código. Tente novamente." });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[send-email-verification] RESEND_API_KEY ausente");
      return json({ error: "Não foi possível enviar o código. Tente novamente." });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM_DEFAULT,
        to: [user.email],
        subject: "Seu código de verificação Slotimob",
        html: emailHtml(code),
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`[send-email-verification] Resend falhou [${res.status}]: ${details.slice(0, 300)}`);
      return json({ error: "Não foi possível enviar o código. Tente novamente." });
    }

    // Registra o envio para rate limit
    await supabase.from("rate_limits").insert({
      identifier: user.id,
      endpoint: "email_verification_send",
      request_count: 1,
      window_start: new Date().toISOString(),
    });

    console.log("[send-email-verification] código enviado com sucesso");
    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[send-email-verification] erro inesperado:", message);
    return json({ error: "Não foi possível enviar o código. Tente novamente." });
  }
});
