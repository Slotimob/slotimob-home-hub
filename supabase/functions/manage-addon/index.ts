import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  safeLog('[MANAGE-ADDON] %s%s', step, detailsStr);
};

Deno.serve(async (req) => {
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

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseAuthAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuthAdmin.auth.getUser(token);
    if (userError || !user) {
      safeWarn('JWT inválido ou expirado: %s', userError?.message);
      throw new Error("Unauthorized");
    }

    const userId = user.id;
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error("Invalid user context");
    }
    logStep("User authenticated", { userId });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { priceId, quantity = 1 } = await req.json();

    if (!priceId) throw new Error("priceId is required");
    if (quantity < 1) throw new Error("quantity must be >= 1");

    // Get user's active subscription
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      throw new Error("No active subscription found. Please subscribe to a plan first.");
    }

    logStep("Subscription found", { subscriptionId: sub.stripe_subscription_id });

    // Retrieve current subscription
    const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

    // Check if this priceId already exists in subscription items
    const existingItem = subscription.items.data.find(
      (item: Stripe.SubscriptionItem) => item.price.id === priceId
    );

    if (existingItem) {
      // Update quantity (add to current)
      const newQuantity = (existingItem.quantity || 0) + quantity;
      await stripe.subscriptionItems.update(existingItem.id, {
        quantity: newQuantity,
      });
      logStep("Addon updated", { itemId: existingItem.id, oldQty: existingItem.quantity, newQty: newQuantity });
    } else {
      // Create new subscription item
      await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price: priceId,
        quantity,
      });
      logStep("Addon created", { priceId, quantity });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
