import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

// Rate limiting constants
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MINUTES = 1;

// Valid webhook event types
const VALID_EVENTS = ['connection.update', 'qrcode.updated', 'messages.upsert', 'messages.update'];

// HMAC signature verification
async function verifyWebhookSignature(
  bodyText: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(bodyText)
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}

// Validate payload structure
function validatePayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload format' };
  }

  if (!payload.event || typeof payload.event !== 'string') {
    return { valid: false, error: 'Missing or invalid event field' };
  }

  if (!payload.instance || typeof payload.instance !== 'string') {
    return { valid: false, error: 'Missing or invalid instance field' };
  }

  if (!VALID_EVENTS.includes(payload.event)) {
    return { valid: false, error: `Invalid event type: ${payload.event}` };
  }

  // Instance name should be alphanumeric with underscores/hyphens only
  if (!/^[a-zA-Z0-9_-]+$/.test(payload.instance)) {
    return { valid: false, error: 'Invalid instance name format' };
  }

  return { valid: true };
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Read body as text for signature verification
    const bodyText = await req.text();
    let payload: any;

    try {
      payload = JSON.parse(bodyText);
    } catch {
      console.error('Invalid JSON payload');
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('WhatsApp Webhook received:', JSON.stringify(payload, null, 2));

    // Validate payload structure
    const validation = validatePayload(payload);
    if (!validation.valid) {
      console.error('Payload validation failed:', validation.error);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event, instance, data } = payload;

    // Check rate limit by instance name
    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      instance,
      'whatsapp-webhook',
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MINUTES
    );

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for instance ${instance}`);
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        },
      });
    }

    // Find connection by instance name
    const { data: connection, error: connError } = await supabaseClient
      .from('whatsapp_connections')
      .select('*')
      .eq('instance_name', instance)
      .single();

    if (connError || !connection) {
      console.error('Connection not found for instance:', instance);
      // Return generic error to prevent instance enumeration
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify webhook signature if webhook_secret is configured
    if (connection.webhook_secret) {
      const signature = req.headers.get('x-webhook-signature');
      const isValid = await verifyWebhookSignature(bodyText, signature, connection.webhook_secret);
      
      if (!isValid) {
        console.error('Invalid webhook signature for instance:', instance);
        
        // Log unauthorized attempt
        await supabaseClient.from('audit_logs').insert({
          broker_id: connection.broker_id,
          action: 'webhook_unauthorized',
          table_name: 'whatsapp_webhook',
          metadata: { 
            event, 
            instance, 
            source_ip: req.headers.get('x-forwarded-for'),
            reason: 'invalid_signature'
          }
        });

        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Log successful webhook receipt for audit
    await supabaseClient.from('audit_logs').insert({
      broker_id: connection.broker_id,
      action: 'webhook_received',
      table_name: 'whatsapp_webhook',
      metadata: { 
        event, 
        instance, 
        source_ip: req.headers.get('x-forwarded-for')
      }
    });

    switch (event) {
      case 'connection.update': {
        // Handle connection status updates
        const state = data?.state;
        if (!state) break;
        
        let newStatus = connection.status;

        if (state === 'open') {
          newStatus = 'connected';
        } else if (state === 'close') {
          newStatus = 'disconnected';
        } else if (state === 'connecting') {
          newStatus = 'connecting';
        }

        await supabaseClient
          .from('whatsapp_connections')
          .update({ 
            status: newStatus,
            phone_number: data.instance?.wuid?.replace('@s.whatsapp.net', '') || connection.phone_number,
            connected_at: newStatus === 'connected' ? new Date().toISOString() : connection.connected_at
          })
          .eq('id', connection.id);

        console.log(`Connection ${connection.id} status updated to ${newStatus}`);
        break;
      }

      case 'qrcode.updated': {
        // Handle QR code updates
        if (!data?.qrcode?.base64) break;
        
        await supabaseClient
          .from('whatsapp_connections')
          .update({ 
            qr_code: data.qrcode.base64,
            status: 'connecting'
          })
          .eq('id', connection.id);

        console.log(`QR Code updated for connection ${connection.id}`);
        break;
      }

      case 'messages.upsert': {
        // Handle incoming messages
        const messages = data?.messages || [];
        
        for (const msg of messages) {
          // Skip status messages and messages from self
          if (msg.key?.fromMe || !msg.message) continue;

          const remoteJid = msg.key?.remoteJid;
          if (!remoteJid) continue;
          
          const contactPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
          const contactName = msg.pushName || contactPhone;
          const messageId = msg.key?.id;

          if (!messageId) continue;

          // Determine message type and content
          let messageType = 'text';
          let content = '';
          let mediaUrl = null;
          let mediaMimeType = null;
          let mediaFilename = null;

          if (msg.message.conversation) {
            content = msg.message.conversation;
          } else if (msg.message.extendedTextMessage) {
            content = msg.message.extendedTextMessage.text;
          } else if (msg.message.imageMessage) {
            messageType = 'image';
            content = msg.message.imageMessage.caption || '';
            mediaMimeType = msg.message.imageMessage.mimetype;
          } else if (msg.message.audioMessage) {
            messageType = 'audio';
            mediaMimeType = msg.message.audioMessage.mimetype;
          } else if (msg.message.videoMessage) {
            messageType = 'video';
            content = msg.message.videoMessage.caption || '';
            mediaMimeType = msg.message.videoMessage.mimetype;
          } else if (msg.message.documentMessage) {
            messageType = 'document';
            mediaFilename = msg.message.documentMessage.fileName;
            mediaMimeType = msg.message.documentMessage.mimetype;
          } else if (msg.message.stickerMessage) {
            messageType = 'sticker';
          } else if (msg.message.locationMessage) {
            messageType = 'location';
            content = JSON.stringify({
              latitude: msg.message.locationMessage.degreesLatitude,
              longitude: msg.message.locationMessage.degreesLongitude,
            });
          } else if (msg.message.contactMessage) {
            messageType = 'contact';
            content = msg.message.contactMessage.displayName;
          }

          // Find or create conversation
          let { data: conversation, error: convError } = await supabaseClient
            .from('whatsapp_conversations')
            .select('*')
            .eq('connection_id', connection.id)
            .eq('remote_jid', remoteJid)
            .single();

          if (convError || !conversation) {
            // Try to find matching lead by phone
            const { data: lead } = await supabaseClient
              .from('leads')
              .select('id')
              .eq('broker_id', connection.broker_id)
              .eq('phone', contactPhone)
              .single();

            // Create new conversation
            const { data: newConv, error: createError } = await supabaseClient
              .from('whatsapp_conversations')
              .insert({
                connection_id: connection.id,
                lead_id: lead?.id || null,
                remote_jid: remoteJid,
                contact_name: contactName,
                contact_phone: contactPhone,
                last_message: content || `[${messageType}]`,
                last_message_at: new Date().toISOString(),
                unread_count: 1,
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating conversation:', createError);
              continue;
            }
            conversation = newConv;
          } else {
            // Update existing conversation
            await supabaseClient
              .from('whatsapp_conversations')
              .update({
                contact_name: contactName,
                last_message: content || `[${messageType}]`,
                last_message_at: new Date().toISOString(),
                unread_count: conversation.unread_count + 1,
              })
              .eq('id', conversation.id);
          }

          // Insert message
          const { error: msgError } = await supabaseClient
            .from('whatsapp_messages')
            .upsert({
              conversation_id: conversation.id,
              message_id: messageId,
              direction: 'incoming',
              message_type: messageType,
              content: content,
              media_url: mediaUrl,
              media_mime_type: mediaMimeType,
              media_filename: mediaFilename,
              status: 'delivered',
              sent_at: new Date(msg.messageTimestamp * 1000).toISOString(),
            }, {
              onConflict: 'conversation_id,message_id'
            });

          if (msgError) {
            console.error('Error inserting message:', msgError);
          } else {
            console.log(`Message ${messageId} saved for conversation ${conversation.id}`);
          }
        }
        break;
      }

      case 'messages.update': {
        // Handle message status updates (delivered, read)
        const updates = data || [];
        
        for (const update of updates) {
          const messageId = update.key?.id;
          const status = update.update?.status;

          if (!messageId || !status) continue;

          let newStatus = 'sent';
          let deliveredAt = null;
          let readAt = null;

          if (status === 3) { // DELIVERY_ACK
            newStatus = 'delivered';
            deliveredAt = new Date().toISOString();
          } else if (status === 4) { // READ
            newStatus = 'read';
            readAt = new Date().toISOString();
          }

          // Find conversation by connection
          const { data: conversations } = await supabaseClient
            .from('whatsapp_conversations')
            .select('id')
            .eq('connection_id', connection.id);

          if (conversations && conversations.length > 0) {
            const conversationIds = conversations.map(c => c.id);

            await supabaseClient
              .from('whatsapp_messages')
              .update({
                status: newStatus,
                delivered_at: deliveredAt,
                read_at: readAt,
              })
              .eq('message_id', messageId)
              .in('conversation_id', conversationIds);

            console.log(`Message ${messageId} status updated to ${newStatus}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in whatsapp-webhook function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
