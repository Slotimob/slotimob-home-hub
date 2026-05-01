import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Filter,
  Search,
  Plus,
  Pencil,
  Trash2,
  FileText,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay, subWeeks, subMonths, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/AppLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

import {
  TABLE_LABELS,
  TABLE_ICONS,
  type AuditLog,
  getChangedFields,
  getRecordName,
  humanizeLog,
  getActionStyle,
} from '@/lib/audit-formatting';

interface ProfileMap {
  [userId: string]: string;
}

const ITEMS_PER_PAGE = 30;

// ── Helpers ────────────────────────────────────────────────

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return `Hoje às ${format(date, 'HH:mm', { locale: ptBR })}`;
  if (isYesterday(date)) return `Ontem às ${format(date, 'HH:mm', { locale: ptBR })}`;
  return format(date, "dd MMM 'às' HH:mm", { locale: ptBR });
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "dd 'de' MMMM", { locale: ptBR });
}

function getActionIcon(action: string) {
  switch (action) {
    case 'INSERT': return Plus;
    case 'DELETE': return Trash2;
    case 'UPDATE': return Pencil;
    default: return Pencil;
  }
}

// ── Component ──────────────────────────────────────────────

const ActivityHistory = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profileMap, setProfileMap] = useState<ProfileMap>({});
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [filterTable, setFilterTable] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadLogs();
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTable, filterAction, filterPeriod, searchQuery]);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);

      const brokerIds = [...new Set((data || []).map((l: AuditLog) => l.broker_id))];
      if (brokerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', brokerIds);

        if (profiles) {
          const map: ProfileMap = {};
          profiles.forEach((p: any) => { map[p.id] = p.full_name || 'Usuário'; });
          setProfileMap(map);
        }
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const getPeriodStartDate = (period: string): Date | null => {
    const now = new Date();
    switch (period) {
      case 'today': return startOfDay(now);
      case 'week': return subWeeks(now, 1);
      case 'month': return subMonths(now, 1);
      default: return null;
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterTable !== 'all' && log.table_name !== filterTable) return false;
      if (filterAction !== 'all' && log.action !== filterAction) return false;
      if (filterPeriod !== 'all') {
        const periodStart = getPeriodStartDate(filterPeriod);
        if (periodStart && !isAfter(new Date(log.created_at), periodStart)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const record = getRecordName(log).toLowerCase();
        const table = (TABLE_LABELS[log.table_name] || log.table_name).toLowerCase();
        const author = (profileMap[log.broker_id] || '').toLowerCase();
        if (!record.includes(q) && !table.includes(q) && !author.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filterTable, filterAction, filterPeriod, searchQuery, profileMap]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

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

  if (loading || loadingLogs) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppLayout title="Histórico de Atividades">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Timeline de todas as alterações realizadas no sistema
        </p>

        {/* Compact filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, autor ou tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="units">Unidades</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="deals">Negócios</SelectItem>
                <SelectItem value="properties">Empreend.</SelectItem>
                <SelectItem value="contacts">Contatos</SelectItem>
                <SelectItem value="financial_transactions">Cobranças</SelectItem>
                <SelectItem value="leases">Contratos</SelectItem>
                <SelectItem value="proposals">Propostas</SelectItem>
                <SelectItem value="deal_activities">Atividades</SelectItem>
                <SelectItem value="schedule_activities">Agenda</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="INSERT">Criações</SelectItem>
                <SelectItem value="UPDATE">Edições</SelectItem>
                <SelectItem value="DELETE">Exclusões</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tudo</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">7 dias</SelectItem>
                <SelectItem value="month">30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          {filteredLogs.length} registros
          {totalPages > 1 && ` · Página ${currentPage}/${totalPages}`}
        </p>

        {/* Timeline */}
        {paginatedLogs.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma atividade encontrada</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedLogs.map((group, gi) => (
              <div key={gi}>
                <div className="flex items-center gap-3 py-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                  <Separator className="flex-1" />
                </div>

                <div className="space-y-0.5">
                  {group.logs.map((log) => {
                    const ActionIcon = getActionIcon(log.action);
                    const TableIcon = TABLE_ICONS[log.table_name] || FileText;
                    const authorName = profileMap[log.broker_id] || 'Usuário';
                    const changes = getChangedFields(log);

                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getActionStyle(log.action)}`}>
                          <TableIcon className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">
                            <span className="font-semibold">{authorName}</span>
                            {' '}
                            <span className="text-muted-foreground">{humanizeLog(log)}</span>
                          </p>

                          {changes.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {changes.map((c, i) => (
                                <span key={i}>
                                  {i > 0 && <span className="mx-1.5 opacity-40">|</span>}
                                  <span className="font-medium text-foreground/70">{c.label}:</span>{' '}
                                  <span className="line-through opacity-60">{c.from}</span>{' → '}
                                  <span>{c.to}</span>
                                </span>
                              ))}
                            </p>
                          )}
                        </div>

                        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                          {formatTimestamp(log.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => goToPage(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => goToPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => goToPage(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AppLayout>
  );
};

export default ActivityHistory;
