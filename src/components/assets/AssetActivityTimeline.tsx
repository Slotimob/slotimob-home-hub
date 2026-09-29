import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { BarChart3, CalendarDays, Download, ExternalLink, History, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { RAReportConfigDialog } from '@/components/reports/RAReportConfigDialog';
import { generateAssetReportPdf } from '@/utils/assetReportPdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { ActivityFormDialog, type EditingActivity } from '@/components/assets/ActivityFormDialog';
import { useAssetTimeline } from '@/hooks/useAssetTimeline';
import {
  TIMELINE_CATEGORIES,
  categoryDef,
  eventTitle,
  type AssetTimelineEvent,
  type TimelineCategory,
} from '@/lib/asset-timeline';
import { formatDateOnly, parseDateOnly, todayDateOnly } from '@/lib/date-only';
import { format, subMonths } from 'date-fns';

type AssetActivityTimelineProps = {
  assetType: 'property' | 'unit';
  assetId: string;
  /** Obsoleto: o dono do workspace é resolvido internamente. */
  brokerId?: string;
  pageSize?: number;
};

type PeriodKey = 'all' | '12m' | 'year' | 'custom';

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: '12m', label: '12 meses' },
  { value: 'year', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
];

export const AssetActivityTimeline = ({ assetType, assetId }: AssetActivityTimelineProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: events = [], isLoading, error, refetch } = useAssetTimeline(assetType, assetId);

  const [categories, setCategories] = useState<Set<TimelineCategory>>(new Set());
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<EditingActivity | null>(null);
  const [raConfigOpen, setRaConfigOpen] = useState(false);

  const range = useMemo((): { from: string | null; to: string | null } => {
    const today = todayDateOnly();
    if (period === '12m') return { from: format(subMonths(new Date(), 12), 'yyyy-MM-dd'), to: today };
    if (period === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today };
    if (period === 'custom') return { from: customFrom || null, to: customTo || null };
    return { from: null, to: null };
  }, [period, customFrom, customTo]);

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (categories.size && !categories.has(e.category as TimelineCategory)) return false;
        const d = e.occurred_on;
        if (range.from && (!d || d < range.from)) return false;
        if (range.to && (!d || d > range.to)) return false;
        return true;
      }),
    [events, categories, range],
  );

  const groups = useMemo(() => {
    const map = new Map<string, AssetTimelineEvent[]>();
    filtered.forEach((e) => {
      const key = e.occurred_on ? e.occurred_on.slice(0, 7) : 'sem-data';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const toggleCategory = (c: TimelineCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  const exportCSV = useCallback(() => {
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const rows = filtered.map((e) =>
      [formatDateOnly(e.occurred_on, 'dd/MM/yyyy', ''), categoryDef(e.category).label, eventTitle(e), e.detail || '']
        .map(esc)
        .join(';'),
    );
    const csv = [['Data', 'Categoria', 'Evento', 'Detalhe'].join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-${assetType}-${assetId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, assetType, assetId]);

  const openSource = async (e: AssetTimelineEvent) => {
    if (e.source_table === 'property_activities' && e.source_id) {
      const { data, error: err } = await supabase
        .from('property_activities')
        .select('id, title, description, activity_type, scheduled_at, estimated_cost, assigned_contact_id')
        .eq('id', e.source_id)
        .maybeSingle();
      if (err || !data) {
        toast({ title: 'Atividade não encontrada', variant: 'destructive', duration: 1000 });
        return;
      }
      setEditingActivity(data as EditingActivity);
      setActivityDialogOpen(true);
      return;
    }
    if (e.lease_id) navigate(`/gestao/contratos?id=${e.lease_id}`);
  };

  const hasLink = (e: AssetTimelineEvent) =>
    (e.source_table === 'property_activities' && !!e.source_id) || !!e.lease_id;

  const reportRange = useMemo(() => {
    const to = parseDateOnly(range.to) || new Date();
    // Sem início definido ("Tudo") → todo o histórico
    const from = parseDateOnly(range.from);
    return { from, to };
  }, [range]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico do imóvel
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { setEditingActivity(null); setActivityDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> Incluir atividade
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setRaConfigOpen(true)}>
            <BarChart3 className="h-3.5 w-3.5" /> Relatório completo
          </Button>
          {filtered.length > 0 && (
            <Button aria-label="Exportar CSV" variant="ghost" size="icon" className="h-8 w-8" onClick={exportCSV} title="Exportar CSV">
              <Download aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIMELINE_CATEGORIES.map((c) => {
          const active = categories.has(c.value);
          return (
            <Button
              key={c.value}
              size="sm"
              variant={active ? 'default' : 'outline'}
              className="h-7 rounded-full text-xs"
              onClick={() => toggleCategory(c.value)}
            >
              {c.label}
            </Button>
          );
        })}
        {categories.size > 0 && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCategories(new Set())}>
            Limpar
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        {PERIODS.map((p) =>
          p.value === 'custom' ? (
            <Popover key={p.value}>
              <PopoverTrigger asChild>
                <Button size="sm" variant={period === 'custom' ? 'secondary' : 'ghost'} className="h-7 text-xs" onClick={() => setPeriod('custom')}>
                  {period === 'custom' && (customFrom || customTo)
                    ? `${formatDateOnly(customFrom, 'dd/MM/yy', '…')} – ${formatDateOnly(customTo, 'dd/MM/yy', '…')}`
                    : p.label}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-2">
                <label className="text-xs text-muted-foreground">De</label>
                <Input type="date" value={customFrom} onChange={(ev) => setCustomFrom(ev.target.value)} className="text-base" />
                <label className="text-xs text-muted-foreground">Até</label>
                <Input type="date" value={customTo} onChange={(ev) => setCustomTo(ev.target.value)} className="text-base" />
              </PopoverContent>
            </Popover>
          ) : (
            <Button key={p.value} size="sm" variant={period === p.value ? 'secondary' : 'ghost'} className="h-7 text-xs" onClick={() => setPeriod(p.value)}>
              {p.label}
            </Button>
          ),
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5" /> Não foi possível carregar o histórico.
          <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" />Tentar de novo</Button>
        </div>
      ) : groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum acontecimento neste filtro.</p>
      ) : (
        <div className="space-y-5">
          {groups.map(([key, items]) => (
            <div key={key} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {key === 'sem-data' ? 'Sem data' : formatDateOnly(`${key}-01`, 'MMMM yyyy')}
              </h4>
              <div className="relative space-y-2 border-l border-border pl-4">
                {items.map((e, i) => {
                  const def = categoryDef(e.category);
                  const Icon = def.icon;
                  return (
                    <div key={`${e.source_table}-${e.source_id}-${e.event_type}-${i}`} className="relative rounded-lg border bg-card p-3">
                      <span className={cn('absolute -left-[29px] top-3 flex h-6 w-6 items-center justify-center rounded-full border border-background', def.iconClass)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{eventTitle(e)}</p>
                          {e.detail && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{e.detail}</p>}
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {formatDateOnly(e.occurred_on)} · {def.label}
                          </p>
                        </div>
                        {hasLink(e) && (
                          <Button variant="ghost" size="sm" className="h-7 shrink-0 text-xs gap-1" onClick={() => openSource(e)}>
                            {e.source_table === 'property_activities' ? 'Editar' : 'Ver contrato'}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 text-center">
        <Link to="/history" className="text-xs text-muted-foreground hover:underline">
          Ver log técnico do sistema
        </Link>
      </div>

      <ActivityFormDialog
        open={activityDialogOpen}
        onOpenChange={(o) => { setActivityDialogOpen(o); if (!o) setEditingActivity(null); }}
        defaultAsset={{ id: assetId, type: assetType, label: assetType === 'unit' ? 'Esta unidade' : 'Este imóvel' }}
        lockAsset
        editingActivity={editingActivity}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['asset-timeline'] })}
      />

      <RAReportConfigDialog
        open={raConfigOpen}
        onOpenChange={setRaConfigOpen}
        dateRange={reportRange}
        onGenerate={async (data) => {
          try {
            await generateAssetReportPdf(data);
            toast({ title: 'PDF gerado com sucesso!', duration: 1000 });
          } catch (err: any) {
            toast({ title: 'Erro ao gerar relatório', description: err.message, variant: 'destructive', duration: 1000 });
          }
        }}
        preSelectedAssetIds={[assetId]}
        preSelectedAssetType={assetType}
        formatLabel="PDF"
      />
    </div>
  );
};

export default AssetActivityTimeline;
