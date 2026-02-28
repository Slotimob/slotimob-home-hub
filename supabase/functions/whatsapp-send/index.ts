import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_TEXT_LENGTH = 4096;

/**
 * Sanitiza número de telefone para formato DDI+DDD+Número exigido pela Evolution API.
 * Regras BR: remove '0' inicial do DDD, garante prefixo '55'.
 * Celulares BR: 55 + DDD(2) + 9 + XXXXXXXX = 13 dígitos
 * Fixos BR:    55 + DDD(2) + XXXXXXXX     = 12 dígitos
 */
function sanitizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  // Remove '0' inicial do DDD (ex: 041... → 41...)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Se já tem DDI (13+ dígitos começando com 55), aceitar como está
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return cleaned;
  }

  // Se não tem DDI, adicionar 55
  if (cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

/**
 * Formata número sanitizado como JID do WhatsApp.
 */
function toWhatsAppJid(phone: string): string {
  const sanitized = sanitizePhoneNumber(phone);
  return sanitized.includes('@') ? sanitized : `${sanitized}@s.whatsapp.net`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const evolutionApiUrl = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/$/, '');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, content, messageType } = body;

    if (!conversationId || !content) {
      return new Response(JSON.stringify({ error: 'conversationId and content are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (content.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: 'Message too long' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get conversation + connection
    const { data: conversation, error: convError } = await supabaseClient
      .from('whatsapp_conversations')
      .select('*, connection:whatsapp_connections(*)')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (conversation.connection.broker_id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const instanceName = conversation.connection.instance_name;
    if (!instanceName) {
      return new Response(JSON.stringify({ error: 'No Evolution instance configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitizar número
    const recipientPhone = sanitizePhoneNumber(conversation.contact_phone || '');
    const sanitizedContent = (content || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

    console.log(`Enviando para ${recipientPhone} via ${instanceName}`);

    // Send via Evolution API v2.3.7
    const validatedType = messageType || 'text';
    let evoUrl = '';
    let evoBody: Record<string, unknown> = {};

    if (validatedType === 'text') {
      evoUrl = `${evolutionApiUrl}/message/sendText/${instanceName}`;
      evoBody = { number: recipientPhone, text: sanitizedContent };
    } else if (validatedType === 'image') {
      evoUrl = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
      evoBody = { number: recipientPhone, mediatype: 'image', media: body.mediaUrl, caption: sanitizedContent || undefined };
    } else if (validatedType === 'document') {
      evoUrl = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
      evoBody = { number: recipientPhone, mediatype: 'document', media: body.mediaUrl, fileName: body.mediaFilename || 'document' };
    } else if (validatedType === 'audio') {
      evoUrl = `${evolutionApiUrl}/message/sendWhatsAppAudio/${instanceName}`;
      evoBody = { number: recipientPhone, audio: body.mediaUrl };
    } else {
      evoUrl = `${evolutionApiUrl}/message/sendText/${instanceName}`;
      evoBody = { number: recipientPhone, text: sanitizedContent };
    }

    console.log(`Evolution API: POST ${evoUrl}`);

    const evoRes = await fetch(evoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify(evoBody),
    });

    const evoData = await evoRes.json();
    console.log('Evolution response status:', evoRes.status);

    const messageStatus = evoRes.ok ? 'sent' : 'failed';
    const waMessageId = evoData?.key?.id || `evo_${Date.now()}`;

    // Save message to DB
    const { data: message, error: msgError } = await supabaseClient
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        message_id: waMessageId,
        direction: 'outgoing',
        message_type: validatedType,
        content: sanitizedContent,
        media_url: body.mediaUrl || null,
        media_mime_type: body.mediaMimeType || null,
        media_filename: body.mediaFilename || null,
        status: messageStatus,
        sent_at: new Date().toISOString(),
        sender_user_id: userId,
      })
      .select()
      .single();

    if (msgError) console.error('DB insert error:', msgError);

    // Update conversation last_message
    await supabaseClient
      .from('whatsapp_conversations')
      .update({
        last_message: sanitizedContent || `[${validatedType}]`,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (!evoRes.ok) {
      return new Response(JSON.stringify({ error: evoData?.message || 'Failed to send via Evolution', message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('whatsapp-send error:', error);
    return new Response(JSON.stringify({ error: 'Failed to send message' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
