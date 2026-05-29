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
          .from('integrations')
          .select('id, integration_type, is_active, webhook_url, last_sync_at, sync_status, created_at, updated_at')
          .eq('broker_id', user.id)
          .order('integration_type');

        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create': {
        const { integration_type, api_key, config, webhook_url } = params;

        if (!integration_type) {
          return new Response(JSON.stringify({ error: 'integration_type is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Encrypt credentials before storing
        const encryptedApiKey = api_key ? await encrypt(api_key) : null;
        const encryptedConfig = config ? await encrypt(JSON.stringify(config)) : null;

        const { data, error } = await supabaseAdmin
          .from('integrations')
          .insert({
            broker_id: user.id,
            integration_type,
            is_active: true,
            webhook_url,
            encrypted_api_key: encryptedApiKey,
            encrypted_config: encryptedConfig,
          })
          .select('id, integration_type, is_active, webhook_url, created_at')
          .single();

        if (error) throw error;

        // Audit log
        await supabaseAdmin.from('audit_logs').insert({
          broker_id: user.id,
          action: 'integration_created',
          table_name: 'integrations',
          record_id: data.id,
          new_data: { integration_type, has_api_key: !!api_key, has_config: !!config },
        });

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        const { id, api_key, config, is_active, webhook_url } = params;

        if (!id) {
          return new Response(JSON.stringify({ error: 'id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('integrations')
          .select('id, broker_id')
          .eq('id', id)
          .single();

        if (fetchError || !existing) {
          return new Response(JSON.stringify({ error: 'Integration not found' }), {
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

        if (webhook_url !== undefined) {
          updateData.webhook_url = webhook_url;
        }

        if (api_key) {
          updateData.encrypted_api_key = await encrypt(api_key);
          // Clear plain text field
          updateData.api_key = null;
        }

        if (config) {
          updateData.encrypted_config = await encrypt(JSON.stringify(config));
          // Clear plain text field
          updateData.config = null;
        }

        const { data, error } = await supabaseAdmin
          .from('integrations')
          .update(updateData)
          .eq('id', id)
          .select('id, integration_type, is_active, webhook_url, updated_at')
          .single();

        if (error) throw error;

        // Audit log
        await supabaseAdmin.from('audit_logs').insert({
          broker_id: user.id,
          action: 'integration_updated',
          table_name: 'integrations',
          record_id: id,
          new_data: { 
            is_active: updateData.is_active, 
            api_key_updated: !!api_key,
            config_updated: !!config,
          },
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
          .from('integrations')
          .select('id, broker_id, integration_type')
          .eq('id', id)
          .single();

        if (fetchError || !existing) {
          return new Response(JSON.stringify({ error: 'Integration not found' }), {
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
          .from('integrations')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Audit log
        await supabaseAdmin.from('audit_logs').insert({
          broker_id: user.id,
          action: 'integration_deleted',
          table_name: 'integrations',
          record_id: id,
          old_data: { integration_type: existing.integration_type },
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

        const { data: integration, error } = await supabaseAdmin
          .from('integrations')
          .select('id, broker_id, encrypted_api_key, encrypted_config, api_key, config')
          .eq('id', id)
          .single();

        if (error || !integration) {
          return new Response(JSON.stringify({ error: 'Integration not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (integration.broker_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Decrypt credentials
        let decryptedApiKey = null;
        let decryptedConfig = null;

        if (integration.encrypted_api_key) {
          decryptedApiKey = await decrypt(integration.encrypted_api_key);
        } else if (integration.api_key) {
          safeWarn('[SECURITY] Plain text API key accessed for integration %s', id);
          decryptedApiKey = integration.api_key;
        }

        if (integration.encrypted_config) {
          const decrypted = await decrypt(integration.encrypted_config);
          try {
            decryptedConfig = JSON.parse(decrypted);
          } catch {
            decryptedConfig = decrypted;
          }
        } else if (integration.config) {
          safeWarn('[SECURITY] Plain text config accessed for integration %s', id);
          decryptedConfig = integration.config;
        }

        return new Response(JSON.stringify({ 
          api_key: decryptedApiKey,
          config: decryptedConfig,
        }), {
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
    console.error('[integrations-manage] Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
