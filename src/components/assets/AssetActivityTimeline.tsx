import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
  FileText,
  Download,
  FileDown,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { isToday, isYesterday, subDays, subMonths } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  TABLE_LABELS,
  TABLE_ICONS,
  ACTION_LABELS,
  type AuditLog,
  getChangedFields,
  getRecordName,
  humanizeLog,
  getActionStyle,
  formatTimestamp,
  formatTimestampAbsolute,
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
  { value: 'edits', label: 'Edições' },
  { value: 'documents', label: 'Documentos' },
  { value: 'deals', label: 'Negócios' },
  { value: 'visits', label: 'Visitas' },
  { value: 'sales', label: 'Vendas' },
  { value: 'leases', label: 'Contratos' },
];

const PERIOD_FILTERS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo o histórico' },
];

function matchesEventType(log: AuditLog, filterType: string): boolean {
  switch (filterType) {
    case 'all': return true;
    case 'edits':
      return ['properties', 'units'].includes(log.table_name) && ['INSERT', 'UPDATE', 'DELETE'].includes(log.action);
    case 'documents':
      return ['property_documents', 'documents'].includes(log.table_name) ||
        ['property_document_created', 'property_document_deleted', 'document_created', 'document_deleted', 'document_updated'].includes(log.action);
    case 'deals':
      return log.table_name === 'deals' || log.action === 'deal_stage_change';
    case 'visits':
      return log.table_name === 'visits';
    case 'sales':
      return log.table_name === 'sales' || log.action === 'sale_recorded';
    case 'leases':
      return log.table_name === 'leases';
    default: return true;
  }
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

// ── Component ──────────────────────────────────────────────

export const AssetActivityTimeline = ({
  assetType,
  assetId,
  brokerId,
  pageSize = 25,
}: AssetActivityTimelineProps) => {
  const [eventFilter, setEventFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('30');
  const [userFilter, setUserFilter] = useState('all');
  const [page, setPage] = useState(1);

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
      // We need an OR query: (table_name = X AND record_id = assetId) OR metadata->>key = assetId
      // Supabase JS doesn't support complex OR on metadata easily, so we use two queries
      const metadataKey = assetType === 'property' ? 'property_id' : 'unit_id';
      const tableName = assetType === 'property' ? 'properties' : 'units';

      const [directResult, metadataResult] = await Promise.all([
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
          .containedBy('metadata', {} as any) // dummy to chain
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      // For metadata query, use rpc or raw filter
      // Actually, supabase-js can filter on jsonb with .filter()
      const { data: metaData } = await supabase
        .from('audit_logs')
        .select('*')
        .filter(`metadata->>` + metadataKey, 'eq', assetId)
        .order('created_at', { ascending: false })
        .limit(500);

      const directLogs = directResult.data || [];
      const metaLogs = metaData || [];

      // Merge and deduplicate by id
      const map = new Map<string, AuditLog>();
      for (const log of [...directLogs, ...metaLogs]) {
        map.set(log.id, log as AuditLog);
      }

      // Sort by created_at desc
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
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
      const { data } = await supabase
        .from('profiles')
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

  // Paginate
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(0, page * pageSize);
  }, [filteredLogs, page, pageSize]);

  const hasMore = paginatedLogs.length < filteredLogs.length;

  // Group by day
  const groupedLogs = useMemo(() => {
    const groups: { label: string; logs: AuditLog[] }[] = [];
    let currentDayLabel = '';
    for (const log of paginatedLogs) {
      const dayLabel = getDayLabel(log.created_at);
      if (dayLabel !== currentDayLabel) {
        currentDayLabel = dayLabel;
        groups.push({ label: dayLabel, logs: [] });
      }
      groups[groups.length - 1].logs.push(log);
    }
    return groups;
  }, [paginatedLogs]);

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
            <SelectTrigger className="w-[130px] h-8 text-xs">
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
        {filteredLogs.length > 0 && (
          <div className="flex gap-1.5">
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
          </div>
        )}
      </div>

      {/* Count */}
      <p className="text-[11px] text-muted-foreground">
        {filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'}
      </p>

      {/* Timeline */}
      {paginatedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade registrada para este ativo ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {groupedLogs.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-3 py-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {group.label}
                </span>
                <Separator className="flex-1" />
              </div>

              <div className="space-y-0.5">
                {group.logs.map((log) => {
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
            Carregar mais ({filteredLogs.length - paginatedLogs.length} restantes)
          </Button>
        </div>
      )}
    </div>
  );
};
