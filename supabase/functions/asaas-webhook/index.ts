import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_H = { ...CORS, "Content-Type": "application/json" };

function ok() {
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_H });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const token = req.headers.get("asaas-access-token");
    const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (!token || !expected || token !== expected) {
      console.warn("[asaas-webhook] Invalid or missing token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: JSON_H });
    }

    const body = await req.json();
    const { event, payment } = body;

    console.log(`[asaas-webhook] event=${event} payment=${payment?.id} status=${payment?.status}`);

    if (!payment?.id || !event) return ok();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const statusMap: Record<string, string> = {
      PAYMENT_CREATED: "PENDING",
      PAYMENT_RECEIVED: "RECEIVED",
      PAYMENT_CONFIRMED: "CONFIRMED",
      PAYMENT_OVERDUE: "OVERDUE",
      PAYMENT_CANCELLED: "CANCELLED",
      PAYMENT_REFUNDED: "REFUNDED",
      PAYMENT_UPDATED: payment.status ?? "PENDING",
    };
    const newStatus = statusMap[event] ?? payment.status ?? "PENDING";

    const { data: existing, error: findErr } = await supabase
      .from("asaas_payments")
      .select("id, status")
      .eq("asaas_payment_id", payment.id)
      .maybeSingle();

    if (findErr) console.error("[asaas-webhook] Find error:", findErr);

    if (existing) {
      const updatePayload: Record<string, unknown> = { status: newStatus };
      if (payment.bankSlipUrl) updatePayload.bank_slip_url = payment.bankSlipUrl;
      if (payment.invoiceUrl) updatePayload.invoice_url = payment.invoiceUrl;
      if (payment.dueDate) updatePayload.due_date = payment.dueDate;
      if (payment.value !== undefined && payment.value !== null) updatePayload.value = payment.value;

      const { error: updateErr } = await supabase
        .from("asaas_payments")
        .update(updatePayload)
        .eq("id", existing.id);

      if (updateErr) {
        console.error("[asaas-webhook] Update error:", updateErr);
      } else {
        console.log(`[asaas-webhook] Payment ${payment.id} updated to ${newStatus}`);
      }
    } else {
      // Resolve lease: prefer subscription lookup, fallback to externalReference
      let leaseRow: { id: string; broker_id: string } | null = null;

      if (payment.subscription) {
        const { data: bySub } = await supabase
          .from("leases")
          .select("id, broker_id, billing_automation")
          .eq("billing_automation->asaas_subscription->>id", payment.subscription)
          .maybeSingle();
        if (bySub) leaseRow = { id: bySub.id, broker_id: bySub.broker_id };
      }

      if (!leaseRow && payment.externalReference) {
        const { data: byExt } = await supabase
          .from("leases")
          .select("id, broker_id")
          .eq("id", payment.externalReference)
          .maybeSingle();
        if (byExt) leaseRow = { id: byExt.id, broker_id: byExt.broker_id };
      }

      if (leaseRow) {
        const { error: insErr } = await supabase.from("asaas_payments").insert({
          broker_id: leaseRow.broker_id,
          lease_id: leaseRow.id,
          asaas_payment_id: payment.id,
          asaas_subscription_id: payment.subscription ?? null,
          billing_type: payment.billingType ?? "UNDEFINED",
          value: payment.value,
          due_date: payment.dueDate,
          status: newStatus,
          bank_slip_url: payment.bankSlipUrl ?? null,
          invoice_url: payment.invoiceUrl ?? null,
        });
        if (insErr) console.error("[asaas-webhook] Insert error:", insErr);
        else console.log(`[asaas-webhook] Payment ${payment.id} inserted (lease ${leaseRow.id})`);
      } else {
        console.warn(`[asaas-webhook] Payment ${payment.id} not found locally and could not resolve lease. Event: ${event}`);
      }
    }

    return ok();

  } catch (err) {
    console.error("[asaas-webhook] Error:", err);
    return ok();
  }
});
