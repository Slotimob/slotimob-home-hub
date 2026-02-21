import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // ─── GET: Meta Webhook Verification ───
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    }

    console.error('Webhook verification failed');
    return new Response('Forbidden', { status: 403 });
  }

  // ─── POST: Receive Messages from Meta ───
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Return 200 immediately per Meta requirements, process async
  try {
    const body = await req.json();
    console.log('Meta webhook payload:', JSON.stringify(body));

    // Process in background - don't block the 200 response
    processWebhook(supabaseAdmin, body).catch((err) => {
      console.error('Background processing error:', err);
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Meta from disabling the webhook
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processWebhook(supabaseAdmin: any, body: any) {
  const entry = body?.entry?.[0];
  if (!entry) return;

  const changes = entry.changes?.[0];
  if (!changes || changes.field !== 'messages') return;

  const value = changes.value;
  if (!value) return;

  const phoneNumberId = value.metadata?.phone_number_id;
  if (!phoneNumberId) {
    console.error('No phone_number_id in webhook payload');
    return;
  }

  // Find the connection by phone_number_id
  const { data: connection, error: connError } = await supabaseAdmin
    .from('whatsapp_connections')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .eq('api_provider', 'meta')
    .single();

  if (connError || !connection) {
    console.error('Connection not found for phone_number_id:', phoneNumberId);
    return;
  }

  // Process status updates
  const statuses = value.statuses || [];
  for (const status of statuses) {
    await processStatusUpdate(supabaseAdmin, connection, status);
  }

  // Process incoming messages
  const messages = value.messages || [];
  const contacts = value.contacts || [];

  for (const msg of messages) {
    await processIncomingMessage(supabaseAdmin, connection, msg, contacts);
  }
}

async function processStatusUpdate(supabaseAdmin: any, connection: any, status: any) {
  const messageId = status.id;
  const statusValue = status.status; // sent, delivered, read, failed

  if (!messageId || !statusValue) return;

  const updateData: Record<string, any> = { status: statusValue };
  if (statusValue === 'delivered') updateData.delivered_at = new Date().toISOString();
  if (statusValue === 'read') {
    updateData.delivered_at = updateData.delivered_at || new Date().toISOString();
    updateData.read_at = new Date().toISOString();
  }

  // Find conversations for this connection
  const { data: conversations } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('id')
    .eq('connection_id', connection.id);

  if (conversations && conversations.length > 0) {
    const conversationIds = conversations.map((c: any) => c.id);
    await supabaseAdmin
      .from('whatsapp_messages')
      .update(updateData)
      .eq('message_id', messageId)
      .in('conversation_id', conversationIds);

    console.log(`Message ${messageId} status updated to ${statusValue}`);
  }
}

async function processIncomingMessage(
  supabaseAdmin: any,
  connection: any,
  msg: any,
  contacts: any[]
) {
  const senderPhone = msg.from;
  const waMessageId = msg.id;
  const timestamp = msg.timestamp;
  if (!senderPhone || !waMessageId) return;

  // Get sender profile name from contacts array
  const contactProfile = contacts.find((c: any) => c.wa_id === senderPhone);
  const senderName = contactProfile?.profile?.name || senderPhone;

  // Determine message type and content
  let messageType = 'text';
  let content = '';
  let mediaUrl: string | null = null;
  let mediaMimeType: string | null = null;
  let mediaFilename: string | null = null;

  if (msg.type === 'text') {
    content = msg.text?.body || '';
  } else if (msg.type === 'image') {
    messageType = 'image';
    content = msg.image?.caption || '';
    mediaMimeType = msg.image?.mime_type || null;
  } else if (msg.type === 'video') {
    messageType = 'video';
    content = msg.video?.caption || '';
    mediaMimeType = msg.video?.mime_type || null;
  } else if (msg.type === 'audio') {
    messageType = 'audio';
    mediaMimeType = msg.audio?.mime_type || null;
  } else if (msg.type === 'document') {
    messageType = 'document';
    mediaFilename = msg.document?.filename || 'document';
    mediaMimeType = msg.document?.mime_type || null;
  } else if (msg.type === 'sticker') {
    messageType = 'sticker';
  } else if (msg.type === 'location') {
    messageType = 'location';
    content = JSON.stringify({
      latitude: msg.location?.latitude,
      longitude: msg.location?.longitude,
    });
  } else if (msg.type === 'contacts') {
    messageType = 'contact';
    content = msg.contacts?.[0]?.name?.formatted_name || '';
  } else {
    // Unknown type, store as-is
    messageType = msg.type || 'unknown';
    content = JSON.stringify(msg[msg.type] || {});
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
    // Create new contact
    const { data: newContact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert({
        broker_id: connection.broker_id,
        name: senderName,
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
  const remoteJid = `${senderPhone}@s.whatsapp.net`;

  let { data: conversation, error: convError } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('*')
    .eq('connection_id', connection.id)
    .eq('remote_jid', remoteJid)
    .single();

  if (convError || !conversation) {
    const { data: newConv, error: createError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .insert({
        connection_id: connection.id,
        contact_id: contactId,
        remote_jid: remoteJid,
        contact_name: senderName,
        contact_phone: cleanPhone,
        last_message: content || `[${messageType}]`,
        last_message_at: new Date(parseInt(timestamp) * 1000).toISOString(),
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
    // Update existing conversation
    await supabaseAdmin
      .from('whatsapp_conversations')
      .update({
        contact_name: senderName,
        contact_id: contactId || conversation.contact_id,
        last_message: content || `[${messageType}]`,
        last_message_at: new Date(parseInt(timestamp) * 1000).toISOString(),
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
        media_url: mediaUrl,
        media_mime_type: mediaMimeType,
        media_filename: mediaFilename,
        status: 'delivered',
        sent_at: new Date(parseInt(timestamp) * 1000).toISOString(),
      },
      { onConflict: 'conversation_id,message_id' }
    );

  if (msgError) {
    console.error('Error inserting message:', msgError);
  } else {
    console.log(`Message ${waMessageId} saved for conversation ${conversation.id}`);
  }
}
