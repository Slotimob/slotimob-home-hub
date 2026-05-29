import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting constants
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MINUTES = 1;

// Rate limiting helper
async function checkRateLimit(
  supabaseAdmin: any,
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: maxRequests };
  }

  const currentCount = data?.request_count || 0;
  
  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  if (data) {
    await supabaseAdmin
      .from('rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .eq('window_start', data.window_start);
  } else {
    await supabaseAdmin
      .from('rate_limits')
      .insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: new Date().toISOString()
      });
  }

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

// Get client IP address
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check rate limit by IP address
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      clientIP,
      'confirm-visit',
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MINUTES
    );

    if (!rateLimitResult.allowed) {
      safeLog('Rate limit exceeded for IP %s', clientIP);
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Muitas Requisições</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #ff9800; }
            </style>
          </head>
          <body>
            <h1 class="error">⏳ Muitas Requisições</h1>
            <p>Por favor, aguarde alguns segundos e tente novamente.</p>
          </body>
        </html>
        `,
        { 
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
          status: 429 
        }
      );
    }

    const url = new URL(req.url);
    const visitId = url.searchParams.get('visitId');

    if (!visitId) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Erro</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">⚠️ Link Inválido</h1>
            <p>Não foi possível identificar a visita.</p>
          </body>
        </html>
        `,
        { 
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
          status: 400 
        }
      );
    }

    // Get visit details
    const { data: visit, error: visitError } = await supabaseClient
      .from('visits')
      .select('*, leads(name, email), properties(name)')
      .eq('id', visitId)
      .single();

    if (visitError || !visit) {
      console.error('Error fetching visit:', visitError);
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Erro</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">⚠️ Visita Não Encontrada</h1>
            <p>Não foi possível localizar esta visita.</p>
          </body>
        </html>
        `,
        { 
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
          status: 404 
        }
      );
    }

    // Check if already confirmed
    if (visit.lead_confirmed) {
      const confirmedDate = new Date(visit.lead_confirmed_at).toLocaleString('pt-BR');
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Já Confirmado</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
              .container { background: white; border-radius: 10px; padding: 40px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .info { color: #1976d2; }
              h1 { margin-bottom: 20px; }
              .details { background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="info">ℹ️ Presença Já Confirmada</h1>
              <p>Olá <strong>${visit.leads.name}</strong>,</p>
              <p>Sua presença já foi confirmada anteriormente em:</p>
              <p><strong>${confirmedDate}</strong></p>
              <div class="details">
                <p><strong>🏢 ${visit.properties.name}</strong></p>
                <p>📅 ${new Date(visit.scheduled_at).toLocaleString('pt-BR')}</p>
              </div>
              <p>Aguardamos você!</p>
            </div>
          </body>
        </html>
        `,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Update visit to confirmed
    const { error: updateError } = await supabaseClient
      .from('visits')
      .update({ 
        lead_confirmed: true,
        lead_confirmed_at: new Date().toISOString()
      })
      .eq('id', visitId);

    if (updateError) {
      console.error('Error confirming visit:', updateError);
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Erro</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #d32f2f; }
            </style>
          </head>
          <body>
            <h1 class="error">⚠️ Erro ao Confirmar</h1>
            <p>Ocorreu um erro ao confirmar sua presença. Por favor, tente novamente.</p>
          </body>
        </html>
        `,
        { 
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
          status: 500 
        }
      );
    }

    console.log('Visit confirmed successfully:', visitId);

    // Return success page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Presença Confirmada</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .container { background: white; border-radius: 10px; padding: 40px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #4CAF50; }
            h1 { margin-bottom: 20px; }
            .details { background-color: #e8f5e9; padding: 20px; border-radius: 5px; margin-top: 20px; }
            .icon { font-size: 64px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✓</div>
            <h1 class="success">Presença Confirmada!</h1>
            <p>Olá <strong>${visit.leads.name}</strong>,</p>
            <p>Sua presença foi confirmada com sucesso!</p>
            <div class="details">
              <p><strong>🏢 ${visit.properties.name}</strong></p>
              <p>📅 ${new Date(visit.scheduled_at).toLocaleString('pt-BR')}</p>
            </div>
            <p style="margin-top: 30px;">Aguardamos você! Em caso de dúvidas, entre em contato conosco.</p>
          </div>
        </body>
      </html>
      `,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
    );

  } catch (error: any) {
    console.error('Error in confirm-visit function:', error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Erro</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">⚠️ Erro</h1>
          <p>Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.</p>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
};

Deno.serve(handler);
