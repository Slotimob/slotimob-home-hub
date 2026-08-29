import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brokerId = user.id;
    safeLog('Importing data for broker: %s', brokerId);

    // Parse import data from request body
    const importData = await req.json();
    
    if (!importData || !importData.tables) {
      return new Response(
        JSON.stringify({ error: 'Invalid import data format. Expected { tables: {...} }' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tables } = importData;
    const results: Record<string, { inserted: number; errors: string[] }> = {};

    // SECURITY: an imported record may carry an `id` that already exists and belongs
    // to another tenant. Upserting it would overwrite that tenant's row (ID hijack).
    // Before writing, verify that any pre-existing row with the same id is owned by
    // the caller; otherwise skip the record.
    const isHijack = async (
      tableName: string,
      id: unknown,
      ownerColumn: string
    ): Promise<boolean> => {
      if (!id) return false;
      const { data: existing, error } = await supabaseAdmin
        .from(tableName)
        .select(ownerColumn)
        .eq('id', id)
        .maybeSingle();
      if (error) return true; // fail closed
      if (!existing) return false;
      return (existing as Record<string, unknown>)[ownerColumn] !== brokerId;
    };

    // Helper function to upsert data with broker_id override
    const upsertTable = async (
      tableName: string, 
      data: any[], 
      idColumn: string = 'id',
      ownerColumn: string = 'broker_id'
    ) => {
      const tableResults = { inserted: 0, errors: [] as string[] };
      
      if (!data || data.length === 0) {
        results[tableName] = tableResults;
        return;
      }

      for (const record of data) {
        try {
          if (await isHijack(tableName, record[idColumn], ownerColumn)) {
            tableResults.errors.push(`${record[idColumn]}: skipped, record belongs to another account`);
            continue;
          }

          // Override owner column to current user's ID for security
          const sanitizedRecord = { ...record, [ownerColumn]: brokerId };
          
          const { error } = await supabaseAdmin
            .from(tableName)
            .upsert(sanitizedRecord, { onConflict: idColumn });
          
          if (error) {
            tableResults.errors.push(`${record[idColumn]}: ${error.message}`);
          } else {
            tableResults.inserted++;
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          tableResults.errors.push(`${record[idColumn]}: ${message}`);
        }
      }
      
      results[tableName] = tableResults;
    };

    // Helper for tables with user_id instead of broker_id
    const upsertUserTable = async (tableName: string, data: any[]) => {
      const tableResults = { inserted: 0, errors: [] as string[] };
      
      if (!data || data.length === 0) {
        results[tableName] = tableResults;
        return;
      }

      for (const record of data) {
        try {
          if (await isHijack(tableName, record.id, 'user_id')) {
            tableResults.errors.push(`${record.id}: skipped, record belongs to another account`);
            continue;
          }

          const sanitizedRecord = { ...record, user_id: brokerId };
          
          const { error } = await supabaseAdmin
            .from(tableName)
            .upsert(sanitizedRecord, { onConflict: 'id' });
          
          if (error) {
            tableResults.errors.push(`${record.id}: ${error.message}`);
          } else {
            tableResults.inserted++;
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          tableResults.errors.push(`${record.id}: ${message}`);
        }
      }
      
      results[tableName] = tableResults;
    };


    // Import in order respecting foreign key dependencies
    // Level 1: No dependencies (profiles first)
    if (tables.profiles && tables.profiles.length > 0) {
      const profile = tables.profiles[0];
      // SECURITY: strip privileged/secret fields from user-supplied payload so a
      // malicious import cannot escalate privileges or hijack tokens.
      const {
        is_super_admin: _isSuperAdmin,
        feed_token: _feedToken,
        ical_token: _icalToken,
        push_subscription: _pushSub,
        terms_signature: _termsSig,
        ...safeProfile
      } = profile as Record<string, unknown>;
      const sanitizedProfile = { ...safeProfile, id: brokerId };
      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert(sanitizedProfile, { onConflict: 'id' });
      results['profiles'] = { 
        inserted: error ? 0 : 1, 
        errors: error ? [error.message] : [] 
      };
    }

    // Level 2: Only depend on profiles
    await upsertTable('contacts', tables.contacts);
    await upsertTable('properties', tables.properties);
    await upsertTable('leads', tables.leads);
    await upsertTable('owners', tables.owners);
    await upsertTable('companies', tables.companies);
    await upsertTable('financial_categories', tables.financial_categories);
    await upsertTable('bank_accounts', tables.bank_accounts);
    await upsertTable('pipeline_stages', tables.pipeline_stages);
    await upsertTable('integrations', tables.integrations);
    await upsertTable('portal_connections', tables.portal_connections);
    await upsertTable('custom_obligation_types', tables.custom_obligation_types);
    await upsertTable('contract_templates', tables.contract_templates);

    // Level 3: Depend on level 2 tables
    await upsertTable('units', tables.units);
    await upsertTable('deals', tables.deals);
    
    await upsertTable('import_history', tables.import_history);
    await upsertTable('portal_listings', tables.portal_listings);
    await upsertTable('bank_statement_imports', tables.bank_statement_imports);

    // Level 4: Depend on level 3 tables
    await upsertTable('leases', tables.leases);
    await upsertTable('documents', tables.documents);
    await upsertTable('visits', tables.visits);
    await upsertTable('sales', tables.sales);
    await upsertTable('deal_activities', tables.deal_activities);
    await upsertTable('deal_tasks', tables.deal_tasks);
    await upsertTable('deal_stage_history', tables.deal_stage_history);
    await upsertTable('financial_transactions', tables.financial_transactions);
    await upsertTable('bank_statement_entries', tables.bank_statement_entries);
    await upsertTable('balance_audits', tables.balance_audits);

    // Level 5: Depend on level 4 tables
    await upsertTable('lease_adjustments', tables.lease_adjustments);
    await upsertTable('notification_logs', tables.notification_logs);
    await upsertTable('generated_documents', tables.generated_documents);

    // SECURITY: audit_logs are append-only and created by triggers/service code only.
    // Subscriptions and early_adopter_claims contain billing state managed exclusively
    // by Stripe webhooks. None of these tables may be written via user-driven import.
    if (tables.audit_logs?.length) {
      results['audit_logs'] = { inserted: 0, errors: ['skipped: audit_logs are not importable'] };
    }
    if (tables.subscriptions?.length) {
      results['subscriptions'] = { inserted: 0, errors: ['skipped: subscriptions are managed by Stripe and cannot be imported'] };
    }
    if (tables.early_adopter_claims?.length) {
      results['early_adopter_claims'] = { inserted: 0, errors: ['skipped: early_adopter_claims are not importable'] };
    }

    // Calculate statistics
    const statistics = {
      total_tables_processed: Object.keys(results).length,
      total_records_inserted: Object.values(results).reduce((sum, r) => sum + r.inserted, 0),
      total_errors: Object.values(results).reduce((sum, r) => sum + r.errors.length, 0),
      tables_with_errors: Object.entries(results)
        .filter(([_, r]) => r.errors.length > 0)
        .map(([name]) => name),
    };

    console.log(`Import completed. Statistics:`, statistics);

    return new Response(
      JSON.stringify({
        success: true,
        imported_at: new Date().toISOString(),
        user_id: brokerId,
        results,
        statistics
      }, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to import data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
