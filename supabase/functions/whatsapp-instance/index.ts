import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Force-delete instance from Evolution API (ignore errors if not found)
async function forceDeleteInstance(evolutionApiUrl: string, evolutionApiKey: string, instanceName: string) {
  console.log(`forceDelete: Limpeza profunda para ${instanceName}...`);
  try {
    await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': evolutionApiKey },
    });
  } catch (_e) { /* ignore */ }
  try {
    await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': evolutionApiKey },
    });
  } catch (_e) { /* ignore */ }
  console.log('forceDelete: Cool-down 4s...');
  await new Promise(resolve => setTimeout(resolve, 4000));
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const evolutionApiUrl = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/$/, '');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(JSON.stringify({ error: 'WhatsApp integration not configured. Admin must set EVOLUTION_API_URL and EVOLUTION_API_KEY secrets.' }), {
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

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { action } = body;
    console.log(`whatsapp-instance action=${action} user=${userId}`);

    // ─── CREATE INSTANCE ───
    if (action === 'create') {
      const webhookUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/whatsapp-webhook`;

      // Step 1: Limpeza prévia
      const { data: oldConn } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('instance_name')
        .eq('broker_id', userId)
        .maybeSingle();

      if (oldConn?.instance_name) {
        console.log(`Limpando instância antiga: ${oldConn.instance_name}`);
        await forceDeleteInstance(evolutionApiUrl, evolutionApiKey, oldConn.instance_name);
      }
      await supabaseAdmin.from('whatsapp_connections').delete().eq('broker_id', userId);

      // Step 2: Nome dinâmico
      const instanceName = `slotimob_${userId.replace(/-/g, '').slice(0, 8)}_${Date.now().toString(36)}`;

      // Step 3: Criar instância (payload v2.3.7)
      const createPayload = {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      };

      console.log('Criando instância na Evolution API v2.3.7...');
      const createRes = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify(createPayload),
      });

      const createData = await createRes.json();
      console.log('Create response status:', createRes.status, 'keys:', Object.keys(createData));
      let finalQrCode = extractQrBase64(createData);

      // Step 4: Registrar webhook via /webhook/set/{instanceName} (requisição SEPARADA)
      try {
        const webhookSetPayload = {
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: true,
            events: [
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'MESSAGES_SET',
              'SEND_MESSAGE',
            ],
          },
        };

        console.log(`Registrando webhook em ${evolutionApiUrl}/webhook/set/${instanceName}`, JSON.stringify(webhookSetPayload));
        const webhookRes = await fetch(`${evolutionApiUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
          body: JSON.stringify(webhookSetPayload),
        });
        const webhookText = await webhookRes.text();
        console.log('Webhook set response:', webhookRes.status, webhookText.slice(0, 500));
        if (!webhookRes.ok) {
          console.error(`❌ Webhook set FAILED (${webhookRes.status}): ${webhookText}`);
        }
      } catch (e) {
        console.error('Erro ao registrar webhook (não-bloqueante):', e.message);
      }

      // Step 5: Polling — tentar até 5x com delay de 5s
      if (!finalQrCode) {
        console.log('⚠️ QR Code não veio na criação. Polling (máx 5x, 5s delay)...');

        for (let attempt = 1; attempt <= 5; attempt++) {
          console.log(`⏳ Polling tentativa ${attempt}/5 — aguardando 5s...`);
          await new Promise(r => setTimeout(r, 5000));

          try {
            const connectRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey },
            });
            const connectData = await connectRes.json();
            console.log(`Polling ${attempt}/5 status: ${connectRes.status}`);
            finalQrCode = extractQrBase64(connectData);

            if (finalQrCode) {
              console.log(`✅ QR Code capturado na tentativa ${attempt}/5!`);
              break;
            }
          } catch (e) {
            console.log(`Polling ${attempt}/5 erro: ${e.message}`);
          }
        }
      } else {
        console.log('✅ QR Code capturado na resposta inicial!');
      }

      if (!finalQrCode) {
        console.error('❌ Falha ao obter QR Code após 5 tentativas. O webhook será a última esperança.');
      }

      // Step 6: Salvar no DB
      const dbPayload = {
        broker_id: userId,
        instance_name: instanceName,
        status: 'pending',
        connection_status: finalQrCode ? 'qrcode' : 'preparing',
        qr_code_base64: finalQrCode,
        connected_at: null,
      };

      const { data: conn, error: dbError } = await supabaseAdmin
        .from('whatsapp_connections')
        .insert(dbPayload)
        .select()
        .single();

      if (dbError) {
        return new Response(JSON.stringify({ error: dbError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        connection: conn,
        connection_status: dbPayload.connection_status,
        message: 'Instância criada com sucesso.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── REFRESH QR CODE ───
    if (action === 'refresh_qr') {
      const { data: conn } = await supabaseClient
        .from('whatsapp_connections')
        .select('instance_name')
        .eq('broker_id', userId)
        .single();

      if (!conn?.instance_name) {
        return new Response(JSON.stringify({ error: 'No instance found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const connectRes = await fetch(`${evolutionApiUrl}/instance/connect/${conn.instance_name}`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey },
      });
      const connectData = await connectRes.json();
      console.log('Refresh QR response:', JSON.stringify(connectData).slice(0, 300));
      const qrBase64 = extractQrBase64(connectData);

      if (qrBase64) {
        await supabaseAdmin
          .from('whatsapp_connections')
          .update({ qr_code_base64: qrBase64, connection_status: 'qrcode' })
          .eq('broker_id', userId);
      }

      return new Response(JSON.stringify({ success: true, qrCode: qrBase64 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── STATUS ───
    if (action === 'status') {
      const { data: conn } = await supabaseClient
        .from('whatsapp_connections')
        .select('instance_name, status, connection_status')
        .eq('broker_id', userId)
        .single();

      if (!conn?.instance_name) {
        return new Response(JSON.stringify({ error: 'No instance found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const statusRes = await fetch(`${evolutionApiUrl}/instance/connectionState/${conn.instance_name}`, {
        method: 'GET',
        headers: { 'apikey': evolutionApiKey },
      });
      const statusData = await statusRes.json();
      const apiState = statusData?.instance?.state || statusData?.state;
      console.log(`Status check: apiState=${apiState} dbStatus=${conn.status}`);

      // Se a API diz "open" mas o DB ainda não reflete, sincronizar agora
      if ((apiState === 'open' || apiState === 'connected') && conn.status !== 'connected') {
        console.log('Sincronizando DB: marcando como connected');
        await supabaseAdmin
          .from('whatsapp_connections')
          .update({
            status: 'connected',
            connection_status: 'open',
            qr_code_base64: null,
            connected_at: new Date().toISOString(),
          })
          .eq('broker_id', userId);
      }

      return new Response(JSON.stringify({ success: true, state: apiState, dbStatus: conn.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── DISCONNECT / DELETE ───
    if (action === 'disconnect') {
      const { data: conn } = await supabaseClient
        .from('whatsapp_connections')
        .select('instance_name')
        .eq('broker_id', userId)
        .single();

      if (conn?.instance_name) {
        await forceDeleteInstance(evolutionApiUrl, evolutionApiKey, conn.instance_name);
      }

      await supabaseAdmin
        .from('whatsapp_connections')
        .update({ status: 'disconnected', connection_status: 'disconnected', qr_code_base64: null, connected_at: null })
        .eq('broker_id', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── SYNC RECENT ───
    if (action === 'sync_recent') {
      const { data: conn } = await supabaseClient
        .from('whatsapp_connections')
        .select('instance_name')
        .eq('broker_id', userId)
        .single();

      if (!conn?.instance_name) {
        return new Response(JSON.stringify({ error: 'No instance found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        // Fetch recent chats from Evolution API
        const chatsRes = await fetch(`${evolutionApiUrl}/chat/findChats/${conn.instance_name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
          body: JSON.stringify({ where: { id: { not: null } } }),
        });
        const chats = await chatsRes.json();
        console.log(`sync_recent: ${Array.isArray(chats) ? chats.length : 0} chats found`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: `${Array.isArray(chats) ? chats.length : 0} conversas sincronizadas.`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error('sync_recent error:', e);
        return new Response(JSON.stringify({ error: 'Sync failed' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ─── SYNC HISTORY (Async Background Job) ───
    if (action === 'sync_history') {
      const { data: conn } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('*')
        .eq('broker_id', userId)
        .single();

      if (!conn?.instance_name) {
        return new Response(JSON.stringify({ error: 'No instance found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if there's already a processing job
      const { data: existingJob } = await supabaseAdmin
        .from('whatsapp_sync_jobs')
        .select('id')
        .eq('broker_id', userId)
        .eq('status', 'processing')
        .maybeSingle();

      if (existingJob) {
        return new Response(JSON.stringify({ error: 'Já existe uma sincronização em andamento.', job_id: existingJob.id }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create the job record
      const { data: job, error: jobErr } = await supabaseAdmin
        .from('whatsapp_sync_jobs')
        .insert({ broker_id: userId, status: 'processing' })
        .select('id')
        .single();

      if (jobErr || !job) {
        return new Response(JSON.stringify({ error: 'Failed to create sync job' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const jobId = job.id;

      // Background processing function
      const processSync = async () => {
        try {
          // PHASE 0: Force webhook registration for legacy instances
          const webhookUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/whatsapp-webhook`;
          try {
            const webhookSetPayload = {
              webhook: {
                enabled: true,
                url: webhookUrl,
                byEvents: false,
                base64: true,
                events: [
                  'MESSAGES_UPSERT',
                  'MESSAGES_UPDATE',
                  'SEND_MESSAGE',
                ],
              },
            };
            console.log(`sync_history: Force-registering webhook for ${conn.instance_name}`, JSON.stringify(webhookSetPayload));
            const wRes = await fetch(`${evolutionApiUrl}/webhook/set/${conn.instance_name}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
              body: JSON.stringify(webhookSetPayload),
            });
            const wText = await wRes.text();
            console.log(`sync_history: Webhook registration status=${wRes.status} body=${wText.slice(0, 500)}`);
            if (!wRes.ok) {
              console.error(`sync_history: ❌ Webhook set FAILED: ${wText}`);
            }
          } catch (wErr) {
            console.error('sync_history: Webhook registration failed (non-blocking):', wErr.message);
          }

          // Try multiple Evolution API endpoints/methods to fetch chats
          const fetchUrl = `${evolutionApiUrl}/chat/findChats/${conn.instance_name}`;
          console.log(`sync_history: Fetching chats from: ${fetchUrl}`);

          let chatsRes = await fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
            body: JSON.stringify({}),
          });

          // If POST with empty body fails, try GET
          if (!chatsRes.ok) {
            const errText = await chatsRes.text();
            console.log(`sync_history: POST returned ${chatsRes.status}: ${errText.slice(0, 300)}. Trying GET...`);
            chatsRes = await fetch(fetchUrl, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey },
            });
          }

          if (!chatsRes.ok) {
            const errText = await chatsRes.text();
            console.error(`sync_history: Evolution API error ${chatsRes.status}: ${errText.slice(0, 500)}`);
            throw new Error(`Evolution API returned ${chatsRes.status}`);
          }

          const rawData = await chatsRes.json();
          
          // Robust extraction: handle array, .data, .chats, or wrapped formats
          const chatList = Array.isArray(rawData) 
            ? rawData 
            : Array.isArray(rawData?.data) 
              ? rawData.data 
              : Array.isArray(rawData?.chats) 
                ? rawData.chats 
                : [];

          console.log(`sync_history: Raw response type=${typeof rawData}, isArray=${Array.isArray(rawData)}, keys=${rawData && typeof rawData === 'object' ? Object.keys(rawData).slice(0, 10).join(',') : 'N/A'}, extracted=${chatList.length} items`);
          if (chatList.length > 0) {
            console.log(`sync_history: First chat sample: ${JSON.stringify(chatList[0]).slice(0, 500)}`);
          } else {
            console.log(`sync_history: Raw data sample: ${JSON.stringify(rawData).slice(0, 500)}`);
          }

          const personalChats = chatList.filter((chat: any) => {
            const jid = chat.remoteJid || chat.id || '';
            return jid.endsWith('@s.whatsapp.net') && jid !== 'status@broadcast';
          });
          console.log(`sync_history: ${chatList.length} total chats -> ${personalChats.length} personal chats after filter`);

          // Update total count
          await supabaseAdmin.from('whatsapp_sync_jobs').update({ total_chats: personalChats.length }).eq('id', jobId);

          const BATCH_SIZE = 50;
          let processed = 0;

          // PHASE 1: Bulk upsert conversations in batches
          const conversationRows: any[] = personalChats.map((chat: any) => {
            const remoteJid = chat.remoteJid || chat.id;
            const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
            const name = chat.pushName || chat.name || chat.contact?.name || chat.contact || phone;
            const unreadCount = chat.unreadCount ?? chat.unread_count ?? chat.unreadMessages ?? 0;
            const profilePicUrl = chat.profilePictureUrl || chat.profilePicUrl || chat.profilePicture || null;
            return {
              connection_id: conn.id,
              remote_jid: remoteJid,
              contact_name: name,
              contact_phone: phone,
              contact_profile_pic: profilePicUrl,
              last_message: chat.lastMessage?.content || chat.lastMessage?.message?.conversation || null,
              last_message_at: chat.updatedAt ? new Date(chat.updatedAt).toISOString() : new Date().toISOString(),
              unread_count: unreadCount,
              status: unreadCount > 0 ? 'pending' : 'closed',
            };
          });

          for (let i = 0; i < conversationRows.length; i += BATCH_SIZE) {
            const batch = conversationRows.slice(i, i + BATCH_SIZE);
            const { error: upsertErr } = await supabaseAdmin
              .from('whatsapp_conversations')
              .upsert(batch, { onConflict: 'connection_id,remote_jid' });

            if (upsertErr) {
              console.error(`sync_history batch error (offset ${i}):`, upsertErr.message);
            }

            processed = Math.min(i + BATCH_SIZE, conversationRows.length);
            // Update progress — triggers Realtime event
            await supabaseAdmin.from('whatsapp_sync_jobs').update({ processed_chats: processed }).eq('id', jobId);
          }

          // PHASE 2: Link contacts (best effort)
          for (const chat of personalChats) {
            try {
              const remoteJid = chat.remoteJid || chat.id;
              const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
              const name = chat.pushName || chat.name || chat.contact?.name || chat.contact || phone;
              const profilePicUrl = chat.profilePictureUrl || chat.profilePicUrl || chat.profilePicture || null;

              // Flexible phone matching (last 8-9 digits)
              const last9 = phone.slice(-9);
              const last8 = phone.slice(-8);
              const { data: existingContacts } = await supabaseAdmin
                .from('contacts')
                .select('id, avatar_url, phone, whatsapp')
                .eq('broker_id', userId)
                .or(`phone.eq.${phone},whatsapp.eq.${phone},phone.eq.+${phone},whatsapp.eq.+${phone},phone.like.%${last9},whatsapp.like.%${last9},phone.like.%${last8},whatsapp.like.%${last8}`)
                .limit(5);

              let contactId: string | null = null;
              if (existingContacts && existingContacts.length > 0) {
                // Prefer exact match
                const exactMatch = existingContacts.find(
                  (c: any) => c.phone?.replace(/\D/g, '') === phone || c.whatsapp?.replace(/\D/g, '') === phone
                );
                const bestMatch = exactMatch || existingContacts[0];
                contactId = bestMatch.id;
                if (profilePicUrl && !bestMatch.avatar_url) {
                  await supabaseAdmin.from('contacts').update({ avatar_url: profilePicUrl }).eq('id', contactId);
                }
              } else if (name && name !== phone) {
                const { data: newContact, error: newContactErr } = await supabaseAdmin
                  .from('contacts')
                  .insert({ broker_id: userId, name, phone, whatsapp: phone, avatar_url: profilePicUrl, categories: ['lead'], metadata: { origin: 'whatsapp_sync' } })
                  .select('id')
                  .single();
                if (!newContactErr && newContact) contactId = newContact.id;
              }

              if (contactId) {
                await supabaseAdmin.from('whatsapp_conversations').update({ contact_id: contactId, lead_id: contactId }).eq('connection_id', conn.id).eq('remote_jid', remoteJid);
              }
            } catch (chatErr) {
              console.error('sync_history contact link error:', chatErr);
            }
          }

          // Mark completed
          await supabaseAdmin.from('whatsapp_sync_jobs').update({
            status: 'completed',
            processed_chats: personalChats.length,
            completed_at: new Date().toISOString(),
          }).eq('id', jobId);

          console.log(`sync_history job ${jobId}: completed (${personalChats.length} chats)`);
        } catch (e) {
          console.error(`sync_history job ${jobId} failed:`, e);
          await supabaseAdmin.from('whatsapp_sync_jobs').update({
            status: 'failed',
            error_message: e.message || 'Unknown error',
            completed_at: new Date().toISOString(),
          }).eq('id', jobId);
        }
      };

      // Fire and forget — EdgeRuntime.waitUntil keeps the function alive
      // @ts-ignore: Deno Deploy / Supabase Edge Runtime supports this
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(processSync());
      } else {
        // Fallback: run in background without awaiting (best effort)
        processSync().catch(e => console.error('Background sync error:', e));
      }

      // Respond immediately with 202 Accepted
      return new Response(JSON.stringify({ 
        success: true, 
        job_id: jobId,
        message: 'Sincronização iniciada em segundo plano.',
      }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── FETCH MESSAGES (Lazy Load for legacy conversations) ───
    if (action === 'fetch_messages') {
      const { remoteJid, conversationId } = body;

      if (!remoteJid || !conversationId) {
        return new Response(JSON.stringify({ error: 'remoteJid and conversationId are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: conn } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('*')
        .eq('broker_id', userId)
        .single();

      if (!conn?.instance_name) {
        return new Response(JSON.stringify({ error: 'No instance found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        // Fetch messages from Evolution API (POST with JSON body for v2.x)
        const messagesUrl = `${evolutionApiUrl}/chat/findMessages/${conn.instance_name}`;
        const fetchBody = { where: { key: { remoteJid } }, limit: 30 };
        console.log(`fetch_messages: POST ${messagesUrl}`, JSON.stringify(fetchBody));

        let msgRes = await fetch(messagesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
          body: JSON.stringify(fetchBody),
        });

        // Fallback: try alternative payload format if first attempt fails
        if (!msgRes.ok) {
          const errText1 = await msgRes.text();
          console.log(`fetch_messages: First attempt failed (${msgRes.status}): ${errText1.slice(0, 300)}`);
          
          // Try flat remoteJid format
          const altBody = { remoteJid, limit: 30 };
          console.log(`fetch_messages: Trying alternative payload:`, JSON.stringify(altBody));
          msgRes = await fetch(messagesUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
            body: JSON.stringify(altBody),
          });
        }

        // Final fallback: try with query param approach via POST with empty body
        if (!msgRes.ok) {
          const errText2 = await msgRes.text();
          console.log(`fetch_messages: Second attempt failed (${msgRes.status}): ${errText2.slice(0, 300)}`);
          
          const qpUrl = `${messagesUrl}?remoteJid=${encodeURIComponent(remoteJid)}&limit=30`;
          console.log(`fetch_messages: Trying query param URL: ${qpUrl}`);
          msgRes = await fetch(qpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
            body: JSON.stringify({}),
          });
        }

        if (!msgRes.ok) {
          const errText = await msgRes.text();
          console.error(`fetch_messages: All attempts failed. Last: ${msgRes.status}: ${errText.slice(0, 500)}`);
          throw new Error(`Evolution API returned ${msgRes.status}`);
        }

        const rawMessages = await msgRes.json();
        console.log(`fetch_messages: Raw response type=${typeof rawMessages}, isArray=${Array.isArray(rawMessages)}, keys=${typeof rawMessages === 'object' && rawMessages ? Object.keys(rawMessages).join(',') : 'N/A'}`);
        const msgList = Array.isArray(rawMessages) ? rawMessages
          : Array.isArray(rawMessages?.data) ? rawMessages.data
          : Array.isArray(rawMessages?.messages) ? rawMessages.messages
          : Array.isArray(rawMessages?.records) ? rawMessages.records
          : [];

        console.log(`fetch_messages: Got ${msgList.length} messages from Evolution API`);

        if (msgList.length === 0) {
          return new Response(JSON.stringify({ success: true, count: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Map to whatsapp_messages rows
        const rows = msgList.map((msg: any) => {
          const key = msg.key || {};
          const messageId = key.id || msg.id || msg.messageId || `evo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const fromMe = key.fromMe ?? msg.fromMe ?? false;
          const messageContent = msg.message || {};
          const text = messageContent.conversation
            || messageContent.extendedTextMessage?.text
            || msg.body || msg.content || msg.text || '';

          let messageType = 'text';
          let mediaUrl = null;
          let mediaMimeType = null;
          let mediaFilename = null;

          if (messageContent.imageMessage) {
            messageType = 'image';
            mediaUrl = messageContent.imageMessage.url || null;
            mediaMimeType = messageContent.imageMessage.mimetype || null;
          } else if (messageContent.audioMessage) {
            messageType = 'audio';
            mediaUrl = messageContent.audioMessage.url || null;
            mediaMimeType = messageContent.audioMessage.mimetype || null;
          } else if (messageContent.videoMessage) {
            messageType = 'video';
            mediaUrl = messageContent.videoMessage.url || null;
            mediaMimeType = messageContent.videoMessage.mimetype || null;
          } else if (messageContent.documentMessage) {
            messageType = 'document';
            mediaUrl = messageContent.documentMessage.url || null;
            mediaMimeType = messageContent.documentMessage.mimetype || null;
            mediaFilename = messageContent.documentMessage.fileName || null;
          } else if (messageContent.stickerMessage) {
            messageType = 'sticker';
          }

          const timestamp = msg.messageTimestamp || msg.timestamp;
          const sentAt = timestamp
            ? new Date(typeof timestamp === 'number'
              ? (timestamp > 1e12 ? timestamp : timestamp * 1000)
              : Date.parse(timestamp)
            ).toISOString()
            : new Date().toISOString();

          return {
            conversation_id: conversationId,
            message_id: messageId,
            direction: fromMe ? 'outgoing' : 'incoming',
            message_type: messageType,
            content: text || null,
            media_url: mediaUrl,
            media_mime_type: mediaMimeType,
            media_filename: mediaFilename,
            status: fromMe ? 'sent' : 'received',
            sent_at: sentAt,
          };
        });

        // Bulk upsert (ignore conflicts on message_id)
        const { error: insertErr } = await supabaseAdmin
          .from('whatsapp_messages')
          .upsert(rows, { onConflict: 'message_id', ignoreDuplicates: true });

        if (insertErr) {
          console.error('fetch_messages: Insert error:', insertErr.message);
        }

        return new Response(JSON.stringify({ success: true, count: rows.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error('fetch_messages error:', e);
        return new Response(JSON.stringify({ error: e.message || 'Failed to fetch messages' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: create, refresh_qr, status, disconnect, sync_recent, sync_history, fetch_messages' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('whatsapp-instance error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
