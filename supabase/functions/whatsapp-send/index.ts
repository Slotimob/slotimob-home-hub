import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_TEXT_LENGTH = 4096;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MIN = 1;

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function sanitizeContent(content: string): string {
  if (!content) return '';
  return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

async function checkRateLimit(
  supabaseAdmin: any, identifier: string, endpoint: string,
  maxRequests: number, windowMinutes: number
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

  if (error) return { allowed: true, remaining: maxRequests };
  const currentCount = data?.request_count || 0;
  if (currentCount >= maxRequests) return { allowed: false, remaining: 0 };

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
      .insert({ identifier, endpoint, request_count: 1, window_start: new Date().toISOString() });
  }
  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Rate limit
    const rl = await checkRateLimit(supabaseAdmin, userId, 'whatsapp-send', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MIN);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    let requestBody: any;
    try { requestBody = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, messageType, content } = requestBody;

    if (!conversationId || !isValidUUID(conversationId)) {
      return new Response(JSON.stringify({ error: 'Invalid conversation ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validatedType = messageType || 'text';
    if (!['text', 'image', 'document', 'audio', 'video'].includes(validatedType)) {
      return new Response(JSON.stringify({ error: 'Unsupported message type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (content && content.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: 'Message too long' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitized = sanitizeContent(content || '');

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

    const conn = conversation.connection;
    const recipientPhone = conversation.contact_phone;

    // ─── Send via Meta Cloud API ───
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN');
    const phoneNumberId = conn.phone_number_id;

    if (!whatsappToken || !phoneNumberId) {
      return new Response(JSON.stringify({ error: 'WhatsApp connection not configured for Meta API' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    let metaBody: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
    };

    switch (validatedType) {
      case 'text':
        metaBody.type = 'text';
        metaBody.text = { body: sanitized };
        break;
      case 'image':
        metaBody.type = 'image';
        metaBody.image = { link: requestBody.mediaUrl, caption: sanitized || undefined };
        break;
      case 'document':
        metaBody.type = 'document';
        metaBody.document = { link: requestBody.mediaUrl, filename: requestBody.mediaFilename || 'document' };
        break;
      case 'audio':
        metaBody.type = 'audio';
        metaBody.audio = { link: requestBody.mediaUrl };
        break;
      case 'video':
        metaBody.type = 'video';
        metaBody.video = { link: requestBody.mediaUrl, caption: sanitized || undefined };
        break;
    }

    console.log(`Sending to Meta Cloud API: ${metaUrl}`);

    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsappToken}`,
      },
      body: JSON.stringify(metaBody),
    });

    const metaData = await metaResponse.json();
    console.log('Meta API response:', JSON.stringify(metaData));

    const messageStatus = metaResponse.ok ? 'sent' : 'failed';
    const waMessageId = metaData.messages?.[0]?.id || `sent_${Date.now()}`;

    if (!metaResponse.ok) {
      console.error('Meta API error:', metaData);
    }

    // Save message to DB
    const { data: message, error: msgError } = await supabaseClient
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        message_id: waMessageId,
        direction: 'outgoing',
        message_type: validatedType,
        content: sanitized,
        media_url: requestBody.mediaUrl || null,
        media_mime_type: requestBody.mediaMimeType || null,
        media_filename: requestBody.mediaFilename || null,
        status: messageStatus,
        sent_at: new Date().toISOString(),
        sender_user_id: userId,
      })
      .select()
      .single();

    if (msgError) console.error('Error saving message:', msgError);

    // Update conversation
    await supabaseClient
      .from('whatsapp_conversations')
      .update({
        last_message: sanitized || `[${validatedType}]`,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (!metaResponse.ok) {
      return new Response(JSON.stringify({ error: metaData.error?.message || 'Failed to send', message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message, metaResponse: metaData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-RateLimit-Remaining': String(rl.remaining) },
    });
  } catch (error) {
    console.error('Error in whatsapp-send:', error);
    return new Response(JSON.stringify({ error: 'Failed to send message. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
