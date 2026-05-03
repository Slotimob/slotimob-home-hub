import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find expired trials
    const { data: expiredTrials, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_id, trial_ends_at")
      .eq("status", "trialing")
      .lt("trial_ends_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired trials:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      console.log("No expired trials found.");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    safeLog('Found %s expired trial(s) to downgrade.', expiredTrials.length);

    let processed = 0;

    for (const sub of expiredTrials) {
      // Downgrade to start plan
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan_id: "start",
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      if (updateError) {
        safeError('Error downgrading subscription %s:', sub.id, updateError);
        continue;
      }

      // Log the transition in audit_logs
      await supabase.from("audit_logs").insert({
        broker_id: sub.user_id,
        action: "trial_expired_downgrade",
        table_name: "subscriptions",
        record_id: sub.id,
        old_data: { plan_id: sub.plan_id, status: "trialing" },
        new_data: { plan_id: "start", status: "active" },
        metadata: {
          trial_ends_at: sub.trial_ends_at,
          downgraded_at: new Date().toISOString(),
        },
      });

      processed++;
      safeLog('Downgraded user %s from trial to start plan.', sub.user_id);
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
