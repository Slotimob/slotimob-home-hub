import {
  Building2,
  LayoutGrid,
  Users,
  Kanban,
  CalendarDays,
  DollarSign,
  FileText,
  FileSignature,
  MessageSquare,
  Hammer,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Shared constants ──────────────────────────────────────

export const TABLE_LABELS: Record<string, string> = {
  units: 'unidade',
  leads: 'lead',
  deals: 'negócio',
  properties: 'empreendimento',
  visits: 'visita',
  financial_transactions: 'cobrança/lançamento',
  contacts: 'contato',
  leases: 'contrato',
  documents: 'documento',
  property_documents: 'documento do empreendimento',
  sales: 'venda',
  proposals: 'proposta',
  deal_activities: 'atividade do negócio',
  schedule_activities: 'agenda',
  data_export_requests: 'exportação de dados',
  asset_improvements: 'benfeitoria',
  market_value_history: 'avaliação de mercado',
};

export const TABLE_ICONS: Record<string, LucideIcon> = {
  units: LayoutGrid,
  leads: Users,
  deals: Kanban,
  properties: Building2,
  visits: CalendarDays,
  financial_transactions: DollarSign,
  contacts: Users,
  leases: FileText,
  documents: FileText,
  property_documents: FileText,
  sales: DollarSign,
  proposals: FileSignature,
  deal_activities: MessageSquare,
  schedule_activities: CalendarDays,
  asset_improvements: Hammer,
  market_value_history: TrendingUp,
};

export const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Criou',
  UPDATE: 'Editou',
  DELETE: 'Excluiu',
  deal_stage_change: 'Moveu de etapa',
  property_document_created: 'Anexou documento',
  property_document_deleted: 'Removeu documento',
  document_created: 'Anexou documento',
  document_updated: 'Atualizou documento',
  document_deleted: 'Removeu documento',
  sale_recorded: 'Registrou venda',
  proposal_sent: 'Enviou proposta',
  lease_signed: 'Contrato assinado',
  lease_rent_adjusted: 'Reajustou aluguel',
  visit_completed: 'Visita realizada',
  billing_issued: 'Cobrança gerada',
  data_export_requested: 'Solicitou exportação de dados',
  data_export_in_preparation: 'Exportação em preparação',
  data_export_delivered: 'Exportação entregue',
  data_export_rejected: 'Exportação recusada',
  data_export_cancelled: 'Exportação cancelada',
  data_export_purged: 'Arquivo de exportação removido',
  improvement_created: 'Registrou benfeitoria',
  market_value_recorded: 'Reavaliou valor de mercado',
};

export const IGNORED_FIELDS = new Set([
  'id', 'broker_id', 'created_at', 'updated_at', 'deleted_at',
  'metadata', 'user_agent', 'ip_address', 'tenant_id',
]);

export const FIELD_LABELS: Record<string, string> = {
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
  rent_price: 'Preço locação',
  condo_fee: 'Condomínio',
  iptu: 'IPTU',
  sale_value: 'Valor da venda',
  commission_value: 'Comissão',
};

export const ENUM_TRANSLATIONS: Record<string, string> = {
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

// ── Event Groups for timeline filters ──────────────────────

export interface EventGroupDef {
  label: string;
  match: (log: AuditLog) => boolean;
}

export const EVENT_GROUPS: Record<string, EventGroupDef> = {
  edits: {
    label: 'Edições do ativo',
    match: (l) => ['properties', 'units'].includes(l.table_name) && ['INSERT', 'UPDATE', 'DELETE'].includes(l.action),
  },
  documents: {
    label: 'Documentos',
    match: (l) =>
      ['property_documents', 'documents'].includes(l.table_name) ||
      ['property_document_created', 'property_document_deleted', 'document_created', 'document_deleted', 'document_updated'].includes(l.action),
  },
  deals: {
    label: 'Negócios',
    match: (l) => l.table_name === 'deals' || l.action === 'deal_stage_change',
  },
  proposals: {
    label: 'Propostas',
    match: (l) => l.table_name === 'proposals' || l.action === 'proposal_sent',
  },
  leases: {
    label: 'Contratos',
    match: (l) => l.table_name === 'leases' || ['lease_signed', 'lease_rent_adjusted'].includes(l.action),
  },
  billing: {
    label: 'Cobranças',
    match: (l) => l.table_name === 'financial_transactions' || l.action === 'billing_issued',
  },
  visits: {
    label: 'Visitas',
    match: (l) => (l.table_name === 'visits' || l.action === 'visit_completed') &&
      l.new_data?.activity_type !== 'inspection',
  },
  inspections: {
    label: 'Vistorias',
    match: (l) =>
      (l.table_name === 'schedule_activities' && l.new_data?.activity_type === 'inspection') ||
      (l.table_name === 'visits' && l.new_data?.activity_type === 'inspection'),
  },
  meetings: {
    label: 'Reuniões',
    match: (l) =>
      (l.table_name === 'deal_activities' && l.new_data?.activity_type === 'meeting') ||
      (l.table_name === 'schedule_activities' && l.new_data?.activity_type === 'meeting'),
  },
  sales: {
    label: 'Vendas',
    match: (l) => l.table_name === 'sales' || l.action === 'sale_recorded',
  },
};

// ── Activity type labels ──────────────────────────────────

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  meeting: 'Reunião',
  call: 'Ligação',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  note: 'Nota',
  inspection: 'Vistoria',
  task: 'Tarefa',
};

// ── Helpers ──────────────────────────────────────────────

export interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
  broker_id: string;
  actor_user_id: string | null;
  metadata: any;
}

export function shouldIgnoreField(key: string): boolean {
  if (IGNORED_FIELDS.has(key)) return true;
  if (key.endsWith('_id')) return true;
  return false;
}

const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatBRL(val: number): string {
  return brlFormatter.format(val);
}

function formatDateBR(val: string | null | undefined): string {
  if (!val) return '—';
  try {
    return format(new Date(val), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return String(val);
  }
}

export function translateValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  if (typeof val === 'number') {
    if (val >= 100) return formatBRL(val);
    return String(val);
  }
  if (typeof val === 'object') return '—';
  const str = String(val);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return '—';
  return ENUM_TRANSLATIONS[str] || str;
}

export function getRecordName(log: AuditLog): string {
  const data = log.new_data || log.old_data;
  if (!data) return '';
  return data.name || data.title || (data.unit_number ? `Unidade ${data.unit_number}` : '') || data.description?.slice(0, 40) || '';
}

export function getChangedFields(log: AuditLog): { label: string; from: string; to: string }[] {
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

export function diffOldNew(old_data: any, new_data: any): { label: string; from: string; to: string }[] {
  if (!old_data || !new_data) return [];
  const changes: { label: string; from: string; to: string }[] = [];

  for (const key of Object.keys(new_data)) {
    if (shouldIgnoreField(key)) continue;
    const label = FIELD_LABELS[key];
    if (!label) continue;
    if (JSON.stringify(old_data[key]) !== JSON.stringify(new_data[key])) {
      const from = translateValue(old_data[key]);
      const to = translateValue(new_data[key]);
      if (from === to || (from === '—' && to === '—')) continue;
      changes.push({ label, from, to });
    }
  }
  return changes;
}

export function humanizeLog(log: AuditLog): string {
  const meta = log.metadata || {};

  // Semantic milestone actions
  switch (log.action) {
    case 'proposal_sent':
      return `enviou proposta para ${meta.lead_name || 'lead'}`;
    case 'lease_signed':
      return `contrato assinado${meta.start_date ? ` (vigência a partir de ${formatDateBR(meta.start_date)})` : ''}`;
    case 'lease_rent_adjusted': {
      const oldAmt = meta.old_amount != null ? formatBRL(Number(meta.old_amount)) : '?';
      const newAmt = meta.new_amount != null ? formatBRL(Number(meta.new_amount)) : '?';
      const pct = meta.adjustment_pct != null ? ` (${meta.adjustment_pct}%)` : '';
      return `reajustou aluguel: ${oldAmt} → ${newAmt}${pct}`;
    }
    case 'visit_completed':
      return `visita realizada${meta.scheduled_at ? ` em ${formatDateBR(meta.scheduled_at)}` : ''}`;
    case 'billing_issued': {
      const amt = meta.amount != null ? formatBRL(Number(meta.amount)) : '?';
      const due = meta.due_date ? formatDateBR(meta.due_date) : '?';
      return `cobrança gerada: ${amt}, vence em ${due}`;
    }
  }

  // Deal activities / schedule activities with activity_type
  if (['deal_activities', 'schedule_activities'].includes(log.table_name)) {
    const data = log.new_data || log.old_data;
    if (data?.activity_type) {
      const typeLabel = ACTIVITY_TYPE_LABELS[data.activity_type] || data.activity_type;
      const title = data.title || data.description?.slice(0, 40) || '';
      const titleSuffix = title ? ` — ${title}` : '';

      if (log.action === 'INSERT') {
        return `registrou ${typeLabel.toLowerCase()}${titleSuffix}`;
      }
      if (log.action === 'DELETE') {
        return `removeu ${typeLabel.toLowerCase()}${titleSuffix}`;
      }
      return `atualizou ${typeLabel.toLowerCase()}${titleSuffix}`;
    }
  }

  // Existing standard labels
  const actionLabel = ACTION_LABELS[log.action];
  const table = TABLE_LABELS[log.table_name] || log.table_name;
  const record = getRecordName(log);
  const recordSuffix = record ? ` "${record}"` : '';

  if (actionLabel && log.action !== 'INSERT' && log.action !== 'UPDATE' && log.action !== 'DELETE') {
    return `${actionLabel.toLowerCase()}${recordSuffix}`;
  }

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

export function getActionStyle(action: string) {
  switch (action) {
    case 'INSERT':
    case 'property_document_created':
    case 'document_created':
    case 'sale_recorded':
    case 'lease_signed':
    case 'billing_issued':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    case 'DELETE':
    case 'property_document_deleted':
    case 'document_deleted':
      return 'bg-destructive/15 text-destructive';
    case 'UPDATE':
    case 'deal_stage_change':
    case 'document_updated':
    case 'lease_rent_adjusted':
    case 'visit_completed':
    case 'proposal_sent':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `há ${diffDays}d`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function formatTimestampAbsolute(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Deduplication helper ──────────────────────────────────

/** Specific milestone actions that override generic INSERT/UPDATE/DELETE */
const SPECIFIC_ACTIONS = new Set([
  'proposal_sent', 'lease_signed', 'lease_rent_adjusted',
  'visit_completed', 'billing_issued', 'deal_stage_change',
  'sale_recorded', 'property_document_created', 'property_document_deleted',
  'document_created', 'document_updated', 'document_deleted',
]);

/**
 * Remove generic INSERT/UPDATE/DELETE when a specific milestone event
 * exists for the same record_id within 2 seconds.
 */
export function deduplicateAuditLogs(logs: AuditLog[]): AuditLog[] {
  // Build set of (record_id, ~timestamp) that have specific actions
  const specificKeys = new Set<string>();
  for (const log of logs) {
    if (SPECIFIC_ACTIONS.has(log.action) && log.record_id) {
      // Round to 2-second window
      const ts = Math.floor(new Date(log.created_at).getTime() / 2000);
      specificKeys.add(`${log.record_id}:${ts}`);
      specificKeys.add(`${log.record_id}:${ts - 1}`);
      specificKeys.add(`${log.record_id}:${ts + 1}`);
    }
  }

  return logs.filter(log => {
    if (!['INSERT', 'UPDATE', 'DELETE'].includes(log.action)) return true;
    if (!log.record_id) return true;
    const ts = Math.floor(new Date(log.created_at).getTime() / 2000);
    return !specificKeys.has(`${log.record_id}:${ts}`);
  });
}
