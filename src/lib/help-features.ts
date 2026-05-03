export const HELP_FEATURES = {
  // Dashboard
  'dashboard.overview': 'Visão geral do dashboard',
  'dashboard.appointments': 'Widget de Compromissos',
  'dashboard.rent_receivables': 'Widget de Aluguéis',
  'dashboard.delinquency': 'Widget de Inadimplência',

  // Ativos
  'assets.properties': 'Empreendimentos',
  'assets.units': 'Unidades',
  'assets.standalone': 'Imóveis Avulsos',
  'assets.documents': 'Documentos do imóvel',
  'assets.activity_timeline': 'Histórico de atividades do imóvel',
  'assets.financial_panel': 'Painel financeiro do imóvel',

  // CRM
  'crm.pipeline': 'Pipeline de negócios',
  'crm.contacts': 'Contatos unificados',
  'crm.schedule': 'Agenda de atividades',

  // Financeiro
  'finance.overview': 'Visão geral financeira',
  'finance.transactions': 'Transações financeiras',
  'finance.dre': 'DRE',
  'finance.reconciliation': 'Conciliação bancária',
  'finance.cash_flow': 'Fluxo de caixa',
  'finance.bank_accounts': 'Contas bancárias',

  // Gestão
  'management.contracts': 'Gestão de contratos',
  'management.tasks': 'Afazeres',

  // WhatsApp
  'whatsapp.overview': 'Integração WhatsApp',

  // Relatórios
  'reports.overview': 'Relatórios gerais',

  // Configurações
  'settings.team': 'Equipe e permissões',
} as const;

export type FeatureKey = keyof typeof HELP_FEATURES;

export function isFeatureKey(value: string): value is FeatureKey {
  return value in HELP_FEATURES;
}
