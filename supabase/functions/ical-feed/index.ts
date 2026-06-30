import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { safeLog, safeWarn, safeError } from '../_shared/safe-log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format date to iCal format (YYYYMMDDTHHMMSSZ)
function formatDateToICal(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Escape special characters for iCal
function escapeICalText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Generate UID for events
function generateUID(id: string, type: string): string {
  return `${id}-${type}@slotimob.com`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      console.error('No token provided');
      return new Response('Token is required', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: max 30 requests per token per 15 minutes
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentRequests } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', `ical:${token}`)
      .gte('window_start', windowStart);

    if ((recentRequests || 0) >= 30) {
      return new Response('Too many requests', { 
        status: 429,
        headers: corsHeaders
      });
    }

    // Record this request
    await supabase.from('rate_limits').insert({
      identifier: `ical:${token}`,
      window_start: new Date().toISOString(),
    });

    // Find user by ical_token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('ical_token', token)
      .single();

    if (profileError || !profile) {
      console.error('Invalid token or profile not found:', profileError);
      return new Response('Invalid token', { 
        status: 401,
        headers: corsHeaders
      });
    }

    const userId = profile.id;
    safeLog('Generating iCal feed for user: %s', userId);

    // Fetch visits
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        status,
        notes,
        leads!visits_lead_id_fkey (name, phone),
        properties!visits_property_id_fkey (name, address),
        units!visits_unit_id_fkey (unit_number)
      `)
      .eq('broker_id', userId)
      .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .lte('scheduled_at', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()); // Next 90 days

    if (visitsError) {
      console.error('Error fetching visits:', visitsError);
    }

    // Fetch schedule activities
    const { data: activities, error: activitiesError } = await supabase
      .from('schedule_activities')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        activity_type,
        title,
        description,
        leads:lead_id (name, phone)
      `)
      .eq('broker_id', userId)
      .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('scheduled_at', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
    }

    // Build iCal content
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SlotiMob//Agenda//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:SlotiMob - ${escapeICalText(profile.full_name || 'Agenda')}`,
      'X-WR-TIMEZONE:America/Sao_Paulo',
    ];

    // Add visits as events
    if (visits && visits.length > 0) {
      for (const visit of visits) {
        const startDate = new Date(visit.scheduled_at);
        const endDate = new Date(startDate.getTime() + (visit.duration_minutes || 60) * 60000);
        
        const leadName = (visit.leads as any)?.name || 'Cliente';
        const propertyName = (visit.properties as any)?.name || '';
        const propertyAddress = (visit.properties as any)?.address || '';
        const unitNumber = (visit.units as any)?.unit_number || '';
        
        const summary = `🏠 Visita: ${leadName}${propertyName ? ` - ${propertyName}` : ''}${unitNumber ? ` (Un. ${unitNumber})` : ''}`;
        const location = propertyAddress;
        const description = [
          `Cliente: ${leadName}`,
          (visit.leads as any)?.phone ? `Tel: ${(visit.leads as any).phone}` : '',
          propertyName ? `Imóvel: ${propertyName}` : '',
          unitNumber ? `Unidade: ${unitNumber}` : '',
          visit.notes ? `Obs: ${visit.notes}` : '',
          `Status: ${visit.status || 'agendado'}`,
        ].filter(Boolean).join('\\n');

        icalContent.push(
          'BEGIN:VEVENT',
          `UID:${generateUID(visit.id, 'visit')}`,
          `DTSTAMP:${formatDateToICal(new Date())}`,
          `DTSTART:${formatDateToICal(startDate)}`,
          `DTEND:${formatDateToICal(endDate)}`,
          `SUMMARY:${escapeICalText(summary)}`,
          location ? `LOCATION:${escapeICalText(location)}` : '',
          `DESCRIPTION:${escapeICalText(description)}`,
          `STATUS:${visit.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
          'END:VEVENT'
        );
      }
    }

    // Add activities as events
    if (activities && activities.length > 0) {
      const activityEmojis: Record<string, string> = {
        ligar: '📞',
        email: '📧',
        reuniao: '🤝',
        tarefa: '✅',
        mensagem: '💬',
        visita: '🏠',
      };

      for (const activity of activities) {
        const startDate = new Date(activity.scheduled_at);
        const endDate = new Date(startDate.getTime() + (activity.duration_minutes || 30) * 60000);
        
        const emoji = activityEmojis[activity.activity_type] || '📌';
        const leadName = (activity.leads as any)?.name || '';
        
        const summary = `${emoji} ${activity.title}${leadName ? ` - ${leadName}` : ''}`;
        const description = [
          activity.title,
          leadName ? `Contato: ${leadName}` : '',
          (activity.leads as any)?.phone ? `Tel: ${(activity.leads as any).phone}` : '',
          activity.description ? `Obs: ${activity.description}` : '',
        ].filter(Boolean).join('\\n');

        icalContent.push(
          'BEGIN:VEVENT',
          `UID:${generateUID(activity.id, 'activity')}`,
          `DTSTAMP:${formatDateToICal(new Date())}`,
          `DTSTART:${formatDateToICal(startDate)}`,
          `DTEND:${formatDateToICal(endDate)}`,
          `SUMMARY:${escapeICalText(summary)}`,
          
          `DESCRIPTION:${escapeICalText(description)}`,
          'STATUS:CONFIRMED',
          'END:VEVENT'
        );
      }
    }

    icalContent.push('END:VCALENDAR');

    // Filter out empty lines and join
    const icalOutput = icalContent.filter(line => line).join('\r\n');

    safeLog('Generated iCal with %s events', (visits?.length || 0) + (activities?.length || 0));

    return new Response(icalOutput, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="slotimob-agenda.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error generating iCal feed:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    });
  }
});
