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
      console.warn(`[asaas-webhook] Payment ${payment.id} not found locally. Event: ${event}`);
    }

    return ok();

  } catch (err) {
    console.error("[asaas-webhook] Error:", err);
    return ok();
  }
});
