import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting constants
const RATE_LIMIT_MAX_REQUESTS = 50;
const RATE_LIMIT_WINDOW_MINUTES = 1;

interface VisitReminderRequest {
  visitId: string;
  reminderType: "24h" | "2h";
}

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check rate limit (internal function protection)
    const rateLimitResult = await checkRateLimit(
      supabase,
      'internal',
      'send-visit-reminder',
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MINUTES
    );

    if (!rateLimitResult.allowed) {
      console.log('Rate limit exceeded for send-visit-reminder');
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { visitId, reminderType }: VisitReminderRequest = await req.json();

    safeLog('Processing %s reminder for visit %s', reminderType, visitId);

    // Get visit details with related data
    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select(`
        *,
        leads!visits_lead_id_fkey (name, email, phone),
        units!visits_unit_id_fkey (unit_number, price, area),
        properties!visits_property_id_fkey (name, address)
      `)
      .eq("id", visitId)
      .single();

    if (visitError || !visit) {
      console.error("Error fetching visit:", visitError);
      throw new Error("Visit not found");
    }

    if (!visit.leads?.email) {
      console.error("Visit has no lead email");
      throw new Error("Lead email not found");
    }

    // Format date and time
    const visitDate = new Date(visit.scheduled_at);
    const dateStr = visitDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const timeStr = visitDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Prepare email content
    const reminderText = reminderType === "24h" 
      ? "amanhã" 
      : "em 2 horas";

    const propertyInfo = visit.properties
      ? `<p><strong>Empreendimento:</strong> ${visit.properties.name}</p>
         ${visit.properties.address ? `<p><strong>Endereço:</strong> ${visit.properties.address}</p>` : ""}`
      : "";

    const unitInfo = visit.units
      ? `<p><strong>Unidade:</strong> ${visit.units.unit_number}</p>
         <p><strong>Área:</strong> ${visit.units.area}m²</p>
         ${visit.units.price ? `<p><strong>Valor:</strong> ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(visit.units.price)}</p>` : ""}`
      : "";

    // Create confirmation link
    const confirmationUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/functions/v1/confirm-visit?visitId=${visitId}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Imobiliária <onboarding@resend.dev>",
      to: [visit.leads.email],
      subject: `Lembrete: Visita agendada ${reminderText}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Lembrete de Visita</h1>
          <p>Olá, <strong>${visit.leads.name}</strong>!</p>
          <p>Este é um lembrete de que você tem uma visita agendada <strong>${reminderText}</strong>:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Data:</strong> ${dateStr}</p>
            <p><strong>Horário:</strong> ${timeStr}</p>
            <p><strong>Duração:</strong> ${visit.duration_minutes} minutos</p>
            ${propertyInfo}
            ${unitInfo}
            ${visit.notes ? `<p><strong>Observações:</strong> ${visit.notes}</p>` : ""}
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${confirmationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              ✓ Confirmar Presença
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Clique no botão acima para confirmar sua presença na visita.</p>
          
          <p>Aguardamos você!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Se precisar remarcar ou cancelar, entre em contato conosco.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update notification status
    const updateField = reminderType === "24h" 
      ? "notification_24h_sent" 
      : "notification_2h_sent";

    const { error: updateError } = await supabase
      .from("visits")
      .update({ [updateField]: true })
      .eq("id", visitId);

    if (updateError) {
      console.error("Error updating notification status:", updateError);
      throw updateError;
    }

    // Log notification
    const { error: logError } = await supabase
      .from("notification_logs")
      .insert({
        visit_id: visitId,
        broker_id: visit.broker_id,
        lead_email: visit.leads.email,
        notification_type: reminderType
      });

    if (logError) {
      console.error("Error logging notification:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-visit-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
