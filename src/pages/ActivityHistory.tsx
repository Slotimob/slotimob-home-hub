import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  LayoutGrid,
  Users,
  Kanban,
  CalendarDays,
  Filter,
  Search,
  Plus,
  Pencil,
  Trash2,
  FileText,
  DollarSign,
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

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
  broker_id: string;
  metadata: any;
}

interface ProfileMap {
  [userId: string]: string;
}

// ── Constants ──────────────────────────────────────────────

const TABLE_LABELS: Record<string, string> = {
  units: 'unidade',
  leads: 'lead',
  deals: 'negócio',
  properties: 'empreendimento',
  visits: 'visita',
  financial_transactions: 'transação',
  contacts: 'contato',
  leases: 'contrato',
  documents: 'documento',
};

const TABLE_ICONS: Record<string, any> = {
  units: LayoutGrid,
  leads: Users,
  deals: Kanban,
  properties: Building2,
  visits: CalendarDays,
  financial_transactions: DollarSign,
  contacts: Users,
  leases: FileText,
  documents: FileText,
};

const IGNORED_FIELDS = new Set([
  'id', 'broker_id', 'created_at', 'updated_at', 'deleted_at',
  'metadata', 'user_agent', 'ip_address', 'tenant_id',
]);

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  title: 'Título',
  status: 'Status',
  stage: 'Etapa',
  pipeline_stage: 'Etapa',
  price: 'Preço',
  rent_amount: 'Aluguel',
  estimated_value: 'Valor estimado',
  estimated_commission: 'Comissão estimada',
  email: 'Email',
  phone: 'Telefone',
  whatsapp: 'WhatsApp',
  city: 'Cidade',
  neighborhood: 'Bairro',
  state: 'Estado',
  address: 'Endereço',
  unit_number: 'Nº Unidade',
  bedrooms: 'Quartos',
  bathrooms: 'Banheiros',
  area: 'Área',
  parking_spots: 'Vagas',
  description: 'Descrição',
  notes: 'Notas',
  temperature: 'Temperatura',
  priority: 'Prioridade',
  amount: 'Valor',
  type: 'Tipo',
  due_date: 'Vencimento',
  paid_date: 'Data pagamento',
  transaction_date: 'Data transação',
  probability: 'Probabilidade',
  expected_close_date: 'Previsão fechamento',
  business_type: 'Tipo negócio',
  guarantee_type: 'Tipo garantia',
  contract_status: 'Status contrato',
  signature_status: 'Status assinatura',
  loss_reason: 'Motivo perda',
  origin: 'Origem',
  lead_type: 'Tipo lead',
  payment_method: 'Forma pagamento',
  document_type: 'Tipo documento',
  adjustment_index: 'Índice reajuste',
  admin_fee_percentage: 'Taxa administração',
  deposit_amount: 'Valor caução',
  due_day: 'Dia vencimento',
  categories: 'Categorias',
  initial_task: 'Tarefa inicial',
};

const ENUM_TRANSLATIONS: Record<string, string> = {
  new_lead: 'Novo Lead',
  in_contact: 'Em Contato',
  scheduling: 'Agendamento',
  visit_done: 'Visita Realizada',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
  available: 'Disponível',
  sold: 'Vendido',
  rented: 'Alugado',
  reserved: 'Reservado',
  unavailable: 'Indisponível',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  hot: 'Quente',
  warm: 'Morno',
  cold: 'Frio',
  sale: 'Venda',
  rent: 'Locação',
  income: 'Receita',
  expense: 'Despesa',
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
  active: 'Ativo',
  inactive: 'Inativo',
  terminated: 'Encerrado',
  signed: 'Assinado',
  caucao: 'Caução',
  fiador: 'Fiador',
  seguro_fianca: 'Seguro Fiança',
  lead: 'Lead',
  owner: 'Proprietário',
  tenant: 'Inquilino',
};

const ITEMS_PER_PAGE = 30;

// ── Helpers ────────────────────────────────────────────────

function shouldIgnoreField(key: string): boolean {
  if (IGNORED_FIELDS.has(key)) return true;
  if (key.endsWith('_id')) return true;
  return false;
}

function translateValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  if (typeof val === 'number') {
    if (val >= 100) return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return String(val);
  }
  if (typeof val === 'object') return '—';
  const str = String(val);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return '—';
  return ENUM_TRANSLATIONS[str] || str;
}

function getRecordName(log: AuditLog): string {
  const data = log.new_data || log.old_data;
  if (!data) return '';
  return data.name || data.title || (data.unit_number ? `Unidade ${data.unit_number}` : '') || data.description?.slice(0, 40) || '';
}

function getChangedFields(log: AuditLog): { label: string; from: string; to: string }[] {
  if (log.action !== 'UPDATE') return [];
  const oldD = log.old_data || {};
  const newD = log.new_data || {};
  const changes: { label: string; from: string; to: string }[] = [];

  for (const key of Object.keys(newD)) {
    if (shouldIgnoreField(key)) continue;
    const label = FIELD_LABELS[key];
    if (!label) continue;
    if (JSON.stringify(oldD[key]) !== JSON.stringify(newD[key])) {
      const from = translateValue(oldD[key]);
      const to = translateValue(newD[key]);
      if (from === to || (from === '—' && to === '—')) continue;
      changes.push({ label, from, to });
    }
  }
  return changes.slice(0, 6);
}

function humanizeLog(log: AuditLog): string {
  const table = TABLE_LABELS[log.table_name] || log.table_name;
  const record = getRecordName(log);
  const recordSuffix = record ? ` "${record}"` : '';

  switch (log.action) {
    case 'INSERT':
      return `cadastrou ${table === 'lead' ? 'o' : table === 'unidade' ? 'a' : 'o'} ${table}${recordSuffix}`;
    case 'DELETE':
      return `excluiu ${table === 'lead' ? 'o' : table === 'unidade' ? 'a' : 'o'} ${table}${recordSuffix}`;
    case 'UPDATE': {
      const changes = getChangedFields(log);
      if (changes.length === 1) {
        return `alterou ${changes[0].label.toLowerCase()} d${table === 'unidade' ? 'a' : 'o'} ${table}${recordSuffix}`;
      }
      return `atualizou ${table === 'lead' ? 'o' : table === 'unidade' ? 'a' : 'o'} ${table}${recordSuffix}`;
    }
    default:
      return `realizou ação em ${table}${recordSuffix}`;
  }
}

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

// ── Action icon bg colors ──────────────────────────────────

function getActionStyle(action: string) {
  switch (action) {
    case 'INSERT': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    case 'DELETE': return 'bg-destructive/15 text-destructive';
    case 'UPDATE': return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    default: return 'bg-muted text-muted-foreground';
  }
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

      // Collect unique broker_ids and fetch their names
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
                <SelectItem value="financial_transactions">Transações</SelectItem>
                <SelectItem value="leases">Contratos</SelectItem>
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
                {/* Day separator */}
                <div className="flex items-center gap-3 py-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                  <Separator className="flex-1" />
                </div>

                {/* Logs for this day */}
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
                        {/* Icon */}
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getActionStyle(log.action)}`}>
                          <TableIcon className="h-3.5 w-3.5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">
                            <span className="font-semibold">{authorName}</span>
                            {' '}
                            <span className="text-muted-foreground">{humanizeLog(log)}</span>
                          </p>

                          {/* Changed fields inline */}
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

                        {/* Timestamp */}
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
