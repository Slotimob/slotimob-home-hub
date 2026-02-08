import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log(`Importing data for broker: ${brokerId}`);

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
      const sanitizedProfile = { ...profile, id: brokerId };
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
    await upsertTable('property_documents', tables.property_documents);
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
    await upsertTable('audit_logs', tables.audit_logs);

    // User-owned tables (use user_id instead of broker_id)
    await upsertUserTable('subscriptions', tables.subscriptions);
    await upsertUserTable('early_adopter_claims', tables.early_adopter_claims);

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
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Failed to import data', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
