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
  safeLog('[CREATE-CHECKOUT] %s%s', step, detailsStr);
};

// Known credit price IDs → metadata
const CREDIT_PRICES: Record<string, { credits: number; label: string }> = {
  'price_1TDWqAAUMiQcSICyoAmLJb3j': { credits: 500, label: '500 Créditos IA' },
  'price_1TDWqAAUMiQcSICysOQz0Vbd': { credits: 1000, label: '1000 Créditos IA' },
  'price_1TDWqAAUMiQcSICy3JWgkiA4': { credits: 2000, label: '2000 Créditos IA' },
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

    // --- Auth: optional (guest checkout allowed for plans) ---
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader && authHeader !== `Bearer ${supabaseAnonKey}`) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (!claimsError && claimsData?.claims) {
        userId = claimsData.claims.sub as string;
        userEmail = claimsData.claims.email as string;
        logStep("User authenticated", { userId, email: userEmail });
      }
    }

    const isGuest = !userId;
    logStep("Auth status", { isGuest });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.json();
    const { type = 'plan', priceId: directPriceId, plan_id, billing_cycle = 'monthly', mode = 'trial', customer_email, quantity = 1 } = body;

    const origin = req.headers.get("origin") || "https://slotimob.lovable.app";

    // ==========================================
    // TYPE: CREDIT (one-time payment)
    // ==========================================
    if (type === 'credit') {
      if (!directPriceId) throw new Error("priceId is required for credit purchases");
      if (!userId) throw new Error("Authentication required for credit purchases");

      const creditConfig = CREDIT_PRICES[directPriceId];
      if (!creditConfig) throw new Error("Invalid credit priceId");

      logStep("Credit purchase", { priceId: directPriceId, credits: creditConfig.credits });

      // Find or create Stripe customer
      let customerId: string | undefined;
      if (userEmail) {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) customerId = customers.data[0].id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : (userEmail || undefined),
        line_items: [{ price: directPriceId, quantity }],
        mode: "payment",
        success_url: `${origin}/settings?credit_success=true`,
        cancel_url: `${origin}/settings`,
        metadata: {
          user_id: userId,
          type: 'credit',
          credit_price_id: directPriceId,
          credits: String(creditConfig.credits),
        },
      });

      logStep("Credit checkout session created", { sessionId: session.id });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // TYPE: ADDON (modify existing subscription)
    // ==========================================
    if (type === 'addon') {
      if (!directPriceId) throw new Error("priceId is required for addon purchases");
      if (!userId) throw new Error("Authentication required for addon purchases");

      logStep("Addon purchase", { priceId: directPriceId });

      // Get existing subscription
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_subscription_id, stripe_customer_id')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      if (!sub?.stripe_subscription_id) {
        throw new Error("No active subscription found. Please subscribe to a plan first.");
      }

      // Add the addon item to the subscription
      await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price: directPriceId,
        quantity,
      });

      logStep("Addon added to subscription", { priceId: directPriceId, quantity });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // TYPE: PLAN (subscription checkout)
    // ==========================================
    if (!plan_id || !['essencial', 'pro', 'business'].includes(plan_id)) {
      throw new Error("Invalid plan_id. Must be 'essencial', 'pro', or 'business'");
    }
    if (!['monthly', 'annual'].includes(billing_cycle)) {
      throw new Error("Invalid billing_cycle. Must be 'monthly' or 'annual'");
    }
    logStep("Plan selected", { plan_id, billing_cycle, mode });

    // --- For authenticated users: check existing subscription ---
    if (!isGuest) {
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, status, plan_id')
        .eq('user_id', userId!)
        .in('status', ['active', 'trialing'])
        .maybeSingle();

      if (existingSub && existingSub.plan_id === plan_id) {
        const customers = await stripe.customers.list({ email: userEmail!, limit: 1 });
        if (customers.data.length > 0) {
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
    }

    // Fetch plan price IDs from database
    const { data: planData, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('stripe_price_id_monthly, stripe_price_id_yearly, stripe_price_id_early_adopter, stripe_price_id_annual_early_adopter')
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

    // Select the correct Stripe price ID
    let priceId: string | null = null;
    if (isEarlyAdopter) {
      if (billing_cycle === 'annual') {
        priceId = planData.stripe_price_id_annual_early_adopter || planData.stripe_price_id_early_adopter;
      } else {
        priceId = planData.stripe_price_id_early_adopter;
      }
      if (!priceId) {
        logStep("EA price not configured, falling back to standard pricing", { plan_id, billing_cycle });
      }
    }
    
    if (!priceId) {
      if (billing_cycle === 'annual') {
        priceId = planData.stripe_price_id_yearly;
      } else {
        priceId = planData.stripe_price_id_monthly;
      }
    }

    if (!priceId) {
      throw new Error(`No Stripe price configured for ${plan_id} ${billing_cycle}`);
    }

    const requestedEA = remainingSlots !== null && remainingSlots <= 0;
    if (requestedEA) {
      logStep("Early Adopter slots exhausted — using standard pricing", { plan_id, remainingSlots });
    }

    const skipTrial = mode === 'immediate' || isGuest;
    logStep("Price selected", { priceId, isEarlyAdopter, remainingSlots: remainingSlots || 0, billing_cycle, skipTrial, isGuest });

    // Find existing Stripe customer by email
    const emailForLookup = userEmail || customer_email;
    let customerId: string | undefined;
    if (emailForLookup) {
      const customers = await stripe.customers.list({ email: emailForLookup, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing Stripe customer found", { customerId });
      }
    }

    // Build metadata
    const sessionMetadata: Record<string, string> = {
      plan_id: plan_id,
      billing_cycle: billing_cycle,
      is_early_adopter: String(isEarlyAdopter),
      checkout_mode: skipTrial ? 'immediate' : 'trial',
      type: 'plan',
    };
    if (userId) sessionMetadata.user_id = userId;
    if (isGuest) sessionMetadata.guest_checkout = 'true';

    // Create Embedded Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : (userEmail || undefined),
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded",
      subscription_data: {
        ...(skipTrial ? {} : { trial_period_days: 14 }),
        metadata: sessionMetadata,
      },
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}${isGuest ? '&guest=true' : ''}`,
      metadata: sessionMetadata,
    });

    logStep("Embedded checkout session created", { sessionId: session.id, isGuest });

    return new Response(JSON.stringify({ 
      clientSecret: session.client_secret,
      type: 'embedded',
      ...(requestedEA ? { ea_exhausted: true, message: 'As vagas Early Adopter para este plano se esgotaram. Você será cobrado no preço padrão.' } : {}),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
