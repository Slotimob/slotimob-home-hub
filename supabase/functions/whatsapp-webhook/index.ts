import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET: Evolution API webhook verification (simple echo)
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
    console.log('Webhook raw body (first 500 chars):', rawBody.substring(0, 500));
    
    const body = JSON.parse(rawBody);
    const event = body.event;
    const instanceName = body.instance;
    console.log(`Evolution webhook: event=${event} instance=${instanceName} keys=${Object.keys(body).join(',')}`);

    if (!event || !instanceName) {
      console.log('Missing event or instance, ignoring');
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process in background
    processEvent(supabaseAdmin, event, instanceName, body.data).catch((err) => {
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
  // Debug: detect QR image in any event
  if (data?.qrcode || data?.base64 || data?.qrcode?.base64) {
    console.log('IMAGEM QR DETECTADA NO WEBHOOK', `event=${event}`);
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
    default:
      console.log(`Unhandled event: ${event}`);
  }
}

// ─── CONNECTION UPDATE ───
async function handleConnectionUpdate(supabaseAdmin: any, instanceName: string, data: any) {
  const state = data?.state;
  if (!state) return;

  console.log(`Connection update: instance=${instanceName} state=${state} keys=${JSON.stringify(Object.keys(data || {}))}`);

  // AGGRESSIVE QR capture: if state is "qr" OR data contains qrcode/base64 fields
  const hasQrData = state === 'qr' || data?.qrcode || data?.base64;
  if (hasQrData) {
    console.log('QR state detected inside connection.update, extracting QR...');
    const qrBase64 = data?.qrcode?.base64 || data?.base64 || data?.qrcode || null;
    if (qrBase64 && typeof qrBase64 === 'string') {
      console.log('IMAGEM QR DETECTADA NO WEBHOOK (via connection.update state=qr)');
      const { error } = await supabaseAdmin
        .from('whatsapp_connections')
        .update({
          qr_code_base64: qrBase64,
          connection_status: 'qrcode',
          status: 'pending',
        })
        .eq('instance_name', instanceName);
      if (error) console.error('Error updating QR from connection.update:', error);
      else console.log(`QR code stored for ${instanceName} via connection.update`);
    }
    return;
  }

  if (state === 'open') {
    await supabaseAdmin
      .from('whatsapp_connections')
      .update({
        status: 'connected',
        connection_status: 'open',
        qr_code_base64: null,
        connected_at: new Date().toISOString(),
      })
      .eq('instance_name', instanceName);
    console.log(`Instance ${instanceName} marked as connected`);
  } else if (state === 'close') {
    await supabaseAdmin
      .from('whatsapp_connections')
      .update({
        status: 'disconnected',
        connection_status: 'close',
        qr_code_base64: null,
      })
      .eq('instance_name', instanceName);
    console.log(`Instance ${instanceName} marked as disconnected`);
  } else if (state === 'connecting') {
    await supabaseAdmin
      .from('whatsapp_connections')
      .update({ connection_status: 'connecting' })
      .eq('instance_name', instanceName);
  }
}

// ─── QR CODE UPDATE ───
async function handleQrCodeUpdate(supabaseAdmin: any, instanceName: string, data: any) {
  console.log('QR code event data:', JSON.stringify(data));
  
  // Try multiple extraction paths
  const qrBase64 = data?.qrcode?.base64 || data?.base64 || data?.qrcode || null;
  
  if (!qrBase64 || typeof qrBase64 !== 'string') {
    console.log('No valid QR base64 string in payload, got:', typeof qrBase64);
    return;
  }

  console.log(`QR code received for instance=${instanceName}`);

  const { error } = await supabaseAdmin
    .from('whatsapp_connections')
    .update({
      qr_code_base64: qrBase64,
      connection_status: 'qrcode',
      status: 'pending',
    })
    .eq('instance_name', instanceName);

  if (error) {
    console.error('Error updating QR code:', error);
  } else {
    console.log(`QR code stored for ${instanceName}`);
  }
}

// ─── MESSAGES UPSERT ───
async function handleMessagesUpsert(supabaseAdmin: any, instanceName: string, data: any) {
  // Find connection by instance_name
  const { data: connection, error: connError } = await supabaseAdmin
    .from('whatsapp_connections')
    .select('*')
    .eq('instance_name', instanceName)
    .single();

  if (connError || !connection) {
    console.error('Connection not found for instance:', instanceName);
    return;
  }

  // data can be an array of messages or a single message
  const messages = Array.isArray(data) ? data : [data];

  for (const msgData of messages) {
    await processIncomingMessage(supabaseAdmin, connection, msgData);
  }
}

async function processIncomingMessage(supabaseAdmin: any, connection: any, msgData: any) {
  const key = msgData.key;
  if (!key) return;

  // Skip outgoing messages
  if (key.fromMe) return;

  const remoteJid = key.remoteJid;
  const waMessageId = key.id;
  if (!remoteJid || !waMessageId) return;

  // Extract phone number from JID
  const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  const isGroup = remoteJid.endsWith('@g.us');
  if (isGroup) return; // Skip group messages for now

  const pushName = msgData.pushName || senderPhone;
  const messageContent = msgData.message;
  if (!messageContent) return;

  // Determine message type and content
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

  // ── Find or create Contact in CRM ──
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
  } else {
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
      console.log(`Created new contact ${contactId} for ${cleanPhone}`);
    }
  }

  // ── Find or create Conversation ──
  let { data: conversation, error: convError } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('*')
    .eq('connection_id', connection.id)
    .eq('remote_jid', remoteJid)
    .single();

  const messageTimestamp = msgData.messageTimestamp
    ? new Date(parseInt(msgData.messageTimestamp) * 1000).toISOString()
    : new Date().toISOString();

  if (convError || !conversation) {
    const { data: newConv, error: createError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .insert({
        connection_id: connection.id,
        contact_id: contactId,
        remote_jid: remoteJid,
        contact_name: pushName,
        contact_phone: cleanPhone,
        last_message: content || `[${messageType}]`,
        last_message_at: messageTimestamp,
        unread_count: 1,
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      return;
    }
    conversation = newConv;
  } else {
    await supabaseAdmin
      .from('whatsapp_conversations')
      .update({
        contact_name: pushName,
        contact_id: contactId || conversation.contact_id,
        last_message: content || `[${messageType}]`,
        last_message_at: messageTimestamp,
        unread_count: (conversation.unread_count || 0) + 1,
      })
      .eq('id', conversation.id);
  }

  // ── Insert Message ──
  const { error: msgError } = await supabaseAdmin
    .from('whatsapp_messages')
    .upsert(
      {
        conversation_id: conversation.id,
        message_id: waMessageId,
        direction: 'incoming',
        message_type: messageType,
        content: content,
        media_url: null,
        media_mime_type: mediaMimeType,
        media_filename: mediaFilename,
        status: 'delivered',
        sent_at: messageTimestamp,
      },
      { onConflict: 'conversation_id,message_id' }
    );

  if (msgError) {
    console.error('Error inserting message:', msgError);
  } else {
    console.log(`Message ${waMessageId} saved for conversation ${conversation.id}`);
  }
}
