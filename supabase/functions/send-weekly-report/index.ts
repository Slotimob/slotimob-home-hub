import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyReportRequest {
  email: string;
  reportData: {
    period: string;
    totalSales: number;
    totalCommissions: number;
    newLeads: number;
    visitsCompleted: number;
    visitsScheduled: number;
    dealsWon: number;
    dealsInProgress: number;
    conversionRate: number;
    topProperties: Array<{ name: string; deals: number }>;
    upcomingActivities: number;
  };
  userName: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, reportData, userName }: WeeklyReportRequest = await req.json();

    console.log("Sending weekly report to:", email);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo Semanal - SLOTIMOB</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">📊 Resumo Semanal</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">SLOTIMOB</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <p style="margin: 0; color: #27272a; font-size: 16px;">Olá, <strong>${userName}</strong>!</p>
              <p style="margin: 8px 0 0; color: #71717a; font-size: 14px;">Aqui está o resumo da sua semana (${reportData.period}):</p>
            </td>
          </tr>
          
          <!-- Main Metrics -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; padding: 12px; background-color: #f4f4f5; border-radius: 8px;">
                    <p style="margin: 0; color: #71717a; font-size: 12px; text-transform: uppercase;">Vendas</p>
                    <p style="margin: 4px 0 0; color: #18181b; font-size: 24px; font-weight: 700;">${formatCurrency(reportData.totalSales)}</p>
                  </td>
                  <td style="width: 8px;"></td>
                  <td style="width: 50%; padding: 12px; background-color: #f4f4f5; border-radius: 8px;">
                    <p style="margin: 0; color: #71717a; font-size: 12px; text-transform: uppercase;">Comissões</p>
                    <p style="margin: 4px 0 0; color: #22c55e; font-size: 24px; font-weight: 700;">${formatCurrency(reportData.totalCommissions)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Secondary Metrics -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fafafa; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e4e4e7;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="color: #52525b; font-size: 14px;">👥 Novos Leads</td>
                        <td style="text-align: right; color: #18181b; font-size: 16px; font-weight: 600;">${reportData.newLeads}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e4e4e7;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="color: #52525b; font-size: 14px;">🏠 Visitas Realizadas</td>
                        <td style="text-align: right; color: #18181b; font-size: 16px; font-weight: 600;">${reportData.visitsCompleted} de ${reportData.visitsScheduled}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e4e4e7;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="color: #52525b; font-size: 14px;">🎯 Negócios Fechados</td>
                        <td style="text-align: right; color: #22c55e; font-size: 16px; font-weight: 600;">${reportData.dealsWon}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e4e4e7;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="color: #52525b; font-size: 14px;">📈 Em Negociação</td>
                        <td style="text-align: right; color: #f59e0b; font-size: 16px; font-weight: 600;">${reportData.dealsInProgress}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="color: #52525b; font-size: 14px;">📊 Taxa de Conversão</td>
                        <td style="text-align: right; color: #8b5cf6; font-size: 16px; font-weight: 600;">${reportData.conversionRate.toFixed(1)}%</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Upcoming -->
          <tr>
            <td style="padding: 16px 32px;">
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 16px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  📅 Você tem <strong>${reportData.upcomingActivities}</strong> atividades agendadas para esta semana.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <a href="https://slotimob.lovable.app/reports" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Ver Relatório Completo
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                Este email foi enviado automaticamente pelo SLOTIMOB.<br>
                © ${new Date().getFullYear()} SLOTIMOB. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "SLOTIMOB <onboarding@resend.dev>",
      to: [email],
      subject: `📊 Seu Resumo Semanal - ${reportData.period}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending weekly report:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
