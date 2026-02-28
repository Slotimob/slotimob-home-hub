import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  UserPlus,
  Reply,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Inbox,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ReportsWhatsAppSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

interface WhatsAppMetrics {
  totalMessages: number;
  newLeadsViaWa: number;
  responseRate: number;
  conversionCount: number;
  dailyVolume: { date: string; sent: number; received: number }[];
  leadOrigins: { name: string; value: number }[];
  topConversations: {
    contactName: string;
    dealStage: string | null;
    messageCount: number;
  }[];
  loading: boolean;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--muted-foreground))',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
];

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'Novo Lead',
  contacted: 'Contactado',
  visit_scheduled: 'Visita Agendada',
  visit_done: 'Visita Realizada',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
};

function KpiCard({
  title, value, subtitle, icon, loading,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ReactNode; loading: boolean;
}) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-4 sm:p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const ReportsWhatsAppSection = ({ dateRange, userName, selectedUnitId }: ReportsWhatsAppSectionProps) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<WhatsAppMetrics>({
    totalMessages: 0,
    newLeadsViaWa: 0,
    responseRate: 0,
    conversionCount: 0,
    dailyVolume: [],
    leadOrigins: [],
    topConversations: [],
    loading: true,
  });

  useEffect(() => {
    if (!user) return;
    fetchMetrics();
  }, [user, dateRange.from.toISOString(), dateRange.to.toISOString()]);

  const fetchMetrics = async () => {
    if (!user) return;
    setMetrics(prev => ({ ...prev, loading: true }));

    try {
      const fromISO = dateRange.from.toISOString();
      const toISO = dateRange.to.toISOString();

      // 1. Fetch all messages in period
      const { data: messages } = await supabase
        .from('whatsapp_messages')
        .select('id, direction, sent_at, conversation_id, is_internal_note')
        .gte('sent_at', fromISO)
        .lte('sent_at', toISO);

      const allMsgs = (messages || []).filter(m => !m.is_internal_note);
      const totalMessages = allMsgs.length;

      // 2. New leads via WhatsApp (conversations with deal_id created in period)
      const { data: waConversations } = await supabase
        .from('whatsapp_conversations')
        .select('id, deal_id, contact_name, contact_phone')
        .not('deal_id', 'is', null)
        .gte('created_at', fromISO)
        .lte('created_at', toISO);

      const newLeadsViaWa = (waConversations || []).length;

      // 3. Response rate: conversations with at least 1 incoming AND 1 outgoing
      const conversationIds = [...new Set(allMsgs.map(m => m.conversation_id))];
      const incomingConvs = new Set(allMsgs.filter(m => m.direction === 'incoming').map(m => m.conversation_id));
      const outgoingConvs = new Set(allMsgs.filter(m => m.direction === 'outgoing').map(m => m.conversation_id));
      const respondedConvs = [...incomingConvs].filter(c => outgoingConvs.has(c));
      const responseRate = incomingConvs.size > 0
        ? Math.round((respondedConvs.length / incomingConvs.size) * 100)
        : 0;

      // 4. Conversion: deals from WhatsApp that advanced past 'contacted'
      const advancedStages = ['visit_scheduled', 'proposal', 'won'] as const;
      const waDealIds = (waConversations || []).map(c => c.deal_id).filter(Boolean) as string[];
      let conversionCount = 0;
      if (waDealIds.length > 0) {
        const { data: advancedDeals } = await supabase
          .from('deals')
          .select('id')
          .in('id', waDealIds)
          .in('stage', [...advancedStages]);
        conversionCount = (advancedDeals || []).length;
      }

      // 5. Daily volume
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const dailyVolume = days.map(day => {
        const dayMsgs = allMsgs.filter(m => isSameDay(new Date(m.sent_at), day));
        return {
          date: format(day, 'dd/MM', { locale: ptBR }),
          sent: dayMsgs.filter(m => m.direction === 'outgoing').length,
          received: dayMsgs.filter(m => m.direction === 'incoming').length,
        };
      });

      // 6. Lead origins (WhatsApp vs Others)
      const { count: totalDeals } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('broker_id', user.id)
        .gte('created_at', fromISO)
        .lte('created_at', toISO);

      const otherDeals = (totalDeals || 0) - newLeadsViaWa;
      const leadOrigins = [
        { name: 'WhatsApp', value: newLeadsViaWa },
        { name: 'Outros Canais', value: Math.max(0, otherDeals) },
      ];

      // 7. Top conversations (most active)
      const convMsgCounts: Record<string, number> = {};
      allMsgs.forEach(m => {
        convMsgCounts[m.conversation_id] = (convMsgCounts[m.conversation_id] || 0) + 1;
      });
      const topConvIds = Object.entries(convMsgCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id);

      let topConversations: WhatsAppMetrics['topConversations'] = [];
      if (topConvIds.length > 0) {
        const { data: topConvs } = await supabase
          .from('whatsapp_conversations')
          .select('id, contact_name, contact_phone, deal_id')
          .in('id', topConvIds);

        const dealIds = (topConvs || []).map(c => c.deal_id).filter(Boolean);
        let dealStages: Record<string, string> = {};
        if (dealIds.length > 0) {
          const { data: deals } = await supabase
            .from('deals')
            .select('id, stage')
            .in('id', dealIds);
          (deals || []).forEach(d => { dealStages[d.id] = d.stage; });
        }

        topConversations = topConvIds.map(convId => {
          const conv = (topConvs || []).find(c => c.id === convId);
          return {
            contactName: conv?.contact_name || conv?.contact_phone || 'Desconhecido',
            dealStage: conv?.deal_id ? (dealStages[conv.deal_id] || null) : null,
            messageCount: convMsgCounts[convId] || 0,
          };
        });
      }

      setMetrics({
        totalMessages,
        newLeadsViaWa,
        responseRate,
        conversionCount,
        dailyVolume,
        leadOrigins,
        topConversations,
        loading: false,
      });
    } catch (err) {
      console.error('Erro ao buscar métricas WhatsApp:', err);
      setMetrics(prev => ({ ...prev, loading: false }));
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-3 shadow-xl text-xs">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Total de Mensagens"
          value={metrics.loading ? '—' : metrics.totalMessages.toLocaleString('pt-BR')}
          subtitle="No período selecionado"
          icon={<MessageSquare className="h-4 w-4" />}
          loading={metrics.loading}
        />
        <KpiCard
          title="Novos Leads via WA"
          value={metrics.loading ? '—' : metrics.newLeadsViaWa}
          subtitle="Deals criados automaticamente"
          icon={<UserPlus className="h-4 w-4" />}
          loading={metrics.loading}
        />
        <KpiCard
          title="Taxa de Resposta"
          value={metrics.loading ? '—' : `${metrics.responseRate}%`}
          subtitle="Conversas respondidas"
          icon={<Reply className="h-4 w-4" />}
          loading={metrics.loading}
        />
        <KpiCard
          title="Conversão WA"
          value={metrics.loading ? '—' : metrics.conversionCount}
          subtitle="Avançaram no funil"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={metrics.loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart - Message Volume */}
        <Card className="lg:col-span-2 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Volume de Mensagens por Dia
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {metrics.loading ? (
              <Skeleton className="h-[250px] w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={metrics.dailyVolume} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    name="Enviadas"
                    stroke="hsl(var(--primary))"
                    fill="url(#gradSent)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    name="Recebidas"
                    stroke="hsl(142 76% 36%)"
                    fill="url(#gradReceived)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Lead Origins */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Inbox className="h-4 w-4 text-primary" />
              Origem dos Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {metrics.loading ? (
              <Skeleton className="h-[250px] w-full rounded-lg" />
            ) : metrics.leadOrigins.every(o => o.value === 0) ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                Sem dados no período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.leadOrigins}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {metrics.leadOrigins.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-2 shadow-xl text-xs">
                          <span className="font-medium">{payload[0].name}: </span>
                          <span className="font-bold">{payload[0].value}</span>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Conversations Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Top 10 Conversas Mais Ativas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {metrics.loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : metrics.topConversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma conversa no período selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Contato</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status do Deal</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Mensagens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {metrics.topConversations.map((conv, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground font-medium">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{conv.contactName}</td>
                      <td className="px-4 py-2.5">
                        {conv.dealStage ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {STAGE_LABELS[conv.dealStage] || conv.dealStage}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sem deal</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-semibold text-foreground">{conv.messageCount}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
