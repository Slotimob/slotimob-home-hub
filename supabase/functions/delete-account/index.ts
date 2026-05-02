import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client to verify the user
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { confirmation_text, reason, skip_export_check } = await req.json();

    if (confirmation_text !== "EXCLUIR MINHA CONTA") {
      return new Response(
        JSON.stringify({ error: "Texto de confirmação inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for export check
    const supabaseCheck = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Export guard: require recent delivered export OR explicit skip
    if (!skip_export_check) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentExport } = await supabaseCheck
        .from("data_export_requests")
        .select("id")
        .eq("organization_owner_id", user.id)
        .eq("status", "delivered")
        .gte("delivered_at", thirtyDaysAgo)
        .limit(1);

      if (!recentExport || recentExport.length === 0) {
        return new Response(
          JSON.stringify({ error: "Solicite uma exportação dos seus dados ou confirme explicitamente que não precisa." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Service role client for deletions
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userId = user.id;
    const userEmail = user.email || "";

    // Get profile info before deletion
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    // Get subscription info
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", userId)
      .single();

    // 1. Log the deletion consent
    await supabaseAdmin.from("account_deletion_logs").insert({
      user_id: userId,
      user_email: userEmail,
      user_name: profile?.full_name || null,
      plan_id: subscription?.plan_id || null,
      deletion_reason: reason || null,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
      metadata: {
        subscription_status: subscription?.status || "none",
        deleted_at: new Date().toISOString(),
      },
    });

    // 2. Delete all user data from all tables (order matters for FK constraints)
    const tablesToClean = [
      { table: "data_export_requests", column: "requested_by" },
      { table: "deal_activities", column: "broker_id" },
      { table: "deal_stage_history", column: "broker_id" },
      { table: "deal_tasks", column: "broker_id" },
      { table: "deals", column: "broker_id" },
      { table: "notification_logs", column: "broker_id" },
      { table: "documents", column: "broker_id" },
      { table: "generated_documents", column: "broker_id" },
      { table: "lease_adjustments", column: "broker_id" },
      { table: "leases", column: "broker_id" },
      { table: "sales", column: "broker_id" },
      { table: "visits", column: "broker_id" },
      { table: "units", column: "broker_id" },
      { table: "properties", column: "broker_id" },
      { table: "import_history", column: "broker_id" },
      { table: "financial_transactions", column: "broker_id" },
      { table: "financial_categories", column: "broker_id" },
      { table: "bank_statement_entries", column: "broker_id" },
      { table: "bank_statement_imports", column: "broker_id" },
      { table: "balance_audits", column: "broker_id" },
      { table: "bank_accounts", column: "broker_id" },
      { table: "contacts", column: "broker_id" },
      { table: "leads", column: "broker_id" },
      { table: "companies", column: "broker_id" },
      { table: "chat_messages", column: "broker_id" },
      { table: "ai_credits", column: "broker_id" },
      { table: "email_notifications", column: "broker_id" },
      { table: "integrations", column: "broker_id" },
      { table: "custom_obligation_types", column: "broker_id" },
      { table: "contract_templates", column: "broker_id" },
      { table: "audit_logs", column: "broker_id" },
      { table: "consent_logs", column: "user_id" },
      { table: "organization_members", column: "organization_owner_id" },
      { table: "organization_members", column: "user_id" },
      { table: "early_adopter_claims", column: "user_id" },
      { table: "user_roles", column: "user_id" },
      { table: "subscriptions", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    for (const { table, column } of tablesToClean) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, userId);

      if (error) {
        console.warn(`Warning: failed to delete from ${table}: ${error.message}`);
      }
    }

    // 3. Delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir conta de autenticação. Contate o suporte." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Conta excluída com sucesso." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar exclusão." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
