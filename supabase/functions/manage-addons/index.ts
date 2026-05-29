import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';
import { corsHeaders } from '../_shared/cors.ts';


const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  safeLog('[MANAGE-ADDONS] %s%s', step, detailsStr);
};

// Stripe Product IDs → Price lookup
const ADDON_PRODUCTS: Record<string, { type: 'subscription_addon' | 'one_time'; product_id: string }> = {
  extra_user: { type: 'subscription_addon', product_id: 'prod_TxLj0Tr0pWaIOe' },
  extra_units: { type: 'subscription_addon', product_id: 'prod_TxLk3rrSDN5a3t' },
  credits_whatsapp: { type: 'one_time', product_id: 'prod_TxLl2AQ7sgNiwS' },
  credits_ai: { type: 'one_time', product_id: 'prod_TxLn14geNfUh5F' },
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Unauthorized");

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    logStep("User authenticated", { userId });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { action, addon_type, quantity = 1 } = await req.json();

    if (!addon_type || !ADDON_PRODUCTS[addon_type]) {
      throw new Error("Invalid addon_type");
    }

    const addonConfig = ADDON_PRODUCTS[addon_type];
    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") ?? "https://app.slotimob.com.br";

    // Get the first active price for this product
    const prices = await stripe.prices.list({
      product: addonConfig.product_id,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      throw new Error(`No active price found for product ${addonConfig.product_id}`);
    }

    const priceId = prices.data[0].id;
    logStep("Price found", { priceId, addon_type });

    if (addonConfig.type === 'one_time') {
      // One-time payment for credits (WhatsApp or AI)
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      let customerId: string | undefined;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : userEmail,
        line_items: [{ price: priceId, quantity }],
        mode: "payment",
        success_url: `${origin}/settings?credit_success=true`,
        cancel_url: `${origin}/settings`,
        metadata: {
          user_id: userId,
          addon_type,
          quantity: String(quantity),
        },
      });

      logStep("One-time checkout created", { sessionId: session.id });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Subscription add-on: modify existing subscription
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      throw new Error("No active subscription found. Please subscribe to a plan first.");
    }

    if (action === 'add' || action === 'update') {
      // Get existing subscription
      const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

      // Check if this addon item already exists
      const existingItem = subscription.items.data.find(
        (item: Stripe.SubscriptionItem) => item.price.product === addonConfig.product_id
      );

      if (existingItem) {
        // Update quantity
        await stripe.subscriptionItems.update(existingItem.id, {
          quantity,
        });
        logStep("Addon updated", { itemId: existingItem.id, quantity });
      } else {
        // Add new item
        await stripe.subscriptionItems.create({
          subscription: sub.stripe_subscription_id,
          price: priceId,
          quantity,
        });
        logStep("Addon added", { priceId, quantity });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === 'remove') {
      const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const existingItem = subscription.items.data.find(
        (item: Stripe.SubscriptionItem) => item.price.product === addonConfig.product_id
      );

      if (existingItem) {
        await stripe.subscriptionItems.del(existingItem.id, {
          proration_behavior: 'create_prorations',
        });
        logStep("Addon removed", { itemId: existingItem.id });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action. Use 'add', 'update', or 'remove'.");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
