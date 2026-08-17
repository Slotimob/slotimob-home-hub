export const HELP_FEATURES = {
  // Dashboard
  'dashboard.overview': 'Visão geral do dashboard',
  'dashboard.appointments': 'Informações de Compromissos',
  'dashboard.rent_receivables': 'Informações de Aluguéis',
  'dashboard.delinquency': 'Informações de Inadimplência',
  'dashboard.open_rentals': 'Informações de Imóveis com Aluguel em Aberto',

  // Ativos
  'assets.properties': 'Empreendimentos',
  'assets.units': 'Unidades',
  'assets.standalone': 'Imóveis Avulsos',
  'assets.portfolio_count': 'Contagem de Ativos',
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

export const HELP_DEFAULT_DESCRIPTIONS: Partial<Record<FeatureKey, string>> = {
  'dashboard.overview': 'Visão geral do seu portfólio imobiliário: patrimônio total, rendimentos, vacância, inadimplência, compromissos e performance do período.',
  'dashboard.appointments': 'Compromissos e tarefas agendados para os próximos dias, incluindo visitas, reuniões, vencimentos de contratos e obrigações de aluguéis.',
  'dashboard.rent_receivables': 'Total de cobranças de aluguel no período selecionado. Inclui contratos ativos com data de vencimento dentro do período.',
  'dashboard.delinquency': 'Valor total de aluguéis em aberto com data de vencimento ultrapassada. Considera cobranças pendentes ou em atraso registradas no financeiro.',
  'dashboard.open_rentals': 'Lista de imóveis com cobranças de aluguel pendentes ou em atraso no período, incluindo valor total em aberto e tempo de atraso máximo.',
  'assets.properties': 'Empreendimentos são condomínios, loteamentos ou projetos que agrupam múltiplas unidades.',
  'assets.units': 'Unidades são imóveis pertencentes a um empreendimento, como apartamentos e salas comerciais.',
  'assets.standalone': 'Imóveis avulsos são propriedades independentes não vinculadas a nenhum empreendimento, como terrenos, casas e galpões.',
  'management.contracts': 'Contratos de locação ativos, histórico de reajustes e gestão de obrigações dos imóveis sob administração.',
  'management.tasks': 'Lista de pendências e tarefas relacionadas à gestão de imóveis, contratos e propostas.',
  'assets.portfolio_count': 'Inventário completo dos ativos cadastrados: empreendimentos (edifícios, condomínios, loteamentos), unidades vinculadas a empreendimentos e imóveis avulsos. Total = Unidades + Avulsos.',
  'crm.pipeline': 'Funil de negócios com todos os deals em andamento, organizados por estágio de negociação.',
  'finance.dre': 'Demonstrativo de Resultados do Exercício: receitas, despesas e resultado líquido por período de competência.',
  'finance.overview': 'Visão geral do fluxo de caixa financeiro: receitas, despesas e saldo, calculados a partir dos lançamentos financeiros do período selecionado.',
  'finance.transactions': 'Página de lançamentos (receitas e despesas), onde você cadastra, filtra e gerencia todo o financeiro por status, data, categoria e unidade.',
  'finance.reconciliation': 'Conciliação bancária: confira os lançamentos do sistema contra o extrato bancário importado, marcando o que já bateu.',
  'finance.cash_flow': 'Fluxo de Caixa Analítico: tabela detalhada de entradas e saídas por período, organizadas pela data de vencimento de cada lançamento.',
  'finance.bank_accounts': 'Diferença entre Saldo Real (valor já conciliado/confirmado na conta) e Saldo Projetado (saldo real somado às receitas pendentes e subtraídas as despesas pendentes).',
  'crm.contacts': 'Central de contatos unificada: leads, proprietários, inquilinos e empresas em um só lugar.',
  'crm.schedule': 'Agenda de compromissos e atividades: visitas, reuniões, vencimentos de contratos e obrigações.',
  'reports.overview': 'Relatórios gerenciais disponíveis (semanal, mensal, DIMOB e outros) para acompanhar a performance do negócio.',
};

export type FeatureKey = keyof typeof HELP_FEATURES;

export function isFeatureKey(value: string): value is FeatureKey {
  return value in HELP_FEATURES;
}
