import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for full access
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
    safeLog('Exporting all data for broker: %s', brokerId);

    // Fetch all tables data in parallel
    const [
      profilesResult,
      contactsResult,
      propertiesResult,
      unitsResult,
      leadsResult,
      ownersResult,
      companiesResult,
      dealsResult,
      dealActivitiesResult,
      dealTasksResult,
      dealStageHistoryResult,
      leasesResult,
      leaseAdjustmentsResult,
      financialTransactionsResult,
      financialCategoriesResult,
      bankAccountsResult,
      bankStatementEntriesResult,
      bankStatementImportsResult,
      balanceAuditsResult,
      documentsResult,
      propertyDocumentsResult,
      visitsResult,
      salesResult,
      pipelineStagesResult,
      contractTemplatesResult,
      integrationsResult,
      portalConnectionsResult,
      portalListingsResult,
      notificationLogsResult,
      importHistoryResult,
      customObligationTypesResult,
      generatedDocumentsResult,
      subscriptionsResult,
      earlyAdopterClaimsResult,
      auditLogsResult
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', brokerId),
      supabaseAdmin.from('contacts').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('properties').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('units').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('leads').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('owners').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('companies').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('deals').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('deal_activities').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('deal_tasks').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('deal_stage_history').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('leases').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('lease_adjustments').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('financial_transactions').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('financial_categories').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('bank_accounts').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('bank_statement_entries').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('bank_statement_imports').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('balance_audits').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('documents').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('property_documents').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('visits').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('sales').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('pipeline_stages').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('contract_templates').select('*').or(`broker_id.eq.${brokerId},is_public.eq.true`),
      supabaseAdmin.from('integrations').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('portal_connections').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('portal_listings').select('*, portal_connections!inner(broker_id)').eq('portal_connections.broker_id', brokerId),
      supabaseAdmin.from('notification_logs').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('import_history').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('custom_obligation_types').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('generated_documents').select('*').eq('broker_id', brokerId),
      supabaseAdmin.from('subscriptions').select('*').eq('user_id', brokerId),
      supabaseAdmin.from('early_adopter_claims').select('*').eq('user_id', brokerId),
      supabaseAdmin.from('audit_logs').select('*').eq('broker_id', brokerId).order('created_at', { ascending: false }).limit(1000)
    ]);

    // Build export object
    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: brokerId,
      user_email: user.email,
      tables: {
        profiles: profilesResult.data || [],
        contacts: contactsResult.data || [],
        properties: propertiesResult.data || [],
        units: unitsResult.data || [],
        leads: leadsResult.data || [],
        owners: ownersResult.data || [],
        companies: companiesResult.data || [],
        deals: dealsResult.data || [],
        deal_activities: dealActivitiesResult.data || [],
        deal_tasks: dealTasksResult.data || [],
        deal_stage_history: dealStageHistoryResult.data || [],
        leases: leasesResult.data || [],
        lease_adjustments: leaseAdjustmentsResult.data || [],
        financial_transactions: financialTransactionsResult.data || [],
        financial_categories: financialCategoriesResult.data || [],
        bank_accounts: bankAccountsResult.data || [],
        bank_statement_entries: bankStatementEntriesResult.data || [],
        bank_statement_imports: bankStatementImportsResult.data || [],
        balance_audits: balanceAuditsResult.data || [],
        documents: documentsResult.data || [],
        property_documents: propertyDocumentsResult.data || [],
        visits: visitsResult.data || [],
        sales: salesResult.data || [],
        pipeline_stages: pipelineStagesResult.data || [],
        contract_templates: contractTemplatesResult.data || [],
        integrations: integrationsResult.data || [],
        portal_connections: portalConnectionsResult.data || [],
        portal_listings: portalListingsResult.data || [],
        notification_logs: notificationLogsResult.data || [],
        import_history: importHistoryResult.data || [],
        custom_obligation_types: customObligationTypesResult.data || [],
        generated_documents: generatedDocumentsResult.data || [],
        subscriptions: subscriptionsResult.data || [],
        early_adopter_claims: earlyAdopterClaimsResult.data || [],
        audit_logs: auditLogsResult.data || [],
      },
      statistics: {
        total_contacts: (contactsResult.data || []).length,
        total_properties: (propertiesResult.data || []).length,
        total_units: (unitsResult.data || []).length,
        total_leads: (leadsResult.data || []).length,
        total_deals: (dealsResult.data || []).length,
        total_leases: (leasesResult.data || []).length,
        total_transactions: (financialTransactionsResult.data || []).length,
        total_documents: (documentsResult.data || []).length,
        total_visits: (visitsResult.data || []).length,
        total_sales: (salesResult.data || []).length,
      }
    };

    console.log(`Export completed. Statistics:`, exportData.statistics);

    return new Response(
      JSON.stringify(exportData, null, 2),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="sloti-export-${new Date().toISOString().split('T')[0]}.json"`
        } 
      }
    );

  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to export data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
