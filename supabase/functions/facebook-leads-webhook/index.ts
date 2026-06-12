import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';
import { corsHeadersWebhook as corsHeaders } from '../_shared/cors.ts';


interface FacebookLeadData {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      value: {
        form_id: string;
        leadgen_id: string;
        created_time: number;
        page_id: string;
        ad_id?: string;
        ad_name?: string;
        adset_id?: string;
        adset_name?: string;
        campaign_id?: string;
        campaign_name?: string;
        platform?: string;
        is_organic?: boolean;
        field_data?: Array<{
          name: string;
          values: string[];
        }>;
      };
      field: string;
    }>;
  }>;
}

// Verify Facebook webhook signature using HMAC-SHA256
async function verifyFacebookSignature(
  payload: string,
  signature: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) {
    console.error("Missing or invalid signature format");
    return false;
  }

  const expectedSignature = signature.substring(7); // Remove "sha256=" prefix
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (computedSignature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < computedSignature.length; i++) {
    result |= computedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight

  // Get secrets for verification
  const verifyToken = Deno.env.get("FACEBOOK_WEBHOOK_VERIFY_TOKEN");
  const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");

  // Handle Facebook webhook verification (GET request)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Facebook webhook verification request received");

    // Validate verify token against configured secret
    if (!verifyToken) {
      console.error("FACEBOOK_WEBHOOK_VERIFY_TOKEN not configured");
      return new Response("Verification failed", {
        status: 403,
        headers: corsHeaders,
      });
    }

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified successfully");
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    console.error("Webhook verification failed: token mismatch");
    return new Response("Verification failed", {
      status: 403,
      headers: corsHeaders,
    });
  }

  // Handle incoming leads (POST request)
  if (req.method === "POST") {
    try {
      // Verify app secret is configured
      if (!appSecret) {
        console.error("FACEBOOK_APP_SECRET not configured");
        return new Response("Verification failed", {
          status: 403,
          headers: corsHeaders,
        });
      }

      // Get the raw body for signature verification
      const rawBody = await req.text();
      const signature = req.headers.get("x-hub-signature-256");

      // Verify the webhook signature
      const isValid = await verifyFacebookSignature(rawBody, signature, appSecret);
      if (!isValid) {
        console.error("Invalid webhook signature - rejecting request");
        return new Response("Verification failed", {
          status: 401,
          headers: corsHeaders,
        });
      }

      console.log("Webhook signature verified successfully");

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const payload: FacebookLeadData = JSON.parse(rawBody);
      console.log("Received Facebook lead payload:", JSON.stringify(payload));

      if (payload.object !== "page") {
        return new Response("Not a page event", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const results: any[] = [];

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === "leadgen") {
            const leadData = change.value;
            console.log("Processing lead:", leadData.leadgen_id);

            // Extract field data
            const fieldData = leadData.field_data || [];
            const getFieldValue = (name: string) => {
              const field = fieldData.find(
                (f) => f.name.toLowerCase() === name.toLowerCase()
              );
              return field?.values?.[0] || null;
            };

            const leadName = getFieldValue("full_name") || 
                           getFieldValue("nome") ||
                           getFieldValue("name") ||
                           "Lead Facebook";
            const leadEmail = getFieldValue("email") || getFieldValue("e-mail");
            const leadPhone = getFieldValue("phone_number") || 
                            getFieldValue("telefone") ||
                            getFieldValue("phone");

            // Determine utm_medium based on whether it's organic or paid
            const isOrganic = leadData.is_organic === true;
            const utmMedium = isOrganic ? "organic" : "cpc";

            // Determine placement from platform field
            const platform = leadData.platform?.toLowerCase() || "facebook";
            let metaPlacement = "feed"; // default
            if (platform.includes("instagram")) {
              metaPlacement = "instagram";
            } else if (platform.includes("messenger")) {
              metaPlacement = "messenger";
            } else if (platform.includes("audience_network")) {
              metaPlacement = "audience_network";
            }

            // Find brokers with active Facebook integration matching this page_id
            const pageId = (change.value as any).page_id || entry.id;
            const { data: activeIntegrations, error: integrationError } = await supabase
              .from("integrations")
              .select("broker_id, page_id")
              .eq("integration_type", "facebook_leads")
              .eq("is_active", true)
              .eq("page_id", pageId);

            if (integrationError) {
              console.error("Error fetching integrations:", integrationError);
              continue;
            }

            if (!activeIntegrations || activeIntegrations.length === 0) {
              safeWarn('Nenhuma integração ativa encontrada para page_id: %s', pageId);
              return new Response(
                JSON.stringify({ success: true, results: [], reason: 'no_integration_for_page' }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            safeLog('Found %s active Facebook integrations for page', activeIntegrations.length);

            // Create lead for each matching integration (defense in depth: re-check page_id)
            for (const integration of activeIntegrations) {
              if (integration.page_id !== pageId) {
                safeWarn('Skipping integration with mismatched page_id for broker %s', integration.broker_id);
                continue;
              }
              const leadInsert = {
                broker_id: integration.broker_id,
                name: leadName,
                email: leadEmail,
                phone: leadPhone,
                origin: "facebook",
                campaign_name: leadData.campaign_name || leadData.ad_name || "Facebook Lead Ads",
                lead_type: "lead",
                notes: `Lead gerado via Facebook Lead Ads\nForm ID: ${leadData.form_id}\nLead ID: ${leadData.leadgen_id}`,
                // UTM Parameters
                utm_source: "facebook",
                utm_medium: utmMedium,
                utm_campaign: leadData.campaign_name || null,
                utm_content: leadData.ad_name || null,
                // Meta Ads specific fields
                meta_ad_id: leadData.ad_id || null,
                meta_adset_id: leadData.adset_id || null,
                meta_campaign_id: leadData.campaign_id || null,
                meta_ad_name: leadData.ad_name || null,
                meta_adset_name: leadData.adset_name || null,
                meta_placement: metaPlacement,
              };

              console.log("Inserting lead with UTM data:", leadInsert);

              const { data: insertedLead, error: insertError } = await supabase
                .from("leads")
                .insert(leadInsert)
                .select()
                .single();

              if (insertError) {
                console.error("Error inserting lead:", insertError);
                results.push({ error: insertError.message, leadgen_id: leadData.leadgen_id });
              } else {
                console.log("Lead inserted successfully:", insertedLead.id);
                results.push({ success: true, lead_id: insertedLead.id });

                // Update last_sync_at for the integration
                await supabase
                  .from("integrations")
                  .update({ 
                    last_sync_at: new Date().toISOString(),
                    sync_status: "success"
                  })
                  .eq("broker_id", integration.broker_id)
                  .eq("integration_type", "facebook_leads");
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Error processing Facebook webhook:", error);
      // Return generic error to prevent information leakage
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: corsHeaders,
  });
});
