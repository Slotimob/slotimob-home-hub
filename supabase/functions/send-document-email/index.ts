import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendDocumentRequest {
  to: string;
  subject: string;
  message: string;
  documentName: string;
  pdfBase64: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT using getUser
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      safeWarn('JWT inválido ou expirado: %s', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return new Response(JSON.stringify({ error: 'Invalid user context' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile for sender name
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    const senderName = profile?.full_name || 'SLOTIMOB';

    const { to, subject, message, documentName, pdfBase64 }: SendDocumentRequest = await req.json();

    if (!to || !subject || !pdfBase64) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({ error: 'Invalid recipient email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Escape HTML to prevent injection in branded emails
    const escapeHtml = (s: string) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const plainMessage = String(message ?? '').replace(/<[^>]*>/g, '').slice(0, 5000);
    const safeMessage = escapeHtml(plainMessage).replace(/\n/g, '<br>');
    const safeDocumentName = escapeHtml(String(documentName ?? 'documento').slice(0, 200));
    const safeSubject = String(subject).slice(0, 200);

    // Verify the recipient belongs to the caller's contacts/leads or is the caller's own email
    let recipientAllowed = false;
    if (profile?.email && profile.email.toLowerCase() === to.toLowerCase()) {
      recipientAllowed = true;
    }
    if (!recipientAllowed) {
      const { data: contactMatch } = await supabaseClient
        .from('contacts')
        .select('id')
        .eq('email', to)
        .limit(1)
        .maybeSingle();
      if (contactMatch) recipientAllowed = true;
    }
    if (!recipientAllowed) {
      const { data: leadMatch } = await supabaseClient
        .from('leads')
        .select('id')
        .eq('email', to)
        .limit(1)
        .maybeSingle();
      if (leadMatch) recipientAllowed = true;
    }
    if (!recipientAllowed) {
      return new Response(
        JSON.stringify({ error: 'Recipient must be one of your contacts/leads or your own email' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    safeLog('Sending document email, subject length=%d', safeSubject.length);

    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    const emailResponse = await resend.emails.send({
      from: `${senderName} via SlotiMob <contato@slotimob.com.br>`,
      to: [to],
      subject: safeSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">SLOTIMOB</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p style="white-space: pre-line; color: #374151; line-height: 1.6;">
              ${safeMessage}
            </p>
            <div style="margin-top: 30px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                📎 Documento anexado: <strong>${safeDocumentName}.pdf</strong>
              </p>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; background: #1f2937; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Enviado via SLOTIMOB - Sistema para Corretores de Imóveis</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `${safeDocumentName}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-document-email function:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to send document email' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
