// Edge Function TEMPORÁRIA — usar apenas uma vez para migrar
// documentos do bucket property-media para property-documents.
// Remover após executar com sucesso.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { safeLog, safeError } from '../_shared/safe-log.ts';

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar super_admin via user_roles
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: 'Apenas super_admin pode executar' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
