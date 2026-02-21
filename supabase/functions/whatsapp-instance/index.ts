import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
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

    const { action } = await req.json();
    console.log(`whatsapp-instance action=${action} user=${userId}`);

    // ─── CREATE INSTANCE ───
    if (action === 'create') {
      const instanceName = `slotimob_${userId.replace(/-/g, '').slice(0, 16)}`;
      const webhookUrl = 'https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/whatsapp-webhook';
      console.log('Webhook URL:', webhookUrl);

      // ATOMICITY: Delete any existing connection for this broker before inserting
      console.log('Cleaning existing connections for broker:', userId);
      await supabaseAdmin
        .from('whatsapp_connections')
        .delete()
        .eq('broker_id', userId);

      // Robust webhook payload with enabled: true and INSTANCE_CREATED event
      const webhookPayload = {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: true,
          base64: true,
          webhookByEvents: true,
          events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'INSTANCE_CREATED'],
        },
      };

      // Step 1: Create instance
      const createRes = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify(webhookPayload),
      });

      const createData = await createRes.json();
      console.log('Create response status:', createRes.status, 'body:', JSON.stringify(createData));

      let qrBase64 = createData?.qrcode?.base64 || null;

      // If already exists, try connect; if that fails, delete + recreate
      if (!createRes.ok) {
        console.log('Create failed with', createRes.status, '— trying connect...');
        const connectRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': evolutionApiKey },
        });
        const connectData = await connectRes.json();
        console.log('Connect response:', JSON.stringify(connectData));
        qrBase64 = connectData?.base64 || connectData?.qrcode?.base64 || (typeof connectData?.qrcode === 'string' && connectData.qrcode.length > 100 ? connectData.qrcode : null) || qrBase64;

        if (!connectRes.ok) {
          console.log('Connect failed, deleting and recreating...');
          try { await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (_e) { /* */ }
          try { await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (_e) { /* */ }
          await new Promise(r => setTimeout(r, 1000));

          const retryRes = await fetch(`${evolutionApiUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
            body: JSON.stringify(webhookPayload),
          });
          const retryData = await retryRes.json();
          console.log('Retry create status:', retryRes.status, 'body:', JSON.stringify(retryData));
          qrBase64 = retryData?.qrcode?.base64 || qrBase64;

          if (!retryRes.ok) {
            return new Response(JSON.stringify({ error: retryData?.message || 'Failed to create instance' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }

      // Step 2: Wait 10s for Baileys socket to initialize
      console.log('Aguardando 10s para inicialização do Baileys...');
      await new Promise(r => setTimeout(r, 10000));

      // Step 3: Resilience loop — 5 attempts with 5s interval
      if (!qrBase64) {
        for (let attempt = 1; attempt <= 5; attempt++) {
          console.log(`Tentativa de captura QR ${attempt}/5 para: ${instanceName}`);
          try {
            const connectQrRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey },
            });
            const connectQrData = await connectQrRes.json();
            console.log(`Connect QR attempt ${attempt}:`, JSON.stringify(connectQrData));
            qrBase64 = connectQrData?.base64 || connectQrData?.qrcode?.base64 || null;
            if (!qrBase64 && typeof connectQrData?.qrcode === 'string' && connectQrData.qrcode.length > 100) {
              qrBase64 = connectQrData.qrcode;
            }
            if (qrBase64 && typeof qrBase64 === 'string' && qrBase64.length > 100) {
              console.log(`QR capturado na tentativa ${attempt}!`);
              break;
            }
            qrBase64 = null;
          } catch (e) {
            console.error(`Erro na tentativa ${attempt}:`, e);
          }
          if (attempt < 5) await new Promise(r => setTimeout(r, 5000));
        }
      }

      // Step 4: Save to DB — use supabaseAdmin (service role) for guaranteed write
      const connectionStatus = qrBase64 ? 'qrcode' : 'connecting';
      const dbPayload = {
        broker_id: userId,
        instance_name: instanceName,
        status: 'pending',
        connection_status: connectionStatus,
        qr_code_base64: qrBase64,
        connected_at: null,
      };

      if (qrBase64) {
        console.log('QR obtido! Salvando no banco via service role.');
      } else {
        console.log('QR não obtido no polling. Webhook assumirá a entrega. Status: connecting');
      }

      const { data: conn, error: dbError } = await supabaseAdmin
        .from('whatsapp_connections')
        .insert(dbPayload)
        .select()
        .single();

      if (dbError) {
        console.error('DB error:', dbError);
        return new Response(JSON.stringify({ error: dbError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        connection: conn,
        connection_status: connectionStatus,
        message: qrBase64 ? 'QR Code gerado com sucesso.' : 'Instância criada. Aguardando QR Code via webhook (pode levar até 30s).' 
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
      console.log('Refresh QR response:', JSON.stringify(connectData));
      const qrBase64 = connectData?.base64 || connectData?.qrcode?.base64 || (typeof connectData?.qrcode === 'string' && connectData.qrcode.length > 100 ? connectData.qrcode : null);

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
        .select('instance_name')
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

      return new Response(JSON.stringify({ success: true, state: statusData?.instance?.state }), {
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
        try { await fetch(`${evolutionApiUrl}/instance/logout/${conn.instance_name}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (e) { console.error('Logout error:', e); }
        try { await fetch(`${evolutionApiUrl}/instance/delete/${conn.instance_name}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (e) { console.error('Delete error:', e); }
      }

      await supabaseAdmin
        .from('whatsapp_connections')
        .update({ status: 'disconnected', connection_status: 'disconnected', qr_code_base64: null, connected_at: null })
        .eq('broker_id', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: create, refresh_qr, status, disconnect' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('whatsapp-instance error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
