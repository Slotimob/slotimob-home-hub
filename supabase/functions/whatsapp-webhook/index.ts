import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeEventName(event: string): string {
  return event.toLowerCase().replace(/_/g, '.');
}

function extractQrBase64(data: any): string | null {
  const candidates = [
    data?.base64,
    data?.qrcode?.base64,
    typeof data?.qrcode === 'string' ? data.qrcode : null,
    data?.data?.base64,
    data?.data?.qrcode?.base64,
    typeof data?.data?.qrcode === 'string' ? data.data.qrcode : null,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.length > 100) return c;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response('OK', { status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const rawBody = await req.text();
    console.log('Webhook raw (500ch):', rawBody.substring(0, 500));
    
    const body = JSON.parse(rawBody);

    // Evolution v2.3.7 pode enviar event no top-level ou em data
    const rawEvent = body.event;
    const instanceName = body.instance || body.data?.instance;
    const event = rawEvent ? normalizeEventName(rawEvent) : null;
    const eventData = body.data || body;

    console.log(`Webhook: rawEvent=${rawEvent} normalized=${event} instance=${instanceName}`);

    if (!event || !instanceName) {
      console.log('Missing event or instance, ignoring');
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process in background to respond quickly to Evolution
    processEvent(supabaseAdmin, event, instanceName, eventData).catch((err) => {
      console.error('Background processing error:', err);
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processEvent(supabaseAdmin: any, event: string, instanceName: string, data: any) {
  // Detect QR in any event
  const anyQr = extractQrBase64(data);
  if (anyQr) {
    console.log(`QR DETECTADO event=${event} instance=${instanceName}`);
  }

  switch (event) {
    case 'connection.update':
      await handleConnectionUpdate(supabaseAdmin, instanceName, data);
      break;
    case 'qrcode.updated':
      await handleQrCodeUpdate(supabaseAdmin, instanceName, data);
      break;
    case 'messages.upsert':
      await handleMessagesUpsert(supabaseAdmin, instanceName, data);
      break;
    case 'send.message':
      console.log('send.message event received (outgoing message confirmation)');
      await handleSendMessage(supabaseAdmin, instanceName, data);
      break;
    case 'instance.created':
      console.log('instance.created event, checking for QR...');
      await handleQrCodeUpdate(supabaseAdmin, instanceName, data);
      break;
    default:
      console.log(`Unhandled event: ${event}`);
  }
}

// ─── CONNECTION UPDATE ───
async function handleConnectionUpdate(supabaseAdmin: any, instanceName: string, data: any) {
  // Extração à prova de balas — Evolution v2.3.7 envia em formatos variados
  const state = data?.state || data?.instance?.state || data?.status || data?.data?.state;
  if (!state) {
    console.log('handleConnectionUpdate: sem state no payload, keys:', JSON.stringify(Object.keys(data || {})));
    return;
  }

  console.log(`Connection update: instance=${instanceName} state=${state}`);

  // Check for QR data in non-open states
  if (state !== 'open') {
    const qrBase64 = extractQrBase64(data);
    if (qrBase64) {
      console.log(`QR capturado via connection.update state=${state}`);
      const { error } = await supabaseAdmin
        .from('whatsapp_connections')
        .update({
          qr_code_base64: qrBase64,
          connection_status: 'qrcode',
          status: 'pending',
        })
        .eq('instance_name', instanceName);
      if (error) console.error('Erro update QR:', error);
      return;
    }
  }

  if (state === 'open' || state === 'connected') {
    const { error } = await supabaseAdmin
      .from('whatsapp_connections')
      .update({
        status: 'connected',
        connection_status: 'open',
        qr_code_base64: null,
        connected_at: new Date().toISOString(),
      })
      .eq('instance_name', instanceName);
    if (error) console.error('Erro update open:', error);
    else console.log(`✅ ${instanceName} → connected`);
  } else if (state === 'close') {
    const { error } = await supabaseAdmin
      .from('whatsapp_connections')
      .update({
        status: 'disconnected',
        connection_status: 'close',
        qr_code_base64: null,
      })
      .eq('instance_name', instanceName);
    if (error) console.error('Erro update close:', error);
    else console.log(`${instanceName} → disconnected`);
  } else if (state === 'connecting') {
    await supabaseAdmin
      .from('whatsapp_connections')
      .update({ connection_status: 'connecting' })
      .eq('instance_name', instanceName);
  }
}

// ─── QR CODE UPDATE ───
async function handleQrCodeUpdate(supabaseAdmin: any, instanceName: string, data: any) {
  const qrBase64 = extractQrBase64(data);
  
  if (!qrBase64) {
    console.log('No valid QR base64 in payload');
    return;
  }

  console.log(`QR code recebido para ${instanceName}`);

  const { error } = await supabaseAdmin
    .from('whatsapp_connections')
    .update({
      qr_code_base64: qrBase64,
      connection_status: 'qrcode',
      status: 'pending',
    })
    .eq('instance_name', instanceName);

  if (error) console.error('Erro update QR:', error);
  else console.log(`QR armazenado para ${instanceName}`);
}

// ─── SEND MESSAGE (outgoing confirmation) ───
async function handleSendMessage(supabaseAdmin: any, instanceName: string, data: any) {
  try {
    const key = data?.key;
    const waMessageId = key?.id;
    if (!waMessageId) return;

    // Update message status to 'delivered' if we have a record
    const { error } = await supabaseAdmin
      .from('whatsapp_messages')
      .update({ status: 'delivered' })
      .eq('message_id', waMessageId);

    if (error) console.error('Erro update send status:', error);
    else console.log(`Mensagem ${waMessageId} confirmada como enviada`);
  } catch (e) {
    console.error('handleSendMessage error:', e);
  }
}

// ─── MESSAGES UPSERT ───
async function handleMessagesUpsert(supabaseAdmin: any, instanceName: string, data: any) {
  const { data: connection, error: connError } = await supabaseAdmin
    .from('whatsapp_connections')
    .select('*')
    .eq('instance_name', instanceName)
    .single();

  if (connError || !connection) {
    console.error('Connection not found for instance:', instanceName);
    return;
  }

  // v2.3.7 pode enviar array ou objeto
  const messages = Array.isArray(data) ? data : (data?.messages ? data.messages : [data]);

  for (const msgData of messages) {
    try {
      await processIncomingMessage(supabaseAdmin, connection, msgData);
    } catch (e) {
      console.error('Erro ao processar mensagem:', e);
    }
  }
}

async function processIncomingMessage(supabaseAdmin: any, connection: any, msgData: any) {
  const key = msgData.key;
  if (!key) return;

  // Determine direction — NEVER skip fromMe messages
  const direction = key.fromMe ? 'outgoing' : 'incoming';
  const msgStatus = key.fromMe ? 'sent' : 'delivered';

  const remoteJid = key.remoteJid;
  const waMessageId = key.id;
  if (!remoteJid || !waMessageId) return;

  const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  const isGroup = remoteJid.endsWith('@g.us');
  if (isGroup) return;

  const pushName = msgData.pushName || senderPhone;
  const messageContent = msgData.message;
  if (!messageContent) return;

  let messageType = 'text';
  let content = '';
  let mediaMimeType: string | null = null;
  let mediaFilename: string | null = null;

  if (messageContent.conversation) {
    content = messageContent.conversation;
  } else if (messageContent.extendedTextMessage) {
    content = messageContent.extendedTextMessage.text || '';
  } else if (messageContent.imageMessage) {
    messageType = 'image';
    content = messageContent.imageMessage.caption || '';
    mediaMimeType = messageContent.imageMessage.mimetype || null;
  } else if (messageContent.videoMessage) {
    messageType = 'video';
    content = messageContent.videoMessage.caption || '';
    mediaMimeType = messageContent.videoMessage.mimetype || null;
  } else if (messageContent.audioMessage) {
    messageType = 'audio';
    mediaMimeType = messageContent.audioMessage.mimetype || null;
  } else if (messageContent.documentMessage) {
    messageType = 'document';
    mediaFilename = messageContent.documentMessage.fileName || 'document';
    mediaMimeType = messageContent.documentMessage.mimetype || null;
  } else if (messageContent.stickerMessage) {
    messageType = 'sticker';
  } else if (messageContent.locationMessage) {
    messageType = 'location';
    content = JSON.stringify({
      latitude: messageContent.locationMessage.degreesLatitude,
      longitude: messageContent.locationMessage.degreesLongitude,
    });
  } else if (messageContent.contactMessage) {
    messageType = 'contact';
    content = messageContent.contactMessage.displayName || '';
  } else {
    messageType = 'unknown';
    content = JSON.stringify(messageContent);
  }

  // Find or create contact
  let contactId: string | null = null;
  const cleanPhone = senderPhone.replace(/\D/g, '');

  const { data: existingContacts } = await supabaseAdmin
    .from('contacts')
    .select('id')
    .eq('broker_id', connection.broker_id)
    .or(`phone.eq.${cleanPhone},whatsapp.eq.${cleanPhone},phone.eq.+${cleanPhone},whatsapp.eq.+${cleanPhone}`)
    .limit(1);

  if (existingContacts && existingContacts.length > 0) {
    contactId = existingContacts[0].id;
  } else if (direction === 'incoming') {
    // Only auto-create contacts for incoming messages
    const { data: newContact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert({
        broker_id: connection.broker_id,
        name: pushName,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        categories: ['lead'],
        metadata: { origin: 'whatsapp' },
      })
      .select('id')
      .single();

    if (!contactError && newContact) {
      contactId = newContact.id;
      console.log(`Novo contato ${contactId} para ${cleanPhone}`);
    }
  }

  // Find or create conversation
  let { data: conversation, error: convError } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('*')
    .eq('connection_id', connection.id)
    .eq('remote_jid', remoteJid)
    .single();

  const messageTimestamp = msgData.messageTimestamp
    ? new Date(parseInt(msgData.messageTimestamp) * 1000).toISOString()
    : new Date().toISOString();

  const lastMsgPreview = content || `[${messageType}]`;

  if (convError || !conversation) {
    const { data: newConv, error: createError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .insert({
        connection_id: connection.id,
        contact_id: contactId,
        remote_jid: remoteJid,
        contact_name: pushName,
        contact_phone: cleanPhone,
        last_message: lastMsgPreview,
        last_message_at: messageTimestamp,
        unread_count: direction === 'incoming' ? 1 : 0,
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('Erro criar conversa:', createError);
      return;
    }
    conversation = newConv;
  } else {
    const updatePayload: Record<string, any> = {
      contact_id: contactId || conversation.contact_id,
      last_message: lastMsgPreview,
      last_message_at: messageTimestamp,
    };
    // Only increment unread for incoming messages
    if (direction === 'incoming') {
      updatePayload.unread_count = (conversation.unread_count || 0) + 1;
    }
    if (direction === 'incoming') {
      updatePayload.contact_name = pushName;
    }
    await supabaseAdmin
      .from('whatsapp_conversations')
      .update(updatePayload)
      .eq('id', conversation.id);
  }

  // Upsert message (dedup by conversation_id + message_id)
  const { error: msgError } = await supabaseAdmin
    .from('whatsapp_messages')
    .upsert(
      {
        conversation_id: conversation.id,
        message_id: waMessageId,
        direction: direction,
        message_type: messageType,
        content: content,
        media_url: null,
        media_mime_type: mediaMimeType,
        media_filename: mediaFilename,
        status: msgStatus,
        sent_at: messageTimestamp,
      },
      { onConflict: 'conversation_id,message_id' }
    );

  if (msgError) {
    console.error('Erro upsert mensagem:', msgError);
  } else {
    console.log(`Mensagem ${waMessageId} [${direction}] salva (conversa ${conversation.id})`);
  }
}
