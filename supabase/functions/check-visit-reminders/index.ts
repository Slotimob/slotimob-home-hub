import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting constants (prevents abuse of cron job)
const RATE_LIMIT_MAX_REQUESTS = 2;
const RATE_LIMIT_WINDOW_MINUTES = 1;

// Rate limiting helper
async function checkRateLimit(
  supabaseAdmin: any,
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: maxRequests };
  }

  const currentCount = data?.request_count || 0;
  
  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  if (data) {
    await supabaseAdmin
      .from('rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .eq('window_start', data.window_start);
  } else {
    await supabaseAdmin
      .from('rate_limits')
      .insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: new Date().toISOString()
      });
  }

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check rate limit (prevents external abuse)
    const rateLimitResult = await checkRateLimit(
      supabase,
      'cron',
      'check-visit-reminders',
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MINUTES
    );

    if (!rateLimitResult.allowed) {
      console.log('Rate limit exceeded for check-visit-reminders');
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Checking for visits that need reminders...");

    const now = new Date();
    
    // Check for 24h reminders (between 23h and 25h from now)
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: visits24h, error: error24h } = await supabase
      .from("visits")
      .select("id, scheduled_at, notification_24h_sent")
      .gte("scheduled_at", twentyThreeHoursFromNow.toISOString())
      .lte("scheduled_at", twentyFiveHoursFromNow.toISOString())
      .eq("notification_24h_sent", false)
      .in("status", ["scheduled", "confirmed"]);

    if (error24h) {
      console.error("Error fetching 24h visits:", error24h);
    } else if (visits24h && visits24h.length > 0) {
      safeLog('Found %s visits for 24h reminders', visits24h.length);
      
      for (const visit of visits24h) {
        try {
          await supabase.functions.invoke("send-visit-reminder", {
            body: {
              visitId: visit.id,
              reminderType: "24h",
            },
          });
          safeLog('Sent 24h reminder for visit %s', visit.id);
        } catch (err) {
          safeError('Failed to send 24h reminder for visit %s:', visit.id, err);
        }
      }
    }

    // Check for 2h reminders (between 1h 50min and 2h 10min from now)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const oneHourFiftyFromNow = new Date(now.getTime() + 110 * 60 * 1000);
    const twoHoursTenFromNow = new Date(now.getTime() + 130 * 60 * 1000);

    const { data: visits2h, error: error2h } = await supabase
      .from("visits")
      .select("id, scheduled_at, notification_2h_sent")
      .gte("scheduled_at", oneHourFiftyFromNow.toISOString())
      .lte("scheduled_at", twoHoursTenFromNow.toISOString())
      .eq("notification_2h_sent", false)
      .in("status", ["scheduled", "confirmed"]);

    if (error2h) {
      console.error("Error fetching 2h visits:", error2h);
    } else if (visits2h && visits2h.length > 0) {
      safeLog('Found %s visits for 2h reminders', visits2h.length);
      
      for (const visit of visits2h) {
        try {
          await supabase.functions.invoke("send-visit-reminder", {
            body: {
              visitId: visit.id,
              reminderType: "2h",
            },
          });
          safeLog('Sent 2h reminder for visit %s', visit.id);
        } catch (err) {
          safeError('Failed to send 2h reminder for visit %s:', visit.id, err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders24h: visits24h?.length || 0,
        reminders2h: visits2h?.length || 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-visit-reminders:", error);
    // Return generic error to prevent information leakage
    return new Response(
      JSON.stringify({ error: "Failed to process reminders" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
