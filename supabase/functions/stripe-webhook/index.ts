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

// Product IDs for add-on detection (legacy product-level matching)
const ADDON_PRODUCT_IDS = {
  extra_user: 'prod_TxLj0Tr0pWaIOe',
  extra_units: 'prod_TxLk3rrSDN5a3t',
};

// Price-level add-on detection (preferred over product IDs)
const ADDON_PRICE_IDS = {
  extra_user: 'price_1T7307AUMiQcSICyi27XGFK4',
  extra_units: 'price_1T72z0AUMiQcSICyrkWUm7fI',
};

const CREDIT_PRODUCT_IDS: Record<string, { type: 'whatsapp' | 'ai'; credits: number }> = {
  'prod_TxLl2AQ7sgNiwS': { type: 'whatsapp', credits: 500 },
};

// Known credit price IDs for direct matching
const CREDIT_PRICE_IDS: Record<string, { type: 'ai'; credits: number }> = {
  'price_1TDWqAAUMiQcSICyoAmLJb3j': { type: 'ai', credits: 500 },
  'price_1TDWqAAUMiQcSICysOQz0Vbd': { type: 'ai', credits: 1000 },
  'price_1TDWqAAUMiQcSICy3JWgkiA4': { type: 'ai', credits: 2000 },
};

/**
 * Find or create a Supabase user from a Stripe checkout session.
 * Returns the user_id to associate the subscription with.
 */
async function resolveUserId(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  // 1. If user_id is in metadata (authenticated checkout), use it directly
  const metaUserId = session.metadata?.user_id;
  if (metaUserId) {
    logStep("User ID from metadata", { userId: metaUserId });
    return metaUserId;
  }

  // 2. Guest checkout — resolve by email
  const customerEmail = session.customer_details?.email || session.customer_email;
  if (!customerEmail) {
    logStep("No email found in session — cannot resolve user");
    return null;
  }

  logStep("Webhook: Iniciando resolução de usuário para o e-mail", { email: customerEmail });

  // Search by email using the admin API
  const { data: userByEmail } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', customerEmail)
    .maybeSingle();

  if (userByEmail) {
    logStep("Existing user found by email", { userId: userByEmail.id, email: customerEmail });
    return userByEmail.id;
  }

  // 2b. Create new user via admin API
  logStep("Creating new user for guest checkout", { email: customerEmail });

  const tempPassword = crypto.randomUUID(); // They'll use password reset to set their own

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: customerEmail,
    password: tempPassword,
    email_confirm: true, // Auto-confirm since they paid
    user_metadata: {
      full_name: session.customer_details?.name || 'Usuário',
      created_via: 'guest_checkout',
      terms_accepted_at: new Date().toISOString(),
      terms_version: '2025-01',
    },
  });

  if (createError || !newUser?.user) {
    logStep("Error creating user", { error: createError?.message });
    return null;
  }

  logStep("New user created via guest checkout", { userId: newUser.user.id, email: customerEmail });

  // Send password reset email so the user can set their password
  const { error: resetError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: customerEmail,
    options: {
      redirectTo: 'https://slotimob.com.br/reset-password',
    },
  });

  if (resetError) {
    logStep("Warning: could not generate recovery link", { error: resetError.message });
  }

  // Send branded welcome email via send-email function
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userName = session.customer_details?.name || 'Usuário';
    
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        template: 'welcome',
        to: customerEmail,
        user_name: userName,
        dashboard_url: 'https://slotimob.lovable.app/dashboard',
        broker_id: newUser.user.id,
      }),
    });
    
    logStep("Welcome email sent to guest", { email: customerEmail, status: emailRes.status });
  } catch (emailErr) {
    logStep("Warning: could not send welcome email", { error: String(emailErr) });
  }

  return newUser.user.id;
}

async function handleCheckoutCompleted(
  event: Stripe.Event,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>
) {
  const session = event.data.object as Stripe.Checkout.Session;
  logStep("Processing checkout.session.completed", { sessionId: session.id, mode: session.mode });

  // Handle one-time credit purchases
  if (session.mode === 'payment') {
    const userId = session.metadata?.user_id;
    if (!userId) {
      logStep("Missing user_id metadata for credit purchase", { metadata: session.metadata });
      return;
    }

    // Check if this is a new-style credit purchase (with credit_price_id metadata)
    const creditPriceId = session.metadata?.credit_price_id;
    const metaCredits = session.metadata?.credits;

    if (creditPriceId && metaCredits) {
      const totalCredits = parseInt(metaCredits, 10);
      logStep("New-style credit purchase detected", { creditPriceId, totalCredits });

      const { error } = await supabase.from('ai_credits').insert({
        broker_id: userId,
        credits_purchased: totalCredits,
        credits_remaining: totalCredits,
        price_paid: (session.amount_total || 0) / 100,
        stripe_payment_id: session.payment_intent as string,
      });
      if (error) logStep("Error inserting AI credits", { error: error.message });
      else logStep("AI credits added", { userId, credits: totalCredits });
      return;
    }

    // Legacy: fallback to line item product ID matching
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
    
    for (const item of lineItems.data) {
      const priceId = item.price?.id || '';
      const productId = typeof item.price?.product === 'string' ? item.price.product : '';
      
      // Try matching by price ID first
      const creditByPrice = CREDIT_PRICE_IDS[priceId];
      if (creditByPrice) {
        const totalCredits = creditByPrice.credits * (item.quantity || 1);
        const { error } = await supabase.from('ai_credits').insert({
          broker_id: userId,
          credits_purchased: totalCredits,
          credits_remaining: totalCredits,
          price_paid: (item.amount_total || 0) / 100,
          stripe_payment_id: session.payment_intent as string,
        });
        if (error) logStep("Error inserting AI credits", { error: error.message });
        else logStep("AI credits added (by price)", { userId, credits: totalCredits });
        continue;
      }

      // Fallback to product ID matching
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

  // --- Handle subscription checkout ---
  const planId = session.metadata?.plan_id;
  const isEarlyAdopter = session.metadata?.is_early_adopter === "true";
  const isGuestCheckout = session.metadata?.guest_checkout === "true";

  // Validate plan_id matches known plans
  const VALID_PLANS = ['essencial', 'pro', 'business'];
  if (planId && !VALID_PLANS.includes(planId)) {
    logStep("CRITICAL: plan_id from Stripe metadata does not match known plans", { planId, validPlans: VALID_PLANS });
    throw new Error(`Invalid plan_id '${planId}' — expected one of: ${VALID_PLANS.join(', ')}`);
  }

  // Resolve user — creates account if guest (wrapped in try/catch for retry safety)
  let userId: string | null = null;
  try {
    userId = await resolveUserId(session, supabase);
  } catch (resolveErr) {
    const msg = resolveErr instanceof Error ? resolveErr.message : String(resolveErr);
    logStep("CRITICAL: Failed to resolve user — Stripe will retry this event", { error: msg });
    throw resolveErr; // Re-throw so Stripe gets 500 and retries
  }

  if (!userId || !planId) {
    const errMsg = `Could not resolve user (${userId}) or missing plan (${planId})`;
    logStep("CRITICAL: " + errMsg, { metadata: session.metadata });
    throw new Error(errMsg); // 500 → Stripe retries
  }

  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update subscription metadata with resolved user_id (for future webhooks)
  if (isGuestCheckout) {
    await stripe.subscriptions.update(subscriptionId, {
      metadata: { ...subscription.metadata, user_id: userId },
    });
    logStep("Updated Stripe subscription metadata with resolved user_id", { userId });
  }

  const priceLocked = isEarlyAdopter
    ? subscription.items.data[0].price.unit_amount
    : null;

  const safePeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : new Date().toISOString();
  const safePeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const subStatus = subscription.status === "active" ? "active" : subscription.status;

  const { error: subError } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan_id: planId,
      status: subStatus,
      is_early_adopter: isEarlyAdopter,
      price_locked: priceLocked,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      current_period_start: safePeriodStart,
      current_period_end: safePeriodEnd,
      // Clear trial when subscription is active (paid)
      trial_ends_at: subStatus === "active" ? null : undefined,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (subError) {
    logStep("CRITICAL: Error upserting subscription — Stripe will retry", { error: subError.message });
    throw subError; // 500 → Stripe retries
  }

  logStep("Subscription created/updated", { userId, planId, isEarlyAdopter, isGuestCheckout });

  if (isEarlyAdopter) {
    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

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
        logStep("Warning: Error creating early adopter claim (non-critical)", { error: claimError.message });
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

  const safePeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : undefined;
  const safePeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : undefined;

  const updatePayload: Record<string, unknown> = {
    status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    extra_users_count: extraUsers,
    extra_unit_packs: extraUnitPacks,
    updated_at: new Date().toISOString(),
  };
  if (safePeriodStart) updatePayload.current_period_start = safePeriodStart;
  if (safePeriodEnd) updatePayload.current_period_end = safePeriodEnd;

  // Clear trial when subscription becomes active (paid)
  if (status === "active") {
    updatePayload.trial_ends_at = null;
  }

  const { error } = await supabase
    .from("subscriptions")
    .update(updatePayload)
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

          const { data: subData } = await supabase
            .from("subscriptions")
            .select("user_id, plan_id")
            .eq("stripe_subscription_id", invoice.subscription as string)
            .maybeSingle();

          if (subData) {
            await supabase.from("audit_logs").insert({
              broker_id: subData.user_id,
              action: "stripe_payment_succeeded",
              table_name: "subscriptions",
              record_id: subData.user_id,
              new_data: {
                plan_id: subData.plan_id,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                invoice_id: invoice.id,
              },
              metadata: {
                stripe_subscription_id: invoice.subscription,
                billing_reason: invoice.billing_reason,
              },
            });
            logStep("Payment logged to audit_logs", { userId: subData.user_id, amount: invoice.amount_paid });
          }
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
