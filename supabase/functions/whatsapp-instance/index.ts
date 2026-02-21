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
      const reqUrl = new URL(req.url);
      const webhookUrl = `${reqUrl.origin}/functions/v1/whatsapp-webhook`;
      console.log('Webhook URL:', webhookUrl);

      // Step 1: Create instance with qrcode: true
      const createRes = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: webhookUrl,
          webhook_by_events: false,
          webhook_events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
          events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
          webhook_base64: true,
        }),
      });

      const createData = await createRes.json();
      console.log('Create response status:', createRes.status, 'body:', JSON.stringify(createData));

      // Step 2: If 403 (already exists), try connect to get QR
      if (!createRes.ok) {
        console.log('Create failed with', createRes.status, '— trying connect...');
        const connectRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': evolutionApiKey },
        });
        const connectData = await connectRes.json();
        console.log('Connect response:', JSON.stringify(connectData));

        // If connect also fails, delete + recreate
        if (!connectRes.ok) {
          console.log('Connect failed, deleting and recreating...');
          try { await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (_e) { /* */ }
          try { await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (_e) { /* */ }
          await new Promise(r => setTimeout(r, 1000));

          const retryRes = await fetch(`${evolutionApiUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
            body: JSON.stringify({
              instanceName: instanceName,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS',
              webhook: webhookUrl,
              webhook_by_events: false,
              webhook_events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
              events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
              webhook_base64: true,
            }),
          });
          const retryData = await retryRes.json();
          console.log('Retry create status:', retryRes.status, 'body:', JSON.stringify(retryData));

          if (!retryRes.ok) {
            return new Response(JSON.stringify({ error: retryData?.message || 'Failed to create instance' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }

      // Step 3: Save to DB with status 'connecting' — QR will arrive via webhook
      const { data: existingConn } = await supabaseClient
        .from('whatsapp_connections')
        .select('id')
        .eq('broker_id', userId)
        .maybeSingle();

      const dbPayload = {
        instance_name: instanceName,
        status: 'pending',
        connection_status: 'connecting',
        qr_code_base64: null,
        connected_at: null,
      };

      let conn, dbError;
      if (existingConn) {
        const res = await supabaseClient
          .from('whatsapp_connections')
          .update(dbPayload)
          .eq('broker_id', userId)
          .select()
          .single();
        conn = res.data;
        dbError = res.error;
      } else {
        const res = await supabaseClient
          .from('whatsapp_connections')
          .insert({ broker_id: userId, ...dbPayload })
          .select()
          .single();
        conn = res.data;
        dbError = res.error;
      }

      if (dbError) {
        console.error('DB error:', dbError);
        return new Response(JSON.stringify({ error: dbError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Return success — QR code will be delivered asynchronously via webhook + Realtime
      return new Response(JSON.stringify({ 
        success: true, 
        connection: conn, 
        message: 'Instância criada. Aguardando QR Code via webhook.' 
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
      const qrBase64 = connectData?.qrcode?.base64 || connectData?.base64 || null;

      if (qrBase64) {
        await supabaseClient
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

      await supabaseClient
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
