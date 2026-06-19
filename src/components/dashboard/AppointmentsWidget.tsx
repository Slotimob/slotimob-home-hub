import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardScope } from '@/hooks/useDashboardScope';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar, Phone, Users, Eye, ClipboardCheck, ArrowRight } from 'lucide-react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { format, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import type { DateRange } from './DashboardDateFilter';

type AppointmentsPeriod = 'today' | '7d' | 'this_month';

const PERIOD_OPTIONS: { value: AppointmentsPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7D' },
  { value: 'this_month', label: 'Este Mês' },
];

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  meeting: Users,
  visit: Eye,
  inspection: ClipboardCheck,
};

interface AppointmentsWidgetProps {
  dateRange: DateRange;
  refreshKey: number;
}

export function AppointmentsWidget({ refreshKey }: AppointmentsWidgetProps) {
  const { user } = useAuth();
  const scope = useDashboardScope();

  const [period, setPeriod] = useState<AppointmentsPeriod>('today');

  const queryRange = useMemo(() => {
    const now = new Date();
    if (period === 'today') return { from: startOfDay(now), to: endOfDay(now) };
    if (period === '7d') return { from: startOfDay(now), to: endOfDay(addDays(now, 7)) };
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }, [period]);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-appointments', user?.id, scope, period, queryRange.from.toISOString(), queryRange.to.toISOString(), refreshKey],
    queryFn: async () => {
      if (!user) return { items: [], total: 0 };

      let brokerIds: string[] = [user.id];
      if (scope === 'workspace') {
        const { data: ids } = await supabase.rpc('get_workspace_user_ids', { p_user_id: user.id });
        if (ids && Array.isArray(ids) && ids.length > 0) brokerIds = ids;
      }

      const { data: activities, count } = await supabase
        .from('schedule_activities')
        .select('id, title, activity_type, scheduled_at, property_id, unit_id, lead_id, broker_id, is_completed', { count: 'exact' })
        .in('broker_id', brokerIds)
        .gte('scheduled_at', queryRange.from.toISOString())
        .lte('scheduled_at', queryRange.to.toISOString())
        .or('is_completed.is.null,is_completed.eq.false')
        .order('scheduled_at', { ascending: true })
        .limit(50);

      const items = (activities || []) as Array<{
        id: string; title: string; activity_type: string; scheduled_at: string;
        property_id: string | null; unit_id: string | null; lead_id: string | null; broker_id: string;
      }>;

      const propIds = [...new Set(items.map(i => i.property_id).filter(Boolean))] as string[];
      const unitIds = [...new Set(items.map(i => i.unit_id).filter(Boolean))] as string[];
      const leadIds = [...new Set(items.map(i => i.lead_id).filter(Boolean))] as string[];

      const nameMap: Record<string, string> = {};

      if (propIds.length > 0) {
        const { data } = await supabase.from('properties').select('id, name').in('id', propIds);
        for (const p of data || []) nameMap[`prop_${p.id}`] = p.name || 'Imóvel';
      }
      if (unitIds.length > 0) {
        const { data } = await supabase.from('units').select('id, unit_number').in('id', unitIds);
        for (const u of data || []) nameMap[`unit_${u.id}`] = u.unit_number || 'Unidade';
      }
      if (leadIds.length > 0) {
        const { data } = await supabase.from('contacts').select('id, name').in('id', leadIds);
        for (const c of data || []) nameMap[`contact_${c.id}`] = c.name || 'Contato';
      }

      return {
        items: items.map(i => ({
          ...i,
          subtitle: i.unit_id ? nameMap[`unit_${i.unit_id}`] :
                    i.property_id ? nameMap[`prop_${i.property_id}`] :
                    i.lead_id ? nameMap[`contact_${i.lead_id}`] : null,
        })),
        total: count || 0,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const displayed = data?.items.slice(0, 8) || [];
  const total = data?.total || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Compromissos <HelpTooltip featureKey="dashboard.appointments" />
          {scope === 'workspace' && (
            <Badge variant="secondary" className="text-[10px] font-normal">Equipe</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              onClick={() => setPeriod(option.value)}
              className={`h-6 px-2 text-[10px] ${
                period === option.value
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Nenhum compromisso no período selecionado.</p>
            <Link to="/schedule" className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
              Abrir agenda <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {displayed.map(item => {
              const Icon = ACTIVITY_ICONS[item.activity_type] || Calendar;
              return (
                <Link
                  key={item.id}
                  to={`/schedule?activity=${item.id}`}
                  className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {format(new Date(item.scheduled_at), 'HH:mm')}
                      </span>
                      <span className="text-sm font-medium truncate">{item.title}</span>
                    </div>
                    {item.subtitle && (
                      <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                  </div>
                </Link>
              );
            })}
            {total > 8 && (
              <Link to="/schedule" className="block text-center text-xs text-primary hover:underline pt-2">
                Ver todos ({total})
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
