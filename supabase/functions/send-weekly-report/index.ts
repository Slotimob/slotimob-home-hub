import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReportType = "weekly" | "monthly";

interface RequestBody {
  reportType?: ReportType;
}

interface PeriodData {
  totalSales: number;
  totalCommissions: number;
  newLeads: number;
  visitsCompleted: number;
  visitsScheduled: number;
  dealsWon: number;
  dealsInProgress: number;
  conversionRate: number;
  topProperties: Array<{ name: string; deals: number }>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

// ---------- Date helpers (mirror date-fns semantics used by the frontend) ----------
// startOfWeek({ weekStartsOn: 1 }): Monday 00:00:00.000 local
// endOfWeek({ weekStartsOn: 1 }): Sunday 23:59:59.999 local
// The frontend runs in the user's local TZ; here we approximate using UTC. Reports rendered
// server-side may cross a day boundary vs client for users in far TZs — matches the previous
// behavior since the client already sent ISO strings derived from local Date arithmetic.
function startOfWeekMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
function endOfWeekMonday(d: Date): Date {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setUTCDate(e.getUTCDate() + 6);
  e.setUTCHours(23, 59, 59, 999);
  return e;
}
function subWeeks(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - n * 7);
  return x;
}
function startOfMonth(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
  return x;
}
function endOfMonth(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return x;
}
function subMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, d.getUTCDate()));
}
function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
function formatPeriodWeekly(start: Date, end: Date): string {
  const dd = (x: Date) => String(x.getUTCDate()).padStart(2, "0");
  const mm = (x: Date) => String(x.getUTCMonth() + 1).padStart(2, "0");
  return `${dd(start)}/${mm(start)} - ${dd(end)}/${mm(end)}/${end.getUTCFullYear()}`;
}
function formatPeriodMonthly(d: Date): string {
  const months = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ---------- Metrics (replicate WeeklySummaryReport / MonthlySummaryReport queries) ----------
async function loadPeriodData(
  client: ReturnType<typeof createClient>,
  periodStart: Date,
  periodEnd: Date,
  opts: { topPropertiesLimit: number; filterTopPropertiesByPeriod: boolean },
): Promise<PeriodData> {
  const startStr = periodStart.toISOString();
  const endStr = periodEnd.toISOString();
  const startDateStr = isoDate(periodStart);
  const endDateStr = isoDate(periodEnd);

  const { data: sales } = await client
    .from("sales")
    .select("sale_value, commission_value")
    .gte("sale_date", startDateStr)
    .lte("sale_date", endDateStr);

  const totalSales = (sales || []).reduce((sum: number, s: any) => sum + Number(s.sale_value || 0), 0);
  const totalCommissions = (sales || []).reduce((sum: number, s: any) => sum + Number(s.commission_value || 0), 0);

  const { count: newLeads } = await client
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startStr)
    .lte("created_at", endStr);

  const { data: visits } = await client
    .from("visits")
    .select("status")
    .gte("scheduled_at", startStr)
    .lte("scheduled_at", endStr);

  const visitsScheduled = visits?.length || 0;
  const visitsCompleted = (visits || []).filter((v: any) => v.status === "completed").length;

  const { count: dealsWon } = await client
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage", "won")
    .gte("updated_at", startStr)
    .lte("updated_at", endStr);

  const { count: dealsInProgress } = await client
    .from("deals")
    .select("id", { count: "exact", head: true })
    .not("stage", "in", '("won","lost")');

  const { count: totalLeads } = await client
    .from("leads")
    .select("id", { count: "exact", head: true });

  const { count: totalWonDeals } = await client
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage", "won");

  const conversionRate = totalLeads ? ((totalWonDeals || 0) / totalLeads) * 100 : 0;

  let dealsPropsQuery = client
    .from("deals")
    .select("property_id, properties(name)")
    .not("stage", "eq", "lost");
  if (opts.filterTopPropertiesByPeriod) {
    dealsPropsQuery = dealsPropsQuery.gte("created_at", startStr).lte("created_at", endStr);
  }
  const { data: dealsWithProperties } = await dealsPropsQuery;

  const propertyDeals: Record<string, { name: string; deals: number }> = {};
  (dealsWithProperties || []).forEach((d: any) => {
    const propName = d.properties?.name || "Sem empreendimento";
    if (!propertyDeals[propName]) propertyDeals[propName] = { name: propName, deals: 0 };
    propertyDeals[propName].deals++;
  });
  const topProperties = Object.values(propertyDeals)
    .sort((a, b) => b.deals - a.deals)
    .slice(0, opts.topPropertiesLimit);

  return {
    totalSales,
    totalCommissions,
    newLeads: newLeads || 0,
    visitsCompleted,
    visitsScheduled,
    dealsWon: dealsWon || 0,
    dealsInProgress: dealsInProgress || 0,
    conversionRate,
    topProperties,
  };
}

async function loadUpcomingActivities(
  client: ReturnType<typeof createClient>,
  weekStart: Date,
  weekEnd: Date,
): Promise<number> {
  const { count } = await client
    .from("schedule_activities")
    .select("id", { count: "exact", head: true })
    .gte("scheduled_at", weekStart.toISOString())
    .lte("scheduled_at", weekEnd.toISOString())
    .eq("is_completed", false);
  return count || 0;
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ---------- HTML templates ----------
function buildWeeklyHtml(userName: string, period: string, d: PeriodData, upcomingActivities: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Resumo Semanal - SLOTIMOB</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <tr><td style="background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">📊 Resumo Semanal</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">SLOTIMOB</p>
      </td></tr>
      <tr><td style="padding:32px 32px 16px;">
        <p style="margin:0;color:#27272a;font-size:16px;">Olá, <strong>${userName}</strong>!</p>
        <p style="margin:8px 0 0;color:#71717a;font-size:14px;">Aqui está o resumo da sua semana (${period}):</p>
      </td></tr>
      <tr><td style="padding:16px 32px;"><table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
        <td style="width:50%;padding:12px;background:#f4f4f5;border-radius:8px;">
          <p style="margin:0;color:#71717a;font-size:12px;text-transform:uppercase;">Vendas</p>
          <p style="margin:4px 0 0;color:#18181b;font-size:24px;font-weight:700;">${formatCurrency(d.totalSales)}</p>
        </td><td style="width:8px;"></td>
        <td style="width:50%;padding:12px;background:#f4f4f5;border-radius:8px;">
          <p style="margin:0;color:#71717a;font-size:12px;text-transform:uppercase;">Comissões</p>
          <p style="margin:4px 0 0;color:#22c55e;font-size:24px;font-weight:700;">${formatCurrency(d.totalCommissions)}</p>
        </td></tr></table></td></tr>
      <tr><td style="padding:16px 32px;"><table role="presentation" style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:16px;border-bottom:1px solid #e4e4e7;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">👥 Novos Leads</td>
          <td style="text-align:right;color:#18181b;font-size:16px;font-weight:600;">${d.newLeads}</td>
        </tr></table></td></tr>
        <tr><td style="padding:16px;border-bottom:1px solid #e4e4e7;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">🏠 Visitas Realizadas</td>
          <td style="text-align:right;color:#18181b;font-size:16px;font-weight:600;">${d.visitsCompleted} de ${d.visitsScheduled}</td>
        </tr></table></td></tr>
        <tr><td style="padding:16px;border-bottom:1px solid #e4e4e7;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">🎯 Negócios Fechados</td>
          <td style="text-align:right;color:#22c55e;font-size:16px;font-weight:600;">${d.dealsWon}</td>
        </tr></table></td></tr>
        <tr><td style="padding:16px;border-bottom:1px solid #e4e4e7;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">📈 Em Negociação</td>
          <td style="text-align:right;color:#f59e0b;font-size:16px;font-weight:600;">${d.dealsInProgress}</td>
        </tr></table></td></tr>
        <tr><td style="padding:16px;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">📊 Taxa de Conversão</td>
          <td style="text-align:right;color:#8b5cf6;font-size:16px;font-weight:600;">${d.conversionRate.toFixed(1)}%</td>
        </tr></table></td></tr>
      </table></td></tr>
      <tr><td style="padding:16px 32px;"><div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:8px;padding:16px;">
        <p style="margin:0;color:#92400e;font-size:14px;">📅 Você tem <strong>${upcomingActivities}</strong> atividades agendadas para esta semana.</p>
      </div></td></tr>
      <tr><td style="padding:24px 32px;text-align:center;">
        <a href="${Deno.env.get("SITE_URL") ?? "https://app.slotimob.com.br"}/reports" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px;">Ver Relatório Completo</a>
      </td></tr>
      <tr><td style="padding:24px 32px;background:#fafafa;text-align:center;">
        <p style="margin:0;color:#a1a1aa;font-size:12px;">Este email foi enviado automaticamente pelo SLOTIMOB.<br>© ${new Date().getFullYear()} SLOTIMOB. Todos os direitos reservados.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function fmtChange(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function buildMonthlyHtml(
  userName: string,
  period: string,
  d: PeriodData,
  cmp: { salesChange: number; commissionsChange: number; leadsChange: number; visitsChange: number; dealsChange: number },
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Resumo Mensal - SLOTIMOB</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f4f4f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <tr><td style="background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);padding:32px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">📊 Resumo Mensal</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">SLOTIMOB</p>
      </td></tr>
      <tr><td style="padding:32px 32px 16px;">
        <p style="margin:0;color:#27272a;font-size:16px;">Olá, <strong>${userName}</strong>!</p>
        <p style="margin:8px 0 0;color:#71717a;font-size:14px;">Aqui está o resumo do mês (${period}), comparado ao mês anterior:</p>
      </td></tr>
      <tr><td style="padding:16px 32px;"><table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
        <td style="width:50%;padding:12px;background:#f4f4f5;border-radius:8px;">
          <p style="margin:0;color:#71717a;font-size:12px;text-transform:uppercase;">Vendas</p>
          <p style="margin:4px 0 0;color:#18181b;font-size:24px;font-weight:700;">${formatCurrency(d.totalSales)}</p>
          <p style="margin:4px 0 0;color:#71717a;font-size:12px;">${fmtChange(cmp.salesChange)} MoM</p>
        </td><td style="width:8px;"></td>
        <td style="width:50%;padding:12px;background:#f4f4f5;border-radius:8px;">
          <p style="margin:0;color:#71717a;font-size:12px;text-transform:uppercase;">Comissões</p>
          <p style="margin:4px 0 0;color:#22c55e;font-size:24px;font-weight:700;">${formatCurrency(d.totalCommissions)}</p>
          <p style="margin:4px 0 0;color:#71717a;font-size:12px;">${fmtChange(cmp.commissionsChange)} MoM</p>
        </td></tr></table></td></tr>
      <tr><td style="padding:16px 32px;"><table role="presentation" style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:16px;border-bottom:1px solid #e4e4e7;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">👥 Novos Leads</td>
          <td style="text-align:right;color:#18181b;font-size:16px;font-weight:600;">${d.newLeads} <span style="color:#71717a;font-size:12px;font-weight:400;">(${fmtChange(cmp.leadsChange)})</span></td>
        </tr></table></td></tr>
        <tr><td style="padding:16px;border-bottom:1px solid #e4e4e7;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">🏠 Visitas Realizadas</td>
          <td style="text-align:right;color:#18181b;font-size:16px;font-weight:600;">${d.visitsCompleted} de ${d.visitsScheduled} <span style="color:#71717a;font-size:12px;font-weight:400;">(${fmtChange(cmp.visitsChange)})</span></td>
        </tr></table></td></tr>
        <tr><td style="padding:16px;border-bottom:1px solid #e4e4e7;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">🎯 Negócios Fechados</td>
          <td style="text-align:right;color:#22c55e;font-size:16px;font-weight:600;">${d.dealsWon} <span style="color:#71717a;font-size:12px;font-weight:400;">(${fmtChange(cmp.dealsChange)})</span></td>
        </tr></table></td></tr>
        <tr><td style="padding:16px;border-bottom:1px solid #e4e4e7;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">📈 Em Negociação</td>
          <td style="text-align:right;color:#f59e0b;font-size:16px;font-weight:600;">${d.dealsInProgress}</td>
        </tr></table></td></tr>
        <tr><td style="padding:16px;"><table role="presentation" style="width:100%;"><tr>
          <td style="color:#52525b;font-size:14px;">📊 Taxa de Conversão</td>
          <td style="text-align:right;color:#8b5cf6;font-size:16px;font-weight:600;">${d.conversionRate.toFixed(1)}%</td>
        </tr></table></td></tr>
      </table></td></tr>
      <tr><td style="padding:24px 32px;text-align:center;">
        <a href="${Deno.env.get("SITE_URL") ?? "https://app.slotimob.com.br"}/reports" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px;">Ver Relatório Completo</a>
      </td></tr>
      <tr><td style="padding:24px 32px;background:#fafafa;text-align:center;">
        <p style="margin:0;color:#a1a1aa;font-size:12px;">Este email foi enviado automaticamente pelo SLOTIMOB.<br>© ${new Date().getFullYear()} SLOTIMOB. Todos os direitos reservados.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

// ---------- Handler ----------
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "não autenticado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "não autenticado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileErr || !profile?.email) {
      return new Response(
        JSON.stringify({ error: "Perfil sem e-mail cadastrado. Atualize seu perfil para receber o relatório." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const email = profile.email as string;
    const userName = (profile.full_name as string | null) ?? email;

    let body: RequestBody = {};
    try {
      body = (await req.json()) as RequestBody;
    } catch (_) {
      body = {};
    }
    const reportType: ReportType = body?.reportType === "monthly" ? "monthly" : "weekly";

    // User-scoped client — preserves RLS so metrics match exactly what the user sees in the UI.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let emailHtml: string;
    let subject: string;

    if (reportType === "monthly") {
      const now = new Date();
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const prevMonthStart = startOfMonth(subMonths(now, 2));
      const prevMonthEnd = endOfMonth(subMonths(now, 2));

      const current = await loadPeriodData(userClient, lastMonthStart, lastMonthEnd, {
        topPropertiesLimit: 5,
        filterTopPropertiesByPeriod: true,
      });
      const previous = await loadPeriodData(userClient, prevMonthStart, prevMonthEnd, {
        topPropertiesLimit: 5,
        filterTopPropertiesByPeriod: true,
      });

      const comparison = {
        salesChange: calculateChange(current.totalSales, previous.totalSales),
        commissionsChange: calculateChange(current.totalCommissions, previous.totalCommissions),
        leadsChange: calculateChange(current.newLeads, previous.newLeads),
        visitsChange: calculateChange(current.visitsCompleted, previous.visitsCompleted),
        dealsChange: calculateChange(current.dealsWon, previous.dealsWon),
      };

      const period = formatPeriodMonthly(lastMonthStart);
      emailHtml = buildMonthlyHtml(userName, period, current, comparison);
      subject = `📊 Seu Resumo Mensal - ${period}`;
    } else {
      const now = new Date();
      const weekStart = startOfWeekMonday(now);
      const weekEnd = endOfWeekMonday(now);
      const lastWeekStart = startOfWeekMonday(subWeeks(now, 1));
      const lastWeekEnd = endOfWeekMonday(subWeeks(now, 1));

      const data = await loadPeriodData(userClient, lastWeekStart, lastWeekEnd, {
        topPropertiesLimit: 3,
        filterTopPropertiesByPeriod: false,
      });
      const upcomingActivities = await loadUpcomingActivities(userClient, weekStart, weekEnd);
      const period = formatPeriodWeekly(lastWeekStart, lastWeekEnd);
      emailHtml = buildWeeklyHtml(userName, period, data, upcomingActivities);
      subject = `📊 Seu Resumo Semanal - ${period}`;
    }

    console.log(`Sending ${reportType} report to:`, email);

    const emailResponse = await resend.emails.send({
      from: "SLOTIMOB <onboarding@resend.dev>",
      to: [email],
      subject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending report:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

Deno.serve(handler);
