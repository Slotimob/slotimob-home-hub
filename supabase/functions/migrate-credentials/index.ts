import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { encrypt, isEncrypted } from '../_shared/encryption.ts';
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ⚠️ DEPRECATED — Endpoint de migração one-off.
 * Protegido por MIGRATION_SECRET_TOKEN (header Authorization: Bearer <token>).
 * Idempotente: bloqueia execuções duplicadas via audit_logs.
 * Manter por 30 dias após execução em produção; depois remover.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ---- Proteção: token secreto obrigatório para executar migração ----
    const migrationToken = Deno.env.get('MIGRATION_SECRET_TOKEN');
    if (!migrationToken) {
      return new Response(JSON.stringify({ error: 'Migration token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const providedToken = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    if (providedToken !== migrationToken) {
      safeWarn('Tentativa não autorizada de executar migrate-credentials. IP: %s', req.headers.get('x-forwarded-for'));
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Idempotência: bloqueia se já executada ----
    const supabaseGuard = createClient(supabaseUrl, supabaseServiceKey);
    const { data: migrationLog } = await supabaseGuard
      .from('audit_logs')
      .select('id, created_at')
      .eq('action', 'migration_migrate_credentials_completed')
      .maybeSingle();
    if (migrationLog) {
      return new Response(JSON.stringify({
        message: 'Migração já executada anteriormente',
        executed_at: migrationLog.created_at,
        skipped: true,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await supabaseGuard.from('audit_logs').insert({
      action: 'migration_migrate_credentials_started',
      table_name: 'migrations',
      metadata: { function_name: 'migrate-credentials', triggered_at: new Date().toISOString() },
    });


    // Token gate already authorized this caller as super-admin.
    // Admin client for migration.
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action } = await req.json();

    if (action === 'migrate_all') {


      const results = {
        portal_connections: { migrated: 0, skipped: 0, errors: 0 },
        integrations: { migrated: 0, skipped: 0, errors: 0 },
        whatsapp_connections: { migrated: 0, skipped: 0, errors: 0 },
      };

      // Migrate portal_connections
      const { data: portalConnections, error: portalError } = await supabaseAdmin
        .from('portal_connections')
        .select('id, api_key, credentials, encrypted_credentials');

      if (portalError) {
        console.error('[migrate] Portal connections fetch error:', portalError);
      } else {
        for (const conn of portalConnections || []) {
          try {
            // Skip if already encrypted or no plain text data
            if (conn.encrypted_credentials && isEncrypted(conn.encrypted_credentials)) {
              results.portal_connections.skipped++;
              continue;
            }

            const dataToEncrypt = conn.api_key || (conn.credentials ? JSON.stringify(conn.credentials) : null);
            if (!dataToEncrypt) {
              results.portal_connections.skipped++;
              continue;
            }

            const encrypted = await encrypt(dataToEncrypt);
            
            const { error: updateError } = await supabaseAdmin
              .from('portal_connections')
              .update({
                encrypted_credentials: encrypted,
                api_key: null,
                credentials: null,
              })
              .eq('id', conn.id);

            if (updateError) {
              safeError('[migrate] Portal connection %s update error:', conn.id, updateError);
              results.portal_connections.errors++;
            } else {
              results.portal_connections.migrated++;
            }
          } catch (err) {
            safeError('[migrate] Portal connection %s error:', conn.id, err);
            results.portal_connections.errors++;
          }
        }
      }

      // Migrate integrations
      const { data: integrations, error: intError } = await supabaseAdmin
        .from('integrations')
        .select('id, api_key, config, encrypted_api_key, encrypted_config');

      if (intError) {
        console.error('[migrate] Integrations fetch error:', intError);
      } else {
        for (const int of integrations || []) {
          try {
            let needsUpdate = false;
            const updateData: Record<string, any> = {};

            // Migrate API key
            if (int.api_key && (!int.encrypted_api_key || !isEncrypted(int.encrypted_api_key))) {
              updateData.encrypted_api_key = await encrypt(int.api_key);
              updateData.api_key = null;
              needsUpdate = true;
            }

            // Migrate config
            if (int.config && (!int.encrypted_config || !isEncrypted(int.encrypted_config))) {
              updateData.encrypted_config = await encrypt(JSON.stringify(int.config));
              updateData.config = null;
              needsUpdate = true;
            }

            if (!needsUpdate) {
              results.integrations.skipped++;
              continue;
            }

            const { error: updateError } = await supabaseAdmin
              .from('integrations')
              .update(updateData)
              .eq('id', int.id);

            if (updateError) {
              safeError('[migrate] Integration %s update error:', int.id, updateError);
              results.integrations.errors++;
            } else {
              results.integrations.migrated++;
            }
          } catch (err) {
            safeError('[migrate] Integration %s error:', int.id, err);
            results.integrations.errors++;
          }
        }
      }

      // Migrate whatsapp_connections (if any have unencrypted keys)
      const { data: waConnections, error: waError } = await supabaseAdmin
        .from('whatsapp_connections')
        .select('id, evolution_api_key, encrypted_api_key');

      if (waError) {
        console.error('[migrate] WhatsApp connections fetch error:', waError);
      } else {
        for (const conn of waConnections || []) {
          try {
            // Skip if already encrypted or no plain text data
            if (conn.encrypted_api_key && isEncrypted(conn.encrypted_api_key)) {
              results.whatsapp_connections.skipped++;
              continue;
            }

            if (!conn.evolution_api_key) {
              results.whatsapp_connections.skipped++;
              continue;
            }

            const encrypted = await encrypt(conn.evolution_api_key);
            
            const { error: updateError } = await supabaseAdmin
              .from('whatsapp_connections')
              .update({
                encrypted_api_key: encrypted,
                evolution_api_key: null,
              })
              .eq('id', conn.id);

            if (updateError) {
              safeError('[migrate] WhatsApp connection %s update error:', conn.id, updateError);
              results.whatsapp_connections.errors++;
            } else {
              results.whatsapp_connections.migrated++;
            }
          } catch (err) {
            safeError('[migrate] WhatsApp connection %s error:', conn.id, err);
            results.whatsapp_connections.errors++;
          }
        }
      }

      // Audit log for migration
      await supabaseAdmin.from('audit_logs').insert({
        action: 'migration_migrate_credentials_completed',
        table_name: 'migrations',
        metadata: { ...results, function_name: 'migrate-credentials', completed_at: new Date().toISOString() },
      });


      console.log('[migrate] Migration completed:', results);

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Credential migration completed',
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // migrate_my_data foi removido: endpoint agora é apenas para super-admin via token.
    if (action === 'migrate_my_data') {
      return new Response(JSON.stringify({ error: 'migrate_my_data is no longer supported. Use migrate_all.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    return new Response(JSON.stringify({ error: 'Invalid action. Use migrate_all or migrate_my_data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[migrate-credentials] Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
