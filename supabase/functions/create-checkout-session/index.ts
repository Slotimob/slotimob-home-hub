import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    logStep("User authenticated", { userId, email: userEmail });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { plan_id, billing_cycle = 'monthly', mode = 'trial' } = await req.json();
    if (!plan_id || !['essencial', 'pro', 'business'].includes(plan_id)) {
      throw new Error("Invalid plan_id. Must be 'essencial', 'pro', or 'business'");
    }
    if (!['monthly', 'annual'].includes(billing_cycle)) {
      throw new Error("Invalid billing_cycle. Must be 'monthly' or 'annual'");
    }
    logStep("Plan selected", { plan_id, billing_cycle });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check existing subscription
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, plan_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (existingSub && existingSub.plan_id === plan_id) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        const origin = req.headers.get("origin") || "https://slotimob.lovable.app";
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customers.data[0].id,
          return_url: `${origin}/settings`,
        });
        return new Response(JSON.stringify({ 
          url: portalSession.url,
          type: 'portal',
          message: 'Você já possui este plano. Redirecionando para gerenciamento.' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Fetch plan price IDs from database
    const { data: planData, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('stripe_price_id_monthly, stripe_price_id_yearly, stripe_price_id_early_adopter')
      .eq('id', plan_id)
      .single();

    if (planError || !planData) {
      throw new Error(`Plan '${plan_id}' not found in database`);
    }

    // Check Early Adopter availability
    const { data: remainingSlots, error: slotsError } = await supabaseAdmin.rpc(
      'get_early_adopter_remaining_slots',
      { p_plan_id: plan_id }
    );

    if (slotsError) {
      logStep("Error checking early adopter slots", { error: slotsError.message });
    }

    const isEarlyAdopter = remainingSlots && remainingSlots > 0;

    // Select the correct Stripe price ID based on early adopter status and billing cycle
    let priceId: string | null = null;
    if (isEarlyAdopter) {
      priceId = planData.stripe_price_id_early_adopter;
    } else if (billing_cycle === 'annual') {
      priceId = planData.stripe_price_id_yearly;
    } else {
      priceId = planData.stripe_price_id_monthly;
    }

    if (!priceId) {
      throw new Error(`No Stripe price configured for ${plan_id} ${billing_cycle} (early_adopter: ${isEarlyAdopter})`);
    }

    const skipTrial = mode === 'immediate';
    logStep("Price selected", { priceId, isEarlyAdopter, remainingSlots: remainingSlots || 0, billing_cycle, skipTrial });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    const origin = req.headers.get("origin") || "https://slotimob.lovable.app";
    
    // Create Embedded Checkout session (ui_mode: 'embedded')
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded",
      subscription_data: {
        ...(skipTrial ? {} : { trial_period_days: 14 }),
        metadata: {
          user_id: userId,
          plan_id: plan_id,
          billing_cycle: billing_cycle,
          is_early_adopter: String(isEarlyAdopter),
        },
      },
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        user_id: userId,
        plan_id: plan_id,
        billing_cycle: billing_cycle,
        is_early_adopter: String(isEarlyAdopter),
      },
    });

    logStep("Embedded checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      clientSecret: session.client_secret,
      type: 'embedded',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
