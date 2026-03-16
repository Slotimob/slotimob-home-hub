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
    console.log('WEBHOOK RECEIVED (500ch):', rawBody.substring(0, 500));
    
    const body = JSON.parse(rawBody);

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
    case 'messages.update':
      await handleMessagesUpdate(supabaseAdmin, instanceName, data);
      break;
    case 'messages.set':
      await handleMessagesSet(supabaseAdmin, instanceName, data);
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
  const state = data?.state || data?.instance?.state || data?.status || data?.data?.state;
  if (!state) {
    console.log('handleConnectionUpdate: sem state no payload, keys:', JSON.stringify(Object.keys(data || {})));
    return;
  }

  console.log(`Connection update: instance=${instanceName} state=${state}`);

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

// ─── MESSAGES UPDATE (read receipts) ───
async function handleMessagesUpdate(supabaseAdmin: any, instanceName: string, data: any) {
  try {
    const updates = Array.isArray(data) ? data : (data?.messages || [data]);
    
    for (const update of updates) {
      const keyId = update?.key?.id || update?.keyId;
      const status = update?.status || update?.update?.status;
      
      if (!keyId) continue;
      
      const statusNum = typeof status === 'number' ? status : parseInt(status);
      let newStatus: string | null = null;
      
      if (statusNum === 4 || statusNum === 5 || status === 'READ' || status === 'VIEWED' || status === 'read') {
        newStatus = 'read';
      } else if (statusNum === 3 || status === 'DELIVERED' || status === 'delivered') {
        newStatus = 'delivered';
      }
      
      if (!newStatus) continue;
      
      const { error } = await supabaseAdmin
        .from('whatsapp_messages')
        .update({ status: newStatus })
        .eq('message_id', keyId);
      
      if (error) console.error(`Erro update message status ${keyId}:`, error);
      else console.log(`Mensagem ${keyId} → ${newStatus}`);
    }
  } catch (e) {
    console.error('handleMessagesUpdate error:', e);
  }
}

// ─── MESSAGES SET (initial history from v2.3.7) ───
async function handleMessagesSet(supabaseAdmin: any, instanceName: string, data: any) {
  const { data: connection, error: connError } = await supabaseAdmin
    .from('whatsapp_connections')
    .select('*')
    .eq('instance_name', instanceName)
    .single();

  if (connError || !connection) {
    console.error('messages.set: Connection not found for instance:', instanceName);
    return;
  }

  const messages = Array.isArray(data) ? data : (data?.messages || []);
  console.log(`messages.set: received ${messages.length} messages for ${instanceName}`);

  const byJid: Record<string, any[]> = {};
  for (const msgData of messages) {
    const key = msgData?.key;
    if (!key?.remoteJid) continue;
    const jid = key.remoteJid;
    if (jid.endsWith('@g.us') || jid === 'status@broadcast') continue;
    if (!byJid[jid]) byJid[jid] = [];
    byJid[jid].push(msgData);
  }

  const jids = Object.keys(byJid);
  console.log(`messages.set: ${jids.length} individual conversations to process`);

  let totalProcessed = 0;

  for (const jid of jids.slice(0, 30)) {
    const jidMessages = byJid[jid]
      .sort((a: any, b: any) => {
        const tsA = parseInt(a.messageTimestamp || '0');
        const tsB = parseInt(b.messageTimestamp || '0');
        return tsA - tsB;
      })
      .slice(-15);

    for (const msgData of jidMessages) {
      try {
        await processIncomingMessage(supabaseAdmin, connection, msgData);
        totalProcessed++;
      } catch (e) {
        console.error('messages.set process error:', e);
      }
    }
  }

  console.log(`messages.set: processed ${totalProcessed} messages across ${Math.min(jids.length, 30)} conversations`);
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

  const messages = Array.isArray(data) ? data : (data?.messages ? data.messages : [data]);

  for (const msgData of messages) {
    try {
      await processIncomingMessage(supabaseAdmin, connection, msgData);
    } catch (e) {
      console.error('Erro ao processar mensagem:', e);
    }
  }
}

// ─── ROUND ROBIN: Get next agent to assign ───
async function getNextAgentRoundRobin(supabaseAdmin: any, brokerId: string): Promise<string | null> {
  try {
    // Get active team members for this broker/owner
    const { data: members, error } = await supabaseAdmin
      .from('organization_members')
      .select('user_id')
      .eq('organization_owner_id', brokerId)
      .eq('is_active', true);

    if (error || !members || members.length === 0) {
      // No team members — assign to owner
      return null;
    }

    // Prioritize agents: only include owner if no agents exist
    const agentIds = members.map((m: any) => m.user_id);
    const candidates = agentIds.length > 0 ? agentIds : [brokerId];

    // Count current assigned conversations per candidate
    const { data: convCounts } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('assigned_user_id')
      .in('assigned_user_id', candidates)
      .eq('is_archived', false);

    const countMap: Record<string, number> = {};
    candidates.forEach(c => { countMap[c] = 0; });
    (convCounts || []).forEach((c: any) => {
      if (c.assigned_user_id && countMap[c.assigned_user_id] !== undefined) {
        countMap[c.assigned_user_id]++;
      }
    });

    // Pick the candidate with fewest active conversations
    let minCount = Infinity;
    let nextAgent = candidates[0];
    for (const cid of candidates) {
      if (countMap[cid] < minCount) {
        minCount = countMap[cid];
        nextAgent = cid;
      }
    }

    console.log(`Round Robin: assigned to ${nextAgent} (${minCount} active convs, ${agentIds.length} agents available)`);
    return nextAgent;
  } catch (err) {
    console.error('Round Robin error:', err);
    return null;
  }
}

async function processIncomingMessage(supabaseAdmin: any, connection: any, msgData: any) {
  const key = msgData.key;
  if (!key) return;

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
  let mediaUrl: string | null = null;

  if (messageContent.conversation) {
    content = messageContent.conversation;
  } else if (messageContent.extendedTextMessage) {
    content = messageContent.extendedTextMessage.text || '';
  } else if (messageContent.imageMessage) {
    messageType = 'image';
    content = messageContent.imageMessage.caption || '';
    mediaMimeType = messageContent.imageMessage.mimetype || null;
    mediaUrl = messageContent.imageMessage.url || msgData.media?.url || null;
  } else if (messageContent.videoMessage) {
    messageType = 'video';
    content = messageContent.videoMessage.caption || '';
    mediaMimeType = messageContent.videoMessage.mimetype || null;
    mediaUrl = messageContent.videoMessage.url || msgData.media?.url || null;
  } else if (messageContent.audioMessage || messageContent.pttMessage) {
    const audioData = messageContent.audioMessage || messageContent.pttMessage;
    messageType = 'audio';
    mediaMimeType = audioData.mimetype || 'audio/ogg; codecs=opus';
    mediaUrl = audioData.url || msgData.media?.url || null;
  } else if (messageContent.documentMessage) {
    messageType = 'document';
    mediaFilename = messageContent.documentMessage.fileName || 'document';
    mediaMimeType = messageContent.documentMessage.mimetype || null;
    mediaUrl = messageContent.documentMessage.url || msgData.media?.url || null;
  } else if (messageContent.stickerMessage) {
    messageType = 'sticker';
    mediaUrl = messageContent.stickerMessage.url || msgData.media?.url || null;
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

  if (!mediaUrl && msgData.media?.base64) {
    const mime = mediaMimeType || 'application/octet-stream';
    mediaUrl = `data:${mime};base64,${msgData.media.base64}`;
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

  let isNewContact = false;
  // Get the agent to assign (via round robin) - computed once per new contact
  let assignedAgentId: string | null = null;

  if (existingContacts && existingContacts.length > 0) {
    contactId = existingContacts[0].id;
  } else if (direction === 'incoming') {
    // Determine agent assignment BEFORE creating contact
    assignedAgentId = await getNextAgentRoundRobin(supabaseAdmin, connection.broker_id);
    const effectiveAssignee = assignedAgentId || connection.broker_id;

    const { data: newContact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert({
        broker_id: connection.broker_id,
        name: pushName,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        categories: ['lead'],
        metadata: { origin: 'whatsapp' },
        assigned_user_id: effectiveAssignee,
      })
      .select('id')
      .single();

    if (!contactError && newContact) {
      contactId = newContact.id;
      isNewContact = true;
      console.log(`Novo contato ${contactId} para ${cleanPhone} (assigned: ${effectiveAssignee})`);

      // ─── AUTO-LEAD: Create a lead + deal assigned to the agent ───
      try {
        const { data: newLead, error: leadError } = await supabaseAdmin
          .from('leads')
          .insert({
            broker_id: connection.broker_id,
            name: pushName,
            phone: cleanPhone,
            origin: 'whatsapp',
            lead_type: 'lead',
          })
          .select('id')
          .single();

        if (!leadError && newLead) {
          const { data: newDeal, error: dealError } = await supabaseAdmin
            .from('deals')
            .insert({
              broker_id: connection.broker_id,
              lead_id: newLead.id,
              contact_id: contactId,
              stage: 'new_lead',
              notes: `Lead automático via WhatsApp (${cleanPhone})`,
              assigned_user_id: effectiveAssignee,
            })
            .select('id')
            .single();

          if (!dealError && newDeal) {
            console.log(`✅ Auto-deal ${newDeal.id} criado → agente ${effectiveAssignee}`);
            (connection as any)._autoDealId = newDeal.id;

            // ─── NOTIFICATION: Insert a notification record for the assigned agent ───
            if (effectiveAssignee !== connection.broker_id) {
              try {
                await supabaseAdmin
                  .from('notifications')
                  .insert({
                    user_id: effectiveAssignee,
                    title: 'Novo Lead via WhatsApp',
                    message: `Lead "${pushName}" (${cleanPhone}) foi atribuído a você.`,
                    type: 'whatsapp_lead',
                    metadata: { deal_id: newDeal.id, contact_id: contactId },
                  });
                console.log(`📢 Notificação enviada para agente ${effectiveAssignee}`);
              } catch (notifErr) {
                console.error('Notification insert error (non-critical):', notifErr);
              }
            }
          } else {
            console.error('Erro ao criar deal automático:', dealError);
          }
        } else {
          console.error('Erro ao criar lead automático:', leadError);
        }
      } catch (autoLeadErr) {
        console.error('Auto-lead creation error (non-critical):', autoLeadErr);
      }
    }
  }

  // Find or create conversation — MUST exist before message insert
  const messageTimestamp = msgData.messageTimestamp
    ? new Date(parseInt(msgData.messageTimestamp) * 1000).toISOString()
    : new Date().toISOString();

  // Emoji-rich media preview for sidebar when content is empty
  const mediaLabels: Record<string, string> = {
    image: '📷 Foto', audio: '🎵 Áudio', video: '🎬 Vídeo',
    document: '📎 Documento', sticker: '😀 Sticker',
    location: '📍 Localização', contact: '👤 Contato',
  };
  const contentOrLabel = content || mediaLabels[messageType] || `[${messageType}]`;
  const lastMsgPreview = direction === 'outgoing'
    ? `Você: ${contentOrLabel}`
    : contentOrLabel;

  const autoDealId = (connection as any)._autoDealId || null;

  let conversation: any = null;

  // Step 1: Try to find existing conversation
  const { data: existingConv, error: convError } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('*')
    .eq('connection_id', connection.id)
    .eq('remote_jid', remoteJid)
    .maybeSingle();

  if (convError) {
    console.error('Erro buscar conversa:', convError);
  }

  if (existingConv) {
    conversation = existingConv;
    // Update existing conversation metadata
    const resolvedContactId = contactId || conversation.contact_id;
    // Resolve contact name from DB if available
    let resolvedContactName = conversation.contact_name;
    if (resolvedContactId && resolvedContactId !== conversation.contact_id) {
      const { data: linkedContact } = await supabaseAdmin
        .from('contacts')
        .select('name')
        .eq('id', resolvedContactId)
        .maybeSingle();
      if (linkedContact?.name) {
        resolvedContactName = linkedContact.name;
      }
    }

    const updatePayload: Record<string, any> = {
      contact_id: resolvedContactId,
      lead_id: resolvedContactId || conversation.lead_id,
      last_message: lastMsgPreview,
      last_message_at: messageTimestamp,
    };
    if (direction === 'incoming') {
      updatePayload.unread_count = (conversation.unread_count || 0) + 1;
      // Prefer linked contact name > pushName > existing name > phone fallback
      updatePayload.contact_name = resolvedContactName || pushName || conversation.contact_name || senderPhone || 'Desconhecido';
      // Re-open closed conversations when customer sends a new message
      if (conversation.status === 'closed') {
        updatePayload.status = 'pending';
        updatePayload.assigned_user_id = null;
        updatePayload.assigned_at = null;
        console.log(`Conversa ${conversation.id} reaberta (era closed, agora pending)`);
      }
    }
    await supabaseAdmin
      .from('whatsapp_conversations')
      .update(updatePayload)
      .eq('id', conversation.id);
  } else {
    // Step 2: Auto-create conversation — set to 'pending' so it enters triage queue
    const isNewContactAssignment = isNewContact && assignedAgentId;
    const convStatus = isNewContactAssignment ? 'active' : 'pending';
    const effectiveAssignee = isNewContactAssignment ? assignedAgentId : null;

    // Ensure contact_name is never null — use pushName with phone fallback
    const safeContactName = pushName || senderPhone || remoteJid.split('@')[0] || 'Desconhecido';

    console.log(`Auto-criando conversa para ${remoteJid} status=${convStatus} assignee=${effectiveAssignee} name=${safeContactName}`);

    try {
      const { data: newConv, error: createError } = await supabaseAdmin
        .from('whatsapp_conversations')
        .insert({
          connection_id: connection.id,
          contact_id: contactId,
          lead_id: contactId,
          remote_jid: remoteJid,
          contact_name: safeContactName,
          contact_phone: cleanPhone,
          last_message: lastMsgPreview,
          last_message_at: messageTimestamp,
          unread_count: direction === 'incoming' ? 1 : 0,
          status: convStatus,
          assigned_user_id: effectiveAssignee,
          assigned_at: effectiveAssignee ? new Date().toISOString() : null,
          ...(autoDealId ? { deal_id: autoDealId } : {}),
        })
        .select()
        .single();

      if (createError) {
        console.error('Erro criar conversa:', createError, JSON.stringify({ remoteJid, safeContactName, cleanPhone, connectionId: connection.id }));
        return;
      }
      conversation = newConv;
      console.log(`✅ Conversa ${conversation.id} auto-criada para ${cleanPhone}`);
    } catch (convCreateErr) {
      console.error('Exception ao criar conversa:', convCreateErr);
      return;
    }
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
        media_url: mediaUrl,
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
