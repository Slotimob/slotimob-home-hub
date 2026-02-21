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
      console.error('Missing EVOLUTION_API_URL or EVOLUTION_API_KEY secrets');
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
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

      // Create instance on Evolution API
      const createRes = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            url: webhookUrl,
            enabled: true,
            webhookByEvents: false,
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
          },
        }),
      });

      let createData = await createRes.json();
      console.log('Evolution create response status:', createRes.status, 'body:', JSON.stringify(createData));

      // If instance already exists (403), try to connect/get QR instead
      if (!createRes.ok) {
        console.log('Create failed, trying to connect existing instance...');
        const connectRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': evolutionApiKey },
        });
        const connectData = await connectRes.json();
        if (!connectRes.ok) {
          // Try deleting and recreating
          console.log('Connect failed, deleting and recreating...');
          try {
            await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } });
          } catch (_e) { /* ignore */ }
          try {
            await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } });
          } catch (_e) { /* ignore */ }
          
          // Retry create
          const retryRes = await fetch(`${evolutionApiUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
            body: JSON.stringify({
              instanceName,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS',
              webhook: { url: webhookUrl, enabled: true, webhookByEvents: false, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'] },
            }),
          });
          createData = await retryRes.json();
          if (!retryRes.ok) {
            return new Response(JSON.stringify({ error: createData?.message || 'Failed to create instance' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          createData = { qrcode: { base64: connectData?.base64 || null } };
        }
      }

      // Try multiple QR extraction paths from create response
      let qrBase64 = createData?.qrcode?.base64 
        || createData?.qrcode 
        || createData?.base64 
        || createData?.hash?.qrcode?.base64
        || null;
      
      // If qrBase64 is an object, it's not a valid base64 string
      if (qrBase64 && typeof qrBase64 !== 'string') {
        console.log('QR is object, trying nested:', JSON.stringify(qrBase64));
        qrBase64 = qrBase64?.base64 || null;
      }

      // Fallback: if no QR inline, wait briefly then fetch via connect endpoint
      if (!qrBase64) {
        console.log('No QR inline, waiting 2s then fetching via connect endpoint...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const connectRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey },
          });
          const connectData = await connectRes.json();
          console.log('Connect endpoint response:', JSON.stringify(connectData));
          qrBase64 = connectData?.base64 
            || connectData?.qrcode?.base64 
            || connectData?.code 
            || null;
          if (qrBase64 && typeof qrBase64 !== 'string') {
            qrBase64 = qrBase64?.base64 || null;
          }
          console.log('Connect endpoint QR:', qrBase64 ? 'received' : 'not available');
        } catch (e) {
          console.error('Fallback QR fetch error:', e);
        }
      }

      // Second fallback: try again after another delay
      if (!qrBase64) {
        console.log('Still no QR, retrying after 3s...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
          const retryConnectRes = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey },
          });
          const retryData = await retryConnectRes.json();
          console.log('Retry connect response:', JSON.stringify(retryData));
          qrBase64 = retryData?.base64 
            || retryData?.qrcode?.base64
            || null;
        } catch (e) {
          console.error('Second retry QR fetch error:', e);
        }
      }

      // Upsert connection in DB - use broker_id since instance_name may be empty initially
      const { data: existingConn } = await supabaseClient
        .from('whatsapp_connections')
        .select('id')
        .eq('broker_id', userId)
        .maybeSingle();

      let conn, dbError;
      if (existingConn) {
        const res = await supabaseClient
          .from('whatsapp_connections')
          .update({
            instance_name: instanceName,
            status: 'pending',
            connection_status: qrBase64 ? 'qrcode' : 'connecting',
            qr_code_base64: qrBase64,
            connected_at: null,
          })
          .eq('broker_id', userId)
          .select()
          .single();
        conn = res.data;
        dbError = res.error;
      } else {
        const res = await supabaseClient
          .from('whatsapp_connections')
          .insert({
            broker_id: userId,
            instance_name: instanceName,
            status: 'pending',
            connection_status: qrBase64 ? 'qrcode' : 'connecting',
            qr_code_base64: qrBase64,
          })
          .select()
          .single();
        conn = res.data;
        dbError = res.error;
      }

      if (dbError) {
        console.error('DB upsert error:', dbError);
        return new Response(JSON.stringify({ error: dbError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, connection: conn, qrCode: qrBase64 }), {
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
      const qrBase64 = connectData?.base64 || null;

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
        // Logout + delete on Evolution
        try {
          await fetch(`${evolutionApiUrl}/instance/logout/${conn.instance_name}`, {
            method: 'DELETE', headers: { 'apikey': evolutionApiKey },
          });
        } catch (e) { console.error('Logout error (non-fatal):', e); }

        try {
          await fetch(`${evolutionApiUrl}/instance/delete/${conn.instance_name}`, {
            method: 'DELETE', headers: { 'apikey': evolutionApiKey },
          });
        } catch (e) { console.error('Delete error (non-fatal):', e); }
      }

      // Clean DB record
      await supabaseClient
        .from('whatsapp_connections')
        .update({
          status: 'disconnected',
          connection_status: 'disconnected',
          qr_code_base64: null,
          connected_at: null,
        })
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
