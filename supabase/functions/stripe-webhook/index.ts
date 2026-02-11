import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Product IDs for add-on detection
const ADDON_PRODUCT_IDS = {
  extra_user: 'prod_TxLj0Tr0pWaIOe',
  extra_units: 'prod_TxLk3rrSDN5a3t',
};

const CREDIT_PRODUCT_IDS: Record<string, { type: 'whatsapp' | 'ai'; credits: number }> = {
  'prod_TxLl2AQ7sgNiwS': { type: 'whatsapp', credits: 500 },
  'prod_TxLn14geNfUh5F': { type: 'ai', credits: 100 },
};

async function handleCheckoutCompleted(
  event: Stripe.Event,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>
) {
  const session = event.data.object as Stripe.Checkout.Session;
  logStep("Processing checkout.session.completed", { sessionId: session.id, mode: session.mode });

  const userId = session.metadata?.user_id;

  // Handle one-time credit purchases
  if (session.mode === 'payment') {
    const addonType = session.metadata?.addon_type;
    if (!userId || !addonType) {
      logStep("Missing metadata for credit purchase", { metadata: session.metadata });
      return;
    }

    // Expand line items to get product info
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
    
    for (const item of lineItems.data) {
      const productId = typeof item.price?.product === 'string' ? item.price.product : '';
      const creditConfig = CREDIT_PRODUCT_IDS[productId];
      
      if (creditConfig) {
        const totalCredits = creditConfig.credits * (item.quantity || 1);
        
        if (creditConfig.type === 'whatsapp') {
          const { error } = await supabase.from('whatsapp_message_credits').insert({
            broker_id: userId,
            credits_purchased: totalCredits,
            credits_remaining: totalCredits,
            price_paid: (item.amount_total || 0) / 100,
            stripe_payment_id: session.payment_intent as string,
            credit_type: 'whatsapp',
          });
          if (error) logStep("Error inserting WhatsApp credits", { error: error.message });
          else logStep("WhatsApp credits added", { userId, credits: totalCredits });
        } else {
          const { error } = await supabase.from('ai_credits').insert({
            broker_id: userId,
            credits_purchased: totalCredits,
            credits_remaining: totalCredits,
            price_paid: (item.amount_total || 0) / 100,
            stripe_payment_id: session.payment_intent as string,
          });
          if (error) logStep("Error inserting AI credits", { error: error.message });
          else logStep("AI credits added", { userId, credits: totalCredits });
        }
      }
    }
    return;
  }

  // Handle subscription checkout
  const planId = session.metadata?.plan_id;
  const isEarlyAdopter = session.metadata?.is_early_adopter === "true";

  if (!userId || !planId) {
    logStep("Missing metadata in session", { metadata: session.metadata });
    return;
  }

  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const priceLocked = isEarlyAdopter
    ? subscription.items.data[0].price.unit_amount
    : null;

  const { error: subError } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      is_early_adopter: isEarlyAdopter,
      price_locked: priceLocked,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (subError) {
    logStep("Error upserting subscription", { error: subError.message });
    throw subError;
  }

  logStep("Subscription created/updated", { userId, planId, isEarlyAdopter });

  if (isEarlyAdopter) {
    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (subscriptionData) {
      const { error: claimError } = await supabase
        .from("early_adopter_claims")
        .insert({
          user_id: userId,
          plan_id: planId,
          subscription_id: subscriptionData.id,
          claimed_at: new Date().toISOString(),
        });

      if (claimError && !claimError.message.includes("duplicate")) {
        logStep("Error creating early adopter claim", { error: claimError.message });
      } else {
        logStep("Early adopter claim registered", { userId, planId });
      }
    }
  }
}

function syncAddonsFromSubscription(subscription: Stripe.Subscription) {
  let extraUsers = 0;
  let extraUnitPacks = 0;

  for (const item of subscription.items.data) {
    const productId = typeof item.price.product === 'string' ? item.price.product : '';
    if (productId === ADDON_PRODUCT_IDS.extra_user) {
      extraUsers = item.quantity || 0;
    } else if (productId === ADDON_PRODUCT_IDS.extra_units) {
      extraUnitPacks = item.quantity || 0;
    }
  }

  return { extraUsers, extraUnitPacks };
}

async function handleSubscriptionUpdated(
  event: Stripe.Event,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>
) {
  const subscription = event.data.object as Stripe.Subscription;
  logStep("Processing subscription updated", { subscriptionId: subscription.id });

  const { extraUsers, extraUnitPacks } = syncAddonsFromSubscription(subscription);

  const status = subscription.status === "active" ? "active"
    : subscription.status === "past_due" ? "past_due"
    : subscription.status === "canceled" ? "cancelled"
    : subscription.status;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      extra_users_count: extraUsers,
      extra_unit_packs: extraUnitPacks,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    logStep("Error updating subscription", { error: error.message });
  } else {
    logStep("Subscription updated", { status, extraUsers, extraUnitPacks });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event, stripe, supabase);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event, stripe, supabase);
        break;

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription deleted", { subscriptionId: subscription.id });

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            extra_users_count: 0,
            extra_unit_packs: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) logStep("Error cancelling subscription", { error: error.message });
        else logStep("Subscription cancelled");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", invoice.subscription as string);
          logStep("Subscription marked as past_due");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", invoice.subscription as string);
          logStep("Subscription confirmed active after payment");
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
