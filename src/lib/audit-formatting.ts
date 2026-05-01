import {
  Building2,
  LayoutGrid,
  Users,
  Kanban,
  CalendarDays,
  DollarSign,
  FileText,
  type LucideIcon,
} from 'lucide-react';

// ── Shared constants ──────────────────────────────────────

export const TABLE_LABELS: Record<string, string> = {
  units: 'unidade',
  leads: 'lead',
  deals: 'negócio',
  properties: 'empreendimento',
  visits: 'visita',
  financial_transactions: 'transação',
  contacts: 'contato',
  leases: 'contrato',
  documents: 'documento',
  property_documents: 'documento do empreendimento',
  sales: 'venda',
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
  metadata: any;
}

export function shouldIgnoreField(key: string): boolean {
  if (IGNORED_FIELDS.has(key)) return true;
  if (key.endsWith('_id')) return true;
  return false;
}

export function translateValue(val: any): string {
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
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    case 'DELETE':
    case 'property_document_deleted':
    case 'document_deleted':
      return 'bg-destructive/15 text-destructive';
    case 'UPDATE':
    case 'deal_stage_change':
    case 'document_updated':
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
