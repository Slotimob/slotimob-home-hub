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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange as RDPRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import {
  FileText,
  Download,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  BarChart3,
  Plus,
  StickyNote,
  Pencil,
  Trash2,
  Paperclip,
  User,
  CircleDollarSign,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { isToday, isYesterday, startOfMonth, endOfDay } from 'date-fns';
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
import { ActivityFormDialog } from '@/components/assets/ActivityFormDialog';
import { activityTypeLabel } from '@/lib/activity-types';


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
  activity_type?: string | null;
  description?: string | null;
  assigned_contact_id?: string | null;
  responsible_name?: string | null;
  estimated_cost?: number | null;
  has_transaction?: boolean;
  attachments_count?: number;
  is_completed?: boolean;
}

function isManualNote(item: any): item is ManualNote {
  return item && item.type === 'manual_note';
}

function resolveActorId(log: AuditLog): string {
  return log.actor_user_id || log.broker_id;
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
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => ({
    from: startOfMonth(new Date()),
    to: new Date(),
  }));
  const [periodOpen, setPeriodOpen] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState<RDPRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });
  const [userFilter, setUserFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [raConfigOpen, setRaConfigOpen] = useState(false);

  const queryClient = useQueryClient();
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteDate, setEditNoteDate] = useState('');
  const [savingEditNote, setSavingEditNote] = useState(false);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<ManualNote | null>(null);
  const [deletingNote, setDeletingNote] = useState(false);

  // Build date filter (range: início do mês atual até hoje, por padrão)
  const periodStartDate = useMemo(() => dateRange.from, [dateRange.from]);
  const periodEndDate = useMemo(() => endOfDay(dateRange.to), [dateRange.to]);
  const isDefaultPeriod = useMemo(() => {
    const defFrom = startOfMonth(new Date());
    return (
      format(dateRange.from, 'yyyy-MM-dd') === format(defFrom, 'yyyy-MM-dd') &&
      format(dateRange.to, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    );
  }, [dateRange]);

  // Fetch audit logs
  const { data: rawLogs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['asset-audit-logs', assetType, assetId],
    queryFn: async () => {
      const metadataKey = assetType === 'property' ? 'property_id' : 'unit_id';
      const tableName = assetType === 'property' ? 'properties' : 'units';

      // Escopo por herança: no empreendimento, também consideramos as unidades filhas,
      // pois muitos logs (reajuste, benfeitorias) só carregam unit_id.
      let childUnitIds: string[] = [];
      if (assetType === 'property') {
        const { data: unitRows } = await supabase
          .from('units')
          .select('id')
          .eq('property_id', assetId)
          .limit(500);
        childUnitIds = (unitRows || []).map((u: any) => u.id);
      }

      const scopedIds = assetType === 'property' ? [assetId, ...childUnitIds] : [assetId];
      const inList = `(${scopedIds.join(',')})`;

      const queries: any[] = [
        // 1. Log direto no próprio registro do ativo
        supabase
          .from('audit_logs')
          .select('*')
          .eq('table_name', tableName)
          .eq('record_id', assetId)
          .order('created_at', { ascending: false })
          .limit(500),
        // 2. Escopo via metadata (padrão atual)
        supabase
          .from('audit_logs')
          .select('*')
          .filter(`metadata->>${metadataKey}`, 'eq', assetId)
          .order('created_at', { ascending: false })
          .limit(500),
        // 3. Fallback: escopo pelas colunas do registro auditado (new_data/old_data)
        supabase
          .from('audit_logs')
          .select('*')
          .or(
            `new_data->>${metadataKey}.eq.${assetId},old_data->>${metadataKey}.eq.${assetId}`
          )
          .order('created_at', { ascending: false })
          .limit(500),
      ];

      // 4. Herança unidade → imóvel: logs que só conhecem unit_id
      if (assetType === 'property' && childUnitIds.length > 0) {
        queries.push(
          supabase
            .from('audit_logs')
            .select('*')
            .or(
              `metadata->>unit_id.in.${inList},new_data->>unit_id.in.${inList},old_data->>unit_id.in.${inList}`
            )
            .order('created_at', { ascending: false })
            .limit(500)
        );
      }

      const results = await Promise.all(queries);

      // Merge and deduplicate by id
      const map = new Map<string, AuditLog>();
      for (const res of results) {
        for (const log of (res?.data || [])) {
          map.set(log.id, log as AuditLog);
        }
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

  // Fetch manual notes
  const { data: manualNotes = [] } = useQuery<ManualNote[]>({
    queryKey: ['asset-manual-notes', assetType, assetId],
    queryFn: async () => {
      const col = assetType === 'unit' ? 'unit_id' : 'property_id';
      const { data, error } = await (supabase as any)
        .from('property_activities')
        .select('id, title, description, scheduled_at, created_at, broker_id, activity_type, assigned_contact_id, estimated_cost, financial_transaction_id, is_completed')
        .eq(col, assetId)
        .order('scheduled_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      const rows = data || [];

      const contactIds = [...new Set(rows.map((r: any) => r.assigned_contact_id).filter(Boolean))] as string[];
      const activityIds = rows.map((r: any) => r.id);

      const [contactsRes, docsRes] = await Promise.all([
        contactIds.length
          ? supabase.from('contacts').select('id, name').in('id', contactIds)
          : Promise.resolve({ data: [] as any[] }),
        activityIds.length
          ? (supabase as any).from('documents').select('activity_id').in('activity_id', activityIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const contactNames: Record<string, string> = {};
      ((contactsRes as any).data || []).forEach((c: any) => { contactNames[c.id] = c.name; });
      const attachments: Record<string, number> = {};
      ((docsRes as any).data || []).forEach((d: any) => {
        if (!d.activity_id) return;
        attachments[d.activity_id] = (attachments[d.activity_id] || 0) + 1;
      });

      return rows.map((r: any) => ({
        ...r,
        type: 'manual_note' as const,
        responsible_name: r.assigned_contact_id ? contactNames[r.assigned_contact_id] || null : null,
        attachments_count: attachments[r.id] || 0,
        has_transaction: !!r.financial_transaction_id,
      }));
    },
    staleTime: 30_000,
  });

  const startEditNote = (note: ManualNote) => {
    setEditingNoteId(note.id);
    setEditNoteTitle(note.title || '');
    const base = note.scheduled_at || note.created_at;
    setEditNoteDate(base ? new Date(base).toISOString().split('T')[0] : '');
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditNoteTitle('');
    setEditNoteDate('');
  };

  const saveEditNote = async () => {
    if (!editingNoteId || !editNoteTitle.trim()) return;
    setSavingEditNote(true);
    try {
      const { error } = await (supabase as any)
        .from('property_activities')
        .update({
          title: editNoteTitle.trim(),
          scheduled_at: editNoteDate ? new Date(editNoteDate + 'T12:00:00').toISOString() : null,
        })
        .eq('id', editingNoteId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['asset-manual-notes', assetType, assetId] });
      cancelEditNote();
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar atividade', description: e.message, variant: 'destructive' });
    } finally {
      setSavingEditNote(false);
    }
  };

  const confirmDeleteNote = async () => {
    if (!deleteNoteTarget) return;
    setDeletingNote(true);
    try {
      const { error } = await (supabase as any)
        .from('property_activities')
        .delete()
        .eq('id', deleteNoteTarget.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['asset-manual-notes', assetType, assetId] });
      setDeleteNoteTarget(null);
    } catch (e: any) {
      toast({ title: 'Erro ao excluir atividade', description: e.message, variant: 'destructive' });
    } finally {
      setDeletingNote(false);
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    const inPeriod = (d: Date) => d >= periodStartDate && d <= periodEndDate;

    const auditFiltered = rawLogs.filter(log => {
      if (!matchesEventType(log, eventFilter)) return false;
      if (!inPeriod(new Date(log.created_at))) return false;
      if (userFilter !== 'all' && log.broker_id !== userFilter) return false;
      return true;
    });

    const notesFiltered = manualNotes.filter(note => {
      const nDate = note.scheduled_at ? new Date(note.scheduled_at) : new Date(note.created_at);
      if (!inPeriod(nDate)) return false;
      if (userFilter !== 'all' && note.broker_id !== userFilter) return false;
      return true;
    });

    return [...auditFiltered, ...notesFiltered].sort((a, b) => {
      const dateA = isManualNote(a) ? (a.scheduled_at ?? a.created_at) : a.created_at;
      const dateB = isManualNote(b) ? (b.scheduled_at ?? b.created_at) : b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [rawLogs, manualNotes, eventFilter, periodStartDate, periodEndDate, userFilter]);

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
      const dateStr = isBillingSummary(item)
        ? item.logs[0].created_at
        : isManualNote(item)
          ? (item.scheduled_at ?? item.created_at)
          : item.created_at;
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

  const hasActiveFilters = eventFilter !== 'all' || !isDefaultPeriod || userFilter !== 'all';

  const clearFilters = () => {
    setEventFilter('all');
    const defRange = { from: startOfMonth(new Date()), to: new Date() };
    setDateRange(defRange);
    setPendingPeriod({ from: defRange.from, to: defRange.to });
    setUserFilter('all');
    setPage(1);
  };

  // Linhas compartilhadas entre CSV e PDF (inclui notas manuais)
  const buildExportRows = useCallback(() => {
    return filteredLogs.map(item => {
      if (isManualNote(item)) {
        return [
          formatTimestampAbsolute(item.scheduled_at ?? item.created_at),
          'Nota manual',
          'Atividade',
          item.title || 'Nota',
          profileMap[item.broker_id] || 'Usuário',
          '',
        ];
      }
      const log = item as AuditLog;
      const changes = getChangedFields(log);
      return [
        formatTimestampAbsolute(log.created_at),
        ACTION_LABELS[log.action] || log.action,
        TABLE_LABELS[log.table_name] || log.table_name,
        getRecordName(log),
        profileMap[log.broker_id] || 'Usuário',
        changes.map(c => `${c.label}: ${c.from} -> ${c.to}`).join('; '),
      ];
    });
  }, [filteredLogs, profileMap]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const headers = ['Data', 'Ação', 'Tabela', 'Registro', 'Usuário', 'Alterações'];
    const rows = buildExportRows();

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
  }, [buildExportRows, assetType, assetId]);

  // (Exportação em PDF avulsa removida — absorvida pelo "Relatório completo")


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

          <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 text-xs justify-start font-normal min-w-0 w-[200px]',
                  !dateRange.from && 'text-muted-foreground',
                )}
              >
                <CalendarDays className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {dateRange.from && dateRange.to
                    ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Selecione o período'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={pendingPeriod}
                onSelect={(range) => {
                  setPendingPeriod(range);
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setPage(1);
                    setPeriodOpen(false);
                  }
                }}
                initialFocus
                numberOfMonths={2}
                locale={ptBR}
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

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
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setActivityDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Incluir atividade
          </Button>
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

                  if (isManualNote(item)) {
                    const authorName = profileMap[item.broker_id] || 'Usuário';
                    const canManageNote = item.broker_id === brokerId;

                    if (editingNoteId === item.id) {
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
                        >
                          <p className="text-xs font-medium text-muted-foreground">Editar atividade manual</p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              placeholder="Descrição"
                              value={editNoteTitle}
                              onChange={e => setEditNoteTitle(e.target.value)}
                              className="h-8 text-sm flex-1"
                              onKeyDown={e => { if (e.key === 'Enter') saveEditNote(); }}
                              autoFocus
                            />
                            <input
                              type="date"
                              value={editNoteDate}
                              onChange={e => setEditNoteDate(e.target.value)}
                              className="h-8 text-sm rounded-md border border-input bg-background px-2 shrink-0 w-full sm:w-[140px]"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEditNote}>
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={saveEditNote}
                              disabled={!editNoteTitle.trim() || savingEditNote}
                            >
                              {savingEditNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          <StickyNote className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">
                            <span className="font-medium">{authorName}</span>
                            {' '}
                            <span className="text-muted-foreground">registrou atividade:</span>
                            {' '}
                            <span>{item.title}</span>
                          </p>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {item.activity_type && item.activity_type !== 'note' && (
                              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                                {activityTypeLabel(item.activity_type)}
                              </Badge>
                            )}
                            {item.responsible_name && (
                              <Badge variant="outline" className="h-5 text-[10px] px-1.5 gap-1 font-normal">
                                <User className="h-2.5 w-2.5" />
                                {item.responsible_name}
                              </Badge>
                            )}
                            {!!item.attachments_count && (
                              <Badge variant="outline" className="h-5 text-[10px] px-1.5 gap-1 font-normal">
                                <Paperclip className="h-2.5 w-2.5" />
                                {item.attachments_count} anexo{item.attachments_count > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {item.estimated_cost != null && (
                              <Badge variant="outline" className="h-5 text-[10px] px-1.5 gap-1 font-normal">
                                <CircleDollarSign className="h-2.5 w-2.5" />
                                {Number(item.estimated_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                {item.has_transaction ? ' · lançado' : ''}
                              </Badge>
                            )}
                            {item.is_completed && (
                              <Badge className="h-5 text-[10px] px-1.5 gap-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Concluída
                              </Badge>
                            )}
                          </div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                                {item.scheduled_at ? formatTimestamp(item.scheduled_at) : formatTimestamp(item.created_at)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              {item.scheduled_at ? formatTimestampAbsolute(item.scheduled_at) : formatTimestampAbsolute(item.created_at)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {canManageNote && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground"
                              title="Editar atividade"
                              onClick={() => startEditNote(item)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              title="Excluir atividade"
                              onClick={() => setDeleteNoteTarget(item)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
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
      <ActivityFormDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        defaultAsset={{
          id: assetId,
          type: assetType,
          label: assetType === 'unit' ? 'Esta unidade' : 'Este imóvel',
        }}
        lockAsset
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['asset-manual-notes', assetType, assetId] });
        }}
      />

      <RAReportConfigDialog
        open={raConfigOpen}
        onOpenChange={setRaConfigOpen}
        dateRange={{
          from: dateRange.from,
          to: dateRange.to,
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
        preSelectedAssetType={assetType}
        formatLabel="PDF"
      />

      <AlertDialog open={!!deleteNoteTarget} onOpenChange={(o) => { if (!o) setDeleteNoteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade manual?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A atividade "{deleteNoteTarget?.title}" será removida permanentemente do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingNote}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDeleteNote(); }}
              disabled={deletingNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
