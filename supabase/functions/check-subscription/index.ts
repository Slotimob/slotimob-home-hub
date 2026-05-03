import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  safeLog('[CHECK-SUBSCRIPTION] %s%s', step, detailsStr);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client for user verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Unauthorized");
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    logStep("User authenticated", { userId, email: userEmail });

    // Service client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // First check our database
    const { data: dbSubscription, error: dbError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (dbError) {
      logStep("Database query error", { error: dbError.message });
    }

    // If we have an active subscription in DB, also verify with Stripe
    if (dbSubscription?.stripe_subscription_id) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          dbSubscription.stripe_subscription_id
        );

        if (stripeSubscription.status === "active") {
          logStep("Active subscription confirmed with Stripe", {
            planId: dbSubscription.plan_id,
            isEarlyAdopter: dbSubscription.is_early_adopter
          });

          return new Response(JSON.stringify({
            subscribed: true,
            plan_id: dbSubscription.plan_id,
            is_early_adopter: dbSubscription.is_early_adopter,
            subscription_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } else {
          // Stripe says not active, update our DB
          logStep("Stripe subscription not active, updating DB", { 
            stripeStatus: stripeSubscription.status 
          });

          await supabaseAdmin
            .from("subscriptions")
            .update({ 
              status: stripeSubscription.status === "canceled" ? "cancelled" : stripeSubscription.status,
              updated_at: new Date().toISOString()
            })
            .eq("id", dbSubscription.id);
        }
      } catch (stripeError) {
        logStep("Error checking Stripe subscription", { 
          error: stripeError instanceof Error ? stripeError.message : String(stripeError) 
        });
      }
    }

    // Check Stripe directly by email as fallback
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active Stripe subscription found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const planId = subscription.metadata?.plan_id || "unknown";
    const isEarlyAdopter = subscription.metadata?.is_early_adopter === "true";

    logStep("Active subscription found in Stripe", { planId, isEarlyAdopter });

    return new Response(JSON.stringify({
      subscribed: true,
      plan_id: planId,
      is_early_adopter: isEarlyAdopter,
      subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    // Return generic error to prevent information leakage
    return new Response(JSON.stringify({ error: "Failed to check subscription status" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
