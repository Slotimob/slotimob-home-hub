import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyTermsUpdateRequest {
  version: string;
  title: string;
  summary: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-terms-update function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("No valid authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT and extract user identity
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Invalid JWT:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub;
    safeLog('Authenticated user: %s', userId);

    // Server-side admin role check using service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      safeError('Access denied for user %s: no admin role', userId);
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    safeLog('Admin role verified: %s', roleData.role);

    // Parse request body
    const { version, title, summary }: NotifyTermsUpdateRequest = await req.json();
    safeLog('Notifying users about terms update - Version: %s', version);

    // Get all users with email
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .not("email", "is", null);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    safeLog('Found %s users to notify', profiles?.length || 0);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: "No users to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send emails in batches
    const batchSize = 50;
    let notifiedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (profile) => {
        try {
          const emailResponse = await resend.emails.send({
            from: "SLOTIMOB <onboarding@resend.dev>",
            to: [profile.email],
            subject: `Atualização dos Termos de Uso - ${title}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">SLOTIMOB</h1>
                </div>
                
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <h2 style="color: #1f2937; margin-top: 0;">Olá, ${profile.full_name || 'Usuário'}!</h2>
                  
                  <p style="color: #4b5563;">
                    Gostaríamos de informá-lo que atualizamos nossa <strong>Política de Privacidade</strong> e <strong>Termos de Uso</strong>.
                  </p>
                  
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #374151;"><strong>Versão:</strong> ${version}</p>
                    <p style="margin: 0; color: #374151;"><strong>Resumo das alterações:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #6b7280;">${summary || 'Atualizações gerais nos termos de uso e política de privacidade.'}</p>
                  </div>
                  
                  <p style="color: #4b5563;">
                    Na próxima vez que você acessar o SLOTIMOB, será solicitado que revise e aceite os novos termos para continuar usando a plataforma.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://slotimob.lovable.app/legal" style="background: #6366f1; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-block;">
                      Ver Termos Atualizados
                    </a>
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  
                  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    SLOTI - CNPJ: 42.323.823/0001-06<br>
                    Este email foi enviado automaticamente. Não responda a este email.
                  </p>
                </div>
              </body>
              </html>
            `,
          });

          safeLog('Email sent to %s:', profile.email, emailResponse);
          return { success: true, email: profile.email };
        } catch (error) {
          safeError('Failed to send email to %s:', profile.email, error);
          return { success: false, email: profile.email, error };
        }
      });

      const results = await Promise.all(emailPromises);
      notifiedCount += results.filter(r => r.success).length;
      errorCount += results.filter(r => !r.success).length;
    }

    safeLog('Notification complete. Notified: %s, Errors: %s', notifiedCount, errorCount);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: notifiedCount, 
        errors: errorCount,
        message: `Notificação enviada para ${notifiedCount} usuários` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-terms-update function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
