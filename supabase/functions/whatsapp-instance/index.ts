import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt, decrypt } from "../_shared/encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting constants
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MINUTES = 1;

// Rate limiting helper
async function checkRateLimit(
  supabaseAdmin: any,
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: maxRequests };
  }

  const currentCount = data?.request_count || 0;
  
  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  if (data) {
    await supabaseAdmin
      .from('rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .eq('window_start', data.window_start);
  } else {
    await supabaseAdmin
      .from('rate_limits')
      .insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: new Date().toISOString()
      });
  }

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Create admin client for rate limiting
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate JWT using getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      userId,
      'whatsapp-instance',
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MINUTES
    );

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60'
        },
      });
    }

    const { action, connectionId, instanceName, evolutionApiUrl, evolutionApiKey } = await req.json();
    console.log(`WhatsApp Instance action: ${action} for user: ${userId}`);

    switch (action) {
      case 'create': {
        // Validate required fields
        if (!instanceName || !evolutionApiUrl || !evolutionApiKey) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create instance in Evolution API
        const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
          body: JSON.stringify({
            instanceName: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        });

        const createData = await createResponse.json();
        console.log('Evolution API create response:', createData);

        if (!createResponse.ok) {
          return new Response(JSON.stringify({ error: createData.message || 'Failed to create instance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate webhook URL
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

        // Set webhook in Evolution API
        await fetch(`${evolutionApiUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhookByEvents: false,
              events: [
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'CONNECTION_UPDATE',
                'QRCODE_UPDATED',
              ],
            },
          }),
        });

        // Encrypt the API key before storing
        const encryptedApiKey = await encrypt(evolutionApiKey);

        // Save connection to database with encrypted API key
        const { data: connection, error: dbError } = await supabaseClient
          .from('whatsapp_connections')
          .insert({
            broker_id: userId,
            instance_name: instanceName,
            evolution_api_url: evolutionApiUrl,
            evolution_api_key: encryptedApiKey,
            webhook_url: webhookUrl,
            status: 'pending',
            qr_code: createData.qrcode?.base64 || null,
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
          return new Response(JSON.stringify({ error: dbError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          connection: {
            ...connection,
            evolution_api_key: '***ENCRYPTED***' // Don't return the encrypted key
          },
          qrCode: createData.qrcode?.base64 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'connect': {
        // Get connection from database
        const { data: connection, error: connError } = await supabaseClient
          .from('whatsapp_connections')
          .select('*')
          .eq('id', connectionId)
          .eq('broker_id', userId)
          .single();

        if (connError || !connection) {
          return new Response(JSON.stringify({ error: 'Connection not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Decrypt the API key
        const apiKey = await decrypt(connection.evolution_api_key);

        // Request new QR code from Evolution API
        const connectResponse = await fetch(
          `${connection.evolution_api_url}/instance/connect/${connection.instance_name}`,
          {
            method: 'GET',
            headers: {
              'apikey': apiKey,
            },
          }
        );

        const connectData = await connectResponse.json();
        console.log('Evolution API connect response:', connectData);

        if (connectData.base64) {
          // Update QR code in database
          await supabaseClient
            .from('whatsapp_connections')
            .update({ 
              qr_code: connectData.base64,
              status: 'connecting' 
            })
            .eq('id', connectionId);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          qrCode: connectData.base64,
          status: connectData.instance?.state || 'connecting'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'status': {
        // Get connection from database
        const { data: connection, error: connError } = await supabaseClient
          .from('whatsapp_connections')
          .select('*')
          .eq('id', connectionId)
          .eq('broker_id', userId)
          .single();

        if (connError || !connection) {
          return new Response(JSON.stringify({ error: 'Connection not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Decrypt the API key
        const apiKey = await decrypt(connection.evolution_api_key);

        // Get status from Evolution API
        const statusResponse = await fetch(
          `${connection.evolution_api_url}/instance/connectionState/${connection.instance_name}`,
          {
            method: 'GET',
            headers: {
              'apikey': apiKey,
            },
          }
        );

        const statusData = await statusResponse.json();
        console.log('Evolution API status response:', statusData);

        // Update status in database if needed
        let newStatus = connection.status;
        if (statusData.instance?.state === 'open') {
          newStatus = 'connected';
        } else if (statusData.instance?.state === 'close') {
          newStatus = 'disconnected';
        }

        if (newStatus !== connection.status) {
          await supabaseClient
            .from('whatsapp_connections')
            .update({ 
              status: newStatus,
              connected_at: newStatus === 'connected' ? new Date().toISOString() : null
            })
            .eq('id', connectionId);
        }

        return new Response(JSON.stringify({ 
          success: true,
          status: newStatus,
          evolutionStatus: statusData.instance?.state
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        // Get connection from database
        const { data: connection, error: connError } = await supabaseClient
          .from('whatsapp_connections')
          .select('*')
          .eq('id', connectionId)
          .eq('broker_id', userId)
          .single();

        if (connError || !connection) {
          return new Response(JSON.stringify({ error: 'Connection not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Decrypt the API key
        const apiKey = await decrypt(connection.evolution_api_key);

        // Logout from Evolution API
        await fetch(
          `${connection.evolution_api_url}/instance/logout/${connection.instance_name}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': apiKey,
            },
          }
        );

        // Update status in database
        await supabaseClient
          .from('whatsapp_connections')
          .update({ 
            status: 'disconnected',
            qr_code: null,
            connected_at: null
          })
          .eq('id', connectionId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        // Get connection from database
        const { data: connection, error: connError } = await supabaseClient
          .from('whatsapp_connections')
          .select('*')
          .eq('id', connectionId)
          .eq('broker_id', userId)
          .single();

        if (connError || !connection) {
          return new Response(JSON.stringify({ error: 'Connection not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Decrypt the API key
        const apiKey = await decrypt(connection.evolution_api_key);

        // Delete instance from Evolution API
        await fetch(
          `${connection.evolution_api_url}/instance/delete/${connection.instance_name}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': apiKey,
            },
          }
        );

        // Delete from database
        await supabaseClient
          .from('whatsapp_connections')
          .delete()
          .eq('id', connectionId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in whatsapp-instance function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
