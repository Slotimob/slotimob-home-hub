import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Force-delete instance from Evolution API (ignore errors if not found)
async function forceDeleteInstance(evolutionApiUrl: string, evolutionApiKey: string, instanceName: string) {
  console.log(`forceDelete: Iniciando limpeza profunda para ${instanceName}...`);
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
  // FIX: Aguardar 4 segundos para garantir que a Evolution API libere a pasta da sessão
  console.log('forceDelete: Aguardando liberação de recursos (Cool-down 4s)...');
  await new Promise(resolve => setTimeout(resolve, 4000));
}

function extractQrBase64(data: any): string | null {
  const candidates = [
    data?.base64,
    data?.qrcode?.base64,
    typeof data?.qrcode === 'string' ? data.qrcode : null,
    data?.data?.base64,
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

    // ─── CREATE INSTANCE (DYNAMIC NAMING STRATEGY) ───
    if (action === 'create') {
      const webhookUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/whatsapp-webhook`;

      // Step 1: Limpeza prévia — buscar conexão antiga e deletar na Evolution API
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

      // Step 2: Nomenclatura dinâmica — garante fresh state sem conflitos de sessão
      const instanceName = `slotimob_${userId.replace(/-/g, '').slice(0, 8)}_${Date.now().toString(36)}`;

      // Step 2: Criar Instância
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

      console.log('Solicitando criação da instância...');
      const createRes = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify(webhookPayload),
      });

      const createData = await createRes.json();
      let finalQrCode = extractQrBase64(createData);

      // Step 3: Lógica de Retry se o QR Code falhar na criação
      if (!finalQrCode) {
        console.log('⚠️ QR Code não veio na criação. Iniciando protocolo de Force Connect...');
        
        // Tentativa 1: Forçar conexão imediata
        try {
          const connectRes1 = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evolutionApiKey },
          });
          const connectData1 = await connectRes1.json();
          finalQrCode = extractQrBase64(connectData1);
        } catch (_e) { /* ignore */ }

        if (!finalQrCode) {
          // Tentativa 2: Esperar 3 segundos e tentar novamente (Dando tempo para o driver bootar)
          console.log('⏳ QR Code ainda ausente. Aguardando 3s para nova tentativa...');
          await new Promise(r => setTimeout(r, 3000));
          try {
            const connectRes2 = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
              method: 'GET',
              headers: { 'apikey': evolutionApiKey },
            });
            const connectData2 = await connectRes2.json();
            finalQrCode = extractQrBase64(connectData2);
          } catch (_e) { /* ignore */ }
        }
      }

      if (finalQrCode) {
        console.log('✅ QR Code capturado com sucesso!');
      } else {
        console.error('❌ Falha ao obter QR Code após retentativas. O webhook será a última esperança.');
      }

      // Step 4: Save to DB
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
        message: 'Instância criada.' 
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