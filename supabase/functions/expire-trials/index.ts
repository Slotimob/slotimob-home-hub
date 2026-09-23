import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';
import { corsHeaders } from '../_shared/cors.ts';


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const cronSecret = req.headers.get("x-cron-secret");
  const { data: isValidCron, error: cronCheckError } = await supabase.rpc("verify_cron_secret", { p_secret: cronSecret });
  if (cronCheckError || !isValidCron) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {

    // ============ Step 1: expired trials ============

    // Find expired trials
    const { data: expiredTrials, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_id, trial_ends_at")
      .eq("status", "trialing")
      .lt("trial_ends_at", new Date().toISOString());

    let processed = 0;

    if (fetchError) {
      safeError('[expire-trials] Error fetching expired trials:', fetchError);
    } else if (!expiredTrials || expiredTrials.length === 0) {
      safeLog('No expired trials found.');
    } else {
      safeLog('Found %s expired trial(s) to downgrade.', expiredTrials.length);

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
          safeError('[expire-trials] Error downgrading subscription %s:', sub.id, updateError);
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
    }

    // ============ Step 2: finalize scheduled cancellations whose paid period ended ============

    const nowIso = new Date().toISOString();

    const { data: endedCancellations, error: fetchCancelledError } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_id, status, current_period_end, canceled_at")
      .eq("cancel_at_period_end", true)
      .lt("current_period_end", nowIso);

    let finalized = 0;

    if (fetchCancelledError) {
      safeError('[expire-trials] Error fetching ended scheduled cancellations:', fetchCancelledError);
    } else if (!endedCancellations || endedCancellations.length === 0) {
      safeLog('No ended scheduled cancellations to finalize.');
    } else {
      safeLog('Found %s scheduled cancellation(s) with ended paid period.', endedCancellations.length);

      for (const sub of endedCancellations) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            plan_id: "start",
            status: "active",
            cancel_at_period_end: false,
            asaas_subscription_id: null,
            billing_cycle: null,
            current_period_start: null,
            current_period_end: null,
            updated_at: nowIso,
          })
          .eq("id", sub.id);

        if (updateError) {
          safeError('[expire-trials] Error finalizing cancelled subscription %s:', sub.id, updateError);
          continue;
        }

        await supabase.from("audit_logs").insert({
          broker_id: sub.user_id,
          action: "subscription_period_ended_downgrade",
          table_name: "subscriptions",
          record_id: sub.id,
          old_data: { plan_id: sub.plan_id, status: sub.status },
          new_data: { plan_id: "start", status: "active" },
          metadata: {
            current_period_end: sub.current_period_end,
            canceled_at: sub.canceled_at,
          },
        });

        finalized++;
        safeLog('Finalized cancelled subscription %s: user %s downgraded to start plan.', sub.id, sub.user_id);
      }
    }

    return new Response(JSON.stringify({ processed, finalized }), {
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
