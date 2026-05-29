// ⚠️ DEPRECATED — Edge Function TEMPORÁRIA para migrar documentos do bucket
// property-media para property-documents. Protegida por MIGRATION_SECRET_TOKEN
// e idempotente via audit_logs. Remover após executar com sucesso.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ---- Proteção: token secreto obrigatório ----
    const migrationToken = Deno.env.get('MIGRATION_SECRET_TOKEN');
    if (!migrationToken) {
      return new Response(
        JSON.stringify({ error: 'Migration token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const providedToken = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    if (providedToken !== migrationToken) {
      safeWarn('Tentativa não autorizada de executar migrate-property-documents. IP: %s', req.headers.get('x-forwarded-for'));
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- Idempotência ----
    const { data: migrationLog } = await supabase
      .from('audit_logs')
      .select('id, created_at')
      .eq('action', 'migration_migrate_property_documents_completed')
      .maybeSingle();
    if (migrationLog) {
      return new Response(JSON.stringify({
        message: 'Migração já executada anteriormente',
        executed_at: migrationLog.created_at,
        skipped: true,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await supabase.from('audit_logs').insert({
      action: 'migration_migrate_property_documents_started',
      table_name: 'migrations',
      metadata: { function_name: 'migrate-property-documents', triggered_at: new Date().toISOString() },
    });


    const { data: docs, error: fetchError } = await supabase
      .from('property_documents')
      .select('id, file_path, broker_id, property_id, title')
      .eq('source_type', 'upload')
      .not('file_path', 'is', null);

    if (fetchError) throw fetchError;

    const results = {
      total: docs?.length ?? 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    for (const doc of docs ?? []) {
      try {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('property-media')
          .download(doc.file_path);

        if (downloadError) {
          if (
            downloadError.message?.toLowerCase().includes('not found') ||
            (downloadError as any).statusCode === '404'
          ) {
            safeLog('Arquivo não encontrado, pulando: %s', doc.file_path);
            results.skipped++;
            continue;
          }
          throw downloadError;
        }

        const { error: uploadError } = await supabase
          .storage
          .from('property-documents')
          .upload(doc.file_path, fileData, {
            contentType: fileData.type,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { error: removeError } = await supabase
          .storage
          .from('property-media')
          .remove([doc.file_path]);

        if (removeError) {
          safeError('Falha ao deletar do bucket antigo: %s', removeError.message);
        }

        results.migrated++;
        safeLog('Migrado: %s', doc.file_path);
      } catch (err: any) {
        results.failed++;
        results.errors.push({
          id: doc.id,
          error: err.message ?? 'Erro desconhecido',
        });
        safeError('Falha ao migrar %s: %s', doc.id, err.message);
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    safeError('Erro fatal na migração: %s', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
