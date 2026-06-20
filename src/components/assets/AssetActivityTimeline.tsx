import { useState, useMemo, useCallback } from 'react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText,
  Download,
  FileDown,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  BarChart3,
  Plus,
  StickyNote,
} from 'lucide-react';
import { isToday, isYesterday, subDays, subMonths } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RAReportConfigDialog } from '@/components/reports/RAReportConfigDialog';
import { generateAssetReportPdf } from '@/utils/assetReportPdfGenerator';
import type { AssetReportData } from '@/lib/asset-report-data';
import { useToast } from '@/hooks/use-toast';

import {
  TABLE_LABELS,
  TABLE_ICONS,
  ACTION_LABELS,
  EVENT_GROUPS,
  type AuditLog,
  getChangedFields,
  getRecordName,
  humanizeLog,
  getActionStyle,
  formatTimestamp,
  formatTimestampAbsolute,
  deduplicateAuditLogs,
} from '@/lib/audit-formatting';

// ── Types ──────────────────────────────────────────────────

type AssetActivityTimelineProps = {
  assetType: 'property' | 'unit';
  assetId: string;
  brokerId: string;
  pageSize?: number;
};

interface ProfileMap {
  [userId: string]: string;
}

// ── Filter constants ───────────────────────────────────────

const EVENT_TYPE_FILTERS = [
  { value: 'all', label: 'Todos' },
  ...Object.entries(EVENT_GROUPS).map(([key, def]) => ({
    value: key,
    label: def.label,
  })),
];

const PERIOD_FILTERS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo o histórico' },
];

// Migration deployment date – used for empty state message
const FEATURE_DEPLOY_DATE = '01/05/2026';

function matchesEventType(log: AuditLog, filterType: string): boolean {
  if (filterType === 'all') return true;
  const group = EVENT_GROUPS[filterType];
  return group ? group.match(log) : true;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

// ── Billing summary helpers ────────────────────────────────

interface BillingSummary {
  type: 'billing_summary';
  monthKey: string;
  monthLabel: string;
  logs: AuditLog[];
}

interface ManualNote {
  id: string;
  type: 'manual_note';
  title: string;
  scheduled_at: string | null;
  created_at: string;
  broker_id: string;
}

function isManualNote(item: any): item is ManualNote {
  return item && item.type === 'manual_note';
}

type TimelineItem = AuditLog | BillingSummary | ManualNote;

function isBillingSummary(item: TimelineItem): item is BillingSummary {
  return 'type' in item && (item as any).type === 'billing_summary';
}

function collapseBillingEvents(logs: (AuditLog | ManualNote)[]): TimelineItem[] {
  const billingByMonth = new Map<string, AuditLog[]>();
  const nonBilling: (AuditLog | ManualNote)[] = [];

  for (const log of logs) {
    if (!isManualNote(log) && log.action === 'billing_issued') {
      const d = new Date(log.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!billingByMonth.has(key)) billingByMonth.set(key, []);
      billingByMonth.get(key)!.push(log);
    } else {
      nonBilling.push(log);
    }
  }

  const result: TimelineItem[] = [...nonBilling];

  for (const [key, bLogs] of billingByMonth) {
    if (bLogs.length > 5) {
      const d = new Date(bLogs[0].created_at);
      const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
      result.push({
        type: 'billing_summary',
        monthKey: key,
        monthLabel: label,
        logs: bLogs,
      });
    } else {
      result.push(...bLogs);
    }
  }

  result.sort((a, b) => {
    const dateA = isBillingSummary(a) ? a.logs[0].created_at : isManualNote(a) ? (a.scheduled_at ?? a.created_at) : a.created_at;
    const dateB = isBillingSummary(b) ? b.logs[0].created_at : isManualNote(b) ? (b.scheduled_at ?? b.created_at) : b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return result;
}

// ── Component ──────────────────────────────────────────────

export const AssetActivityTimeline = ({
  assetType,
  assetId,
  brokerId,
  pageSize = 25,
}: AssetActivityTimelineProps) => {
  const { toast } = useToast();
  const [eventFilter, setEventFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('30');
  const [userFilter, setUserFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [raConfigOpen, setRaConfigOpen] = useState(false);

  const queryClient = useQueryClient();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [savingNote, setSavingNote] = useState(false);

  // Build date filter
  const periodStartDate = useMemo(() => {
    if (periodFilter === 'all') return null;
    const days = parseInt(periodFilter);
    return days <= 90 ? subDays(new Date(), days) : subMonths(new Date(), 12);
  }, [periodFilter]);

  // Fetch audit logs
  const { data: rawLogs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['asset-audit-logs', assetType, assetId],
    queryFn: async () => {
      const metadataKey = assetType === 'property' ? 'property_id' : 'unit_id';
      const tableName = assetType === 'property' ? 'properties' : 'units';

      const [directResult, metaResult] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('*')
          .eq('table_name', tableName)
          .eq('record_id', assetId)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('audit_logs')
          .select('*')
          .filter(`metadata->>${metadataKey}`, 'eq', assetId)
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      const directLogs = directResult.data || [];
      const metaLogs = metaResult.data || [];

      // Merge and deduplicate by id
      const map = new Map<string, AuditLog>();
      for (const log of [...directLogs, ...metaLogs]) {
        map.set(log.id, log as AuditLog);
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Deduplicate generic vs specific
      return deduplicateAuditLogs(merged);
    },
    staleTime: 30_000,
  });

  // Fetch profile names for broker_ids in logs
  const brokerIds = useMemo(() => {
    return [...new Set(rawLogs.map(l => l.broker_id))];
  }, [rawLogs]);

  const { data: profileMap = {} } = useQuery<ProfileMap>({
    queryKey: ['audit-profiles', brokerIds.join(',')],
    queryFn: async () => {
      if (brokerIds.length === 0) return {};
      const { data } = await (supabase as any)
        .from('profile_directory')
        .select('id, full_name')
        .in('id', brokerIds);
      const map: ProfileMap = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name || 'Usuário'; });
      return map;
    },
    enabled: brokerIds.length > 0,
    staleTime: 60_000,
  });

  // Filter logs
  const filteredLogs = useMemo(() => {
    return rawLogs.filter(log => {
      if (!matchesEventType(log, eventFilter)) return false;
      if (periodStartDate && new Date(log.created_at) < periodStartDate) return false;
      if (userFilter !== 'all' && log.broker_id !== userFilter) return false;
      return true;
    });
  }, [rawLogs, eventFilter, periodStartDate, userFilter]);

  // Collapse billing and paginate
  const timelineItems = useMemo(() => {
    const collapsed = collapseBillingEvents(filteredLogs);
    return collapsed.slice(0, page * pageSize);
  }, [filteredLogs, page, pageSize]);

  const totalItems = useMemo(() => collapseBillingEvents(filteredLogs).length, [filteredLogs]);
  const hasMore = timelineItems.length < totalItems;

  // Group by day
  const groupedItems = useMemo(() => {
    const groups: { label: string; items: TimelineItem[] }[] = [];
    let currentDayLabel = '';
    for (const item of timelineItems) {
      const dateStr = isBillingSummary(item) ? item.logs[0].created_at : item.created_at;
      const dayLabel = getDayLabel(dateStr);
      if (dayLabel !== currentDayLabel) {
        currentDayLabel = dayLabel;
        groups.push({ label: dayLabel, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  }, [timelineItems]);

  // Users available in logs for filter
  const userOptions = useMemo(() => {
    return brokerIds.map(id => ({
      value: id,
      label: profileMap[id] || 'Usuário',
    }));
  }, [brokerIds, profileMap]);

  const hasActiveFilters = eventFilter !== 'all' || periodFilter !== '30' || userFilter !== 'all';

  const clearFilters = () => {
    setEventFilter('all');
    setPeriodFilter('30');
    setUserFilter('all');
    setPage(1);
  };

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = ['Data', 'Ação', 'Tabela', 'Registro', 'Usuário', 'Alterações'];
    const rows = filteredLogs.map(log => {
      const changes = getChangedFields(log);
      return [
        formatTimestampAbsolute(log.created_at),
        ACTION_LABELS[log.action] || log.action,
        TABLE_LABELS[log.table_name] || log.table_name,
        getRecordName(log),
        profileMap[log.broker_id] || 'Usuário',
        changes.map(c => `${c.label}: ${c.from} → ${c.to}`).join('; '),
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atividades-${assetType}-${assetId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs, profileMap, assetType, assetId]);

  // Export PDF
  const exportPDF = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(`Histórico de Atividades`, 14, 15);
    doc.setFontSize(9);
    doc.text(`${filteredLogs.length} registros`, 14, 22);

    const tableData = filteredLogs.map(log => {
      const changes = getChangedFields(log);
      return [
        formatTimestampAbsolute(log.created_at),
        ACTION_LABELS[log.action] || log.action,
        TABLE_LABELS[log.table_name] || log.table_name,
        getRecordName(log).slice(0, 30),
        (profileMap[log.broker_id] || 'Usuário').slice(0, 20),
        changes.map(c => `${c.label}: ${c.from} → ${c.to}`).join('; ').slice(0, 60),
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [['Data', 'Ação', 'Tipo', 'Registro', 'Usuário', 'Alterações']],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`atividades-${assetType}-${assetId.slice(0, 8)}.pdf`);
  }, [filteredLogs, profileMap, assetType, assetId]);

  // ── Render ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive/60" />
        <p className="text-sm text-muted-foreground">Erro ao carregar atividades</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPE_FILTERS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_FILTERS.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {userOptions.length > 1 && (
            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {userOptions.map(u => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setRaConfigOpen(true)}>
                  <BarChart3 className="h-3.5 w-3.5" />
                  Relatório completo
                </Button>
              </TooltipTrigger>
              <TooltipContent>Gerar relatório completo deste imóvel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {filteredLogs.length > 0 && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportCSV}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar CSV</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportPDF}>
                      <FileDown className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar PDF</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-[11px] text-muted-foreground">
        {filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'}
      </p>

      {/* Timeline */}
      {timelineItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            Histórico de atividades a partir de {FEATURE_DEPLOY_DATE}.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Novas atividades aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {groupedItems.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-3 py-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {group.label}
                </span>
                <Separator className="flex-1" />
              </div>

              <div className="space-y-0.5">
                {group.items.map((item, idx) => {
                  if (isBillingSummary(item)) {
                    return (
                      <BillingSummaryItem
                        key={`bs-${item.monthKey}`}
                        summary={item}
                        profileMap={profileMap}
                      />
                    );
                  }

                  const log = item;
                  const TableIcon = TABLE_ICONS[log.table_name] || FileText;
                  const authorName = profileMap[log.broker_id] || 'Usuário';
                  const changes = getChangedFields(log);

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${getActionStyle(log.action)}`}>
                        <TableIcon className="h-3 w-3" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{authorName}</span>
                          {' '}
                          <span className="text-muted-foreground">{humanizeLog(log)}</span>
                        </p>

                        {changes.length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            {changes.slice(0, 3).map((c, i) => (
                              <span key={i}>
                                {i > 0 && <span className="mx-1 opacity-40">|</span>}
                                <span className="font-medium text-foreground/70">{c.label}:</span>{' '}
                                <span className="line-through opacity-60">{c.from}</span>{' → '}
                                <span>{c.to}</span>
                              </span>
                            ))}
                          </p>
                        )}
                      </div>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                              {formatTimestamp(log.created_at)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            {formatTimestampAbsolute(log.created_at)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setPage(p => p + 1)}
          >
            Carregar mais ({totalItems - timelineItems.length} restantes)
          </Button>
        </div>
      )}
      <RAReportConfigDialog
        open={raConfigOpen}
        onOpenChange={setRaConfigOpen}
        dateRange={{
          from: periodStartDate || subDays(new Date(), 30),
          to: new Date(),
        }}
        onGenerate={async (data) => {
          try {
            await generateAssetReportPdf(data);
            toast({ title: 'PDF gerado com sucesso!', duration: 1000 });
          } catch (e: any) {
            toast({ title: 'Erro ao gerar relatório', description: e.message, variant: 'destructive', duration: 1000 });
          }
        }}
        preSelectedAssetIds={[assetId]}
        formatLabel="PDF"
      />
    </div>
  );
};

// ── Billing Summary Collapsible ────────────────────────────

function BillingSummaryItem({
  summary,
  profileMap,
}: {
  summary: BillingSummary;
  profileMap: ProfileMap;
}) {
  const [open, setOpen] = useState(false);
  const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalAmount = summary.logs.reduce((sum, l) => {
    const amt = l.metadata?.amount ?? l.new_data?.amount ?? 0;
    return sum + Number(amt);
  }, 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <FileText className="h-3 w-3" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug text-muted-foreground">
              <span className="font-medium text-foreground">{summary.logs.length} cobranças</span>
              {' '}geradas em {summary.monthLabel}
              {totalAmount > 0 && (
                <span className="ml-1 text-xs">
                  — total {brlFmt.format(totalAmount)}
                </span>
              )}
            </p>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-9 border-l-2 border-muted pl-3 space-y-0.5">
          {summary.logs.map(log => {
            const authorName = profileMap[log.broker_id] || 'Usuário';
            return (
              <div key={log.id} className="flex items-start gap-2 py-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">{authorName}</span>
                <span>{humanizeLog(log)}</span>
                <span className="ml-auto whitespace-nowrap text-[10px]">
                  {formatTimestamp(log.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
