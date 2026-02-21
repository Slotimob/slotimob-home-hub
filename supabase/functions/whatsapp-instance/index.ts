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
      const webhookUrl = 'https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/whatsapp-webhook';
      console.log('Webhook URL:', webhookUrl);

      // Step 1: Create instance (minimal payload)
      const createRes = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: true,
            events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
          },
        }),
      });

      const createData = await createRes.json();
      console.log('Create response status:', createRes.status, 'body:', JSON.stringify(createData));

      // Extract QR from create response if available
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
        qrBase64 = connectData?.qrcode?.base64 || connectData?.base64 || qrBase64;

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
              webhook: {
                url: webhookUrl,
                byEvents: false,
                base64: true,
                events: ['QRCODE_UPDATED', 'MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
              },
            }),
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

      // Step 2: If no QR yet, trigger connect with retries
      if (!qrBase64) {
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 3000));
          const connectQrRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey },
          });
          const connectQrData = await connectQrRes.json();
          console.log(`Connect QR attempt ${attempt + 1}:`, JSON.stringify(connectQrData));
          qrBase64 = connectQrData?.qrcode?.base64 || connectQrData?.base64 || null;
          if (qrBase64) break;
        }
      }

      // Step 3: Final "reminder" connect call to force QR generation
      if (!qrBase64) {
        console.log('No QR yet, sending final reminder connect call...');
        await new Promise(r => setTimeout(r, 3000));
        try {
          const reminderRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey },
          });
          const reminderData = await reminderRes.json();
          console.log('Reminder connect response:', JSON.stringify(reminderData));
          qrBase64 = reminderData?.qrcode?.base64 || reminderData?.base64 || null;
        } catch (e) {
          console.error('Reminder connect error:', e);
        }
      }

      // Step 4: Save to DB with status 'connecting' — QR will arrive via webhook
      const { data: existingConn } = await supabaseClient
        .from('whatsapp_connections')
        .select('id')
        .eq('broker_id', userId)
        .maybeSingle();

      const dbPayload = {
        instance_name: instanceName,
        status: qrBase64 ? 'pending' : 'pending',
        connection_status: qrBase64 ? 'qrcode' : 'connecting',
        qr_code_base64: qrBase64,
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
