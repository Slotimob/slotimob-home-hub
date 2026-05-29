import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find expired deliveries with files still present
    const { data: expired, error } = await supabaseAdmin
      .from("data_export_requests")
      .select("id, delivery_file_path, organization_owner_id")
      .eq("status", "delivered")
      .not("delivery_file_path", "is", null)
      .lt("expires_at", new Date().toISOString());

    if (error) {
      console.error("Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let purged = 0;
    for (const req of expired || []) {
      // Remove file from storage
      const { error: removeError } = await supabaseAdmin.storage
        .from("client-deliveries")
        .remove([req.delivery_file_path]);

      if (removeError) {
        safeWarn('Failed to remove %s:', req.delivery_file_path, removeError.message);
        continue;
      }

      // Clear file path (keep record for history)
      await supabaseAdmin
        .from("data_export_requests")
        .update({ delivery_file_path: null })
        .eq("id", req.id);

      // Audit log
      await supabaseAdmin
        .from("audit_logs")
        .insert({
          broker_id: req.organization_owner_id,
          actor_user_id: null,
          action: "data_export_purged",
          table_name: "data_export_requests",
          record_id: req.id,
          metadata: { request_id: req.id, organization_owner_id: req.organization_owner_id },
        });

      purged++;
    }

    return new Response(
      JSON.stringify({ success: true, purged, total_expired: expired?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("purge-expired-deliveries error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
