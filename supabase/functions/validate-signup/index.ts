import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-forwarded-for, x-real-ip",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_SIGNUPS_PER_WINDOW = 3;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  safeLog('[VALIDATE-SIGNUP] %s%s', step, detailsStr);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Validation started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP from various headers
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
    
    logStep("Client IP detected", { clientIp });

    // Parse request body
    const body = await req.json();
    const { email, honeypot, formLoadTime } = body;
    const rawDocument = body.cpf || body.document || '';

    // Honeypot check - if filled, it's a bot
    if (honeypot && honeypot.trim() !== '') {
      logStep("Honeypot triggered - rejecting as bot");
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: "bot_detected",
          message: "Atividade suspeita detectada. Tente novamente." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Time-based check - form must be visible for at least 3 seconds
    const MIN_FORM_TIME_MS = 3000;
    if (formLoadTime && Date.now() - formLoadTime < MIN_FORM_TIME_MS) {
      logStep("Form submitted too quickly - rejecting as bot", { 
        elapsed: Date.now() - formLoadTime 
      });
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: "too_fast",
          message: "Por favor, preencha o formulário com calma." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting by IP
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    
    // Check existing rate limit entries
    const { data: existingEntries, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', clientIp)
      .eq('endpoint', 'signup')
      .gte('window_start', windowStart);

    if (fetchError) {
      logStep("Error fetching rate limits", { error: fetchError.message });
      // Don't block on rate limit errors - fail open but log
    }

    const currentCount = existingEntries?.length || 0;
    logStep("Current signup count for IP", { clientIp, currentCount, maxAllowed: MAX_SIGNUPS_PER_WINDOW });

    if (currentCount >= MAX_SIGNUPS_PER_WINDOW) {
      logStep("Rate limit exceeded", { clientIp, currentCount });
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: "rate_limited",
          message: `Muitas tentativas de cadastro. Aguarde ${RATE_LIMIT_WINDOW_MINUTES} minutos.` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Duplicate document check — AFTER rate limiting, so this endpoint cannot
    // be abused as a "does this CPF have an account?" oracle.
    const cleanDocument = String(rawDocument).replace(/\D/g, '');
    if (cleanDocument.length === 11 || cleanDocument.length === 14) {
      const { data: existingProfile, error: docCheckError } = await supabase
        .from('profiles')
        .select('id')
        .or(`cpf.eq.${cleanDocument},cnpj.eq.${cleanDocument}`)
        .limit(1)
        .maybeSingle();

      if (docCheckError) {
        logStep("Error checking duplicate document - failing open", { error: docCheckError.message });
      } else if (existingProfile) {
        logStep("Duplicate document detected", { clientIp });
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: "documento_duplicado",
            message: "Este CPF/CNPJ já está cadastrado. Faça login ou use outro documento."
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Note: We skip duplicate email check here - Supabase Auth will handle it
    // This avoids API compatibility issues and the auth.signUp will return proper error

    // Record this signup attempt for rate limiting
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({
        identifier: clientIp,
        endpoint: 'signup',
        request_count: 1,
        window_start: new Date().toISOString()
      });

    if (insertError) {
      logStep("Error recording rate limit", { error: insertError.message });
    }

    logStep("Signup validation passed", { clientIp, email });

    return new Response(
      JSON.stringify({ 
        allowed: true,
        message: "Validação aprovada" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error in validation", { error: errorMessage });
    
    // Fail open - don't block signups on validation errors
    // Return generic message to avoid leaking internal details
    return new Response(
      JSON.stringify({ 
        allowed: true,
        message: "Validação aprovada" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
