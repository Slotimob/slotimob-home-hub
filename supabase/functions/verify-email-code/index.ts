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

// Mensagem genérica única — evita enumeração de estado do código
const GENERIC_ERROR = "Código expirado ou inválido. Peça um novo.";
const MAX_ATTEMPTS = 5;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação em tempo constante (percorre ambas as strings inteiras). */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
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

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) {
      console.log("[verify-email-code] formato de código inválido");
      return json({ error: GENERIC_ERROR });
    }

    const { data: record } = await supabase
      .from("email_verifications")
      .select("id, email, code_hash, attempts")
      .eq("user_id", user.id)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) {
      console.log("[verify-email-code] nenhum código ativo encontrado");
      return json({ error: GENERIC_ERROR });
    }

    const nowIso = new Date().toISOString();

    if ((record.attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabase
        .from("email_verifications")
        .update({ consumed_at: nowIso })
        .eq("id", record.id);
      console.log("[verify-email-code] limite de tentativas atingido");
      return json({ error: GENERIC_ERROR });
    }

    // Incrementa ANTES de comparar (falha de rede não gera tentativa grátis)
    await supabase
      .from("email_verifications")
      .update({ attempts: (record.attempts ?? 0) + 1 })
      .eq("id", record.id);

    // E-mail mudou desde a emissão do código
    if ((record.email ?? "").toLowerCase() !== user.email.toLowerCase()) {
      await supabase
        .from("email_verifications")
        .update({ consumed_at: nowIso })
        .eq("id", record.id);
      console.log("[verify-email-code] e-mail divergente, código invalidado");
      return json({ error: GENERIC_ERROR });
    }

    const candidateHash = await sha256Hex(code);
    if (!timingSafeEqual(candidateHash, record.code_hash ?? "")) {
      console.log("[verify-email-code] código não confere");
      return json({ error: GENERIC_ERROR });
    }

    await supabase
      .from("email_verifications")
      .update({ consumed_at: nowIso })
      .eq("id", record.id);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email_verified_at: nowIso })
      .eq("id", user.id);

    if (profileError) {
      console.error("[verify-email-code] falha ao marcar perfil:", profileError.message);
      return json({ error: GENERIC_ERROR });
    }

    console.log("[verify-email-code] e-mail verificado com sucesso");
    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[verify-email-code] erro inesperado:", message);
    return json({ error: GENERIC_ERROR });
  }
});
