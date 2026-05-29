import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { encrypt, decrypt, isEncrypted } from '../_shared/encryption.ts';
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT using getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string };

    // Admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    switch (action) {
      case 'list': {
        const { data, error } = await supabaseAdmin
          .from('portal_connections')
          .select('id, portal_name, is_active, last_sync_at, sync_status, created_at, updated_at')
          .eq('broker_id', user.id)
          .order('portal_name');

        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create': {
        const { portal_name, api_key, credentials } = params;

        if (!portal_name) {
          return new Response(JSON.stringify({ error: 'portal_name is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Encrypt credentials before storing
        const encryptedApiKey = api_key ? await encrypt(api_key) : null;
        const encryptedCredentials = credentials ? await encrypt(JSON.stringify(credentials)) : null;

        const { data, error } = await supabaseAdmin
          .from('portal_connections')
          .insert({
            broker_id: user.id,
            portal_name,
            is_active: true,
            encrypted_credentials: encryptedCredentials || encryptedApiKey,
          })
          .select('id, portal_name, is_active, created_at')
          .single();

        if (error) throw error;

        // Audit log
        await supabaseAdmin.from('audit_logs').insert({
          broker_id: user.id,
          action: 'portal_connection_created',
          table_name: 'portal_connections',
          record_id: data.id,
          new_data: { portal_name, has_credentials: !!(api_key || credentials) },
        });

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        const { id, api_key, credentials, is_active } = params;

        if (!id) {
          return new Response(JSON.stringify({ error: 'id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('portal_connections')
          .select('id, broker_id')
          .eq('id', id)
          .single();

        if (fetchError || !existing) {
          return new Response(JSON.stringify({ error: 'Connection not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (existing.broker_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updateData: Record<string, any> = {};
        
        if (typeof is_active === 'boolean') {
          updateData.is_active = is_active;
        }

        if (api_key) {
          updateData.encrypted_credentials = await encrypt(api_key);
          // Clear plain text fields
          updateData.api_key = null;
          updateData.credentials = null;
        }

        if (credentials) {
          updateData.encrypted_credentials = await encrypt(JSON.stringify(credentials));
          updateData.api_key = null;
          updateData.credentials = null;
        }

        const { data, error } = await supabaseAdmin
          .from('portal_connections')
          .update(updateData)
          .eq('id', id)
          .select('id, portal_name, is_active, updated_at')
          .single();

        if (error) throw error;

        // Audit log
        await supabaseAdmin.from('audit_logs').insert({
          broker_id: user.id,
          action: 'portal_connection_updated',
          table_name: 'portal_connections',
          record_id: id,
          new_data: { is_active: updateData.is_active, credentials_updated: !!(api_key || credentials) },
        });

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        const { id } = params;

        if (!id) {
          return new Response(JSON.stringify({ error: 'id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('portal_connections')
          .select('id, broker_id, portal_name')
          .eq('id', id)
          .single();

        if (fetchError || !existing) {
          return new Response(JSON.stringify({ error: 'Connection not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (existing.broker_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabaseAdmin
          .from('portal_connections')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Audit log
        await supabaseAdmin.from('audit_logs').insert({
          broker_id: user.id,
          action: 'portal_connection_deleted',
          table_name: 'portal_connections',
          record_id: id,
          old_data: { portal_name: existing.portal_name },
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_credentials': {
        const { id } = params;

        if (!id) {
          return new Response(JSON.stringify({ error: 'id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: connection, error } = await supabaseAdmin
          .from('portal_connections')
          .select('id, broker_id, encrypted_credentials, api_key, credentials')
          .eq('id', id)
          .single();

        if (error || !connection) {
          return new Response(JSON.stringify({ error: 'Connection not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (connection.broker_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Decrypt credentials
        let decryptedCredentials = null;
        if (connection.encrypted_credentials) {
          const decrypted = await decrypt(connection.encrypted_credentials);
          try {
            decryptedCredentials = JSON.parse(decrypted);
          } catch {
            decryptedCredentials = decrypted; // Plain API key
          }
        } else if (connection.api_key || connection.credentials) {
          // Legacy plain text - return but log warning
          safeWarn('[SECURITY] Plain text credentials accessed for connection %s', id);
          decryptedCredentials = connection.credentials || connection.api_key;
        }

        return new Response(JSON.stringify({ credentials: decryptedCredentials }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[portal-connections] Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
