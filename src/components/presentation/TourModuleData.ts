import {
  Users, Wallet, Building2, Brain, Bot,
  MessageSquare, BarChart3, Shuffle, FileText,
  CalendarClock, Shield, PenTool, ArrowLeftRight,
  Zap, Home, Map, Search, Phone, Eye,
  Percent, TrendingUp, Calculator, Receipt,
  ClipboardList, Bell, UserCheck, Settings,
  LineChart, PieChart, Layers, FolderOpen,
  type LucideIcon,
} from 'lucide-react';

export interface SubFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface TourModule {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string; // tailwind gradient classes
  accentBg: string;
  accentText: string;
  headline: string;
  description: string;
  submenus: { label: string; path: string }[];
  features: SubFeature[];
}

export const modules: TourModule[] = [
  {
    id: 'crm',
    label: 'CRM & Vendas',
    icon: Users,
    color: 'from-primary to-primary/70',
    accentBg: 'bg-primary/10',
    accentText: 'text-primary',
    headline: 'Pipeline visual integrado ao WhatsApp',
    description:
      'Acompanhe cada lead do primeiro contato ao fechamento. O pipeline Kanban se conecta ao WhatsApp e ao financeiro, dando contexto completo para cada negociação.',
    submenus: [
      { label: 'Pipeline de Vendas', path: '/pipeline' },
      { label: 'Contatos Unificados', path: '/contacts' },
      { label: 'Proprietários', path: '/contacts/owners' },
      { label: 'Leads', path: '/contacts/leads' },
      { label: 'Empresas', path: '/contacts/companies' },
    ],
    features: [
      { icon: MessageSquare, title: 'WhatsApp com Contexto', desc: 'Histórico do cliente e do imóvel na mesma tela de conversa.' },
      { icon: Shuffle, title: 'Roleta de Leads', desc: 'Distribuição automática e justa entre corretores da equipe.' },
      { icon: FileText, title: 'Contratos Automáticos', desc: 'Gere contratos com dados já preenchidos do sistema.' },
      { icon: Phone, title: 'Registro de Ligações', desc: 'Registre cada ligação e associe ao lead automaticamente.' },
      { icon: Eye, title: 'Visão 360° do Lead', desc: 'Tudo sobre o cliente em uma única tela: conversas, visitas, propostas.' },
      { icon: UserCheck, title: 'Qualificação de Leads', desc: 'Classifique leads por temperatura e probabilidade de fechamento.' },
    ],
  },
  {
    id: 'imoveis',
    label: 'Imóveis & Unidades',
    icon: Home,
    color: 'from-accent to-accent/70',
    accentBg: 'bg-accent/10',
    accentText: 'text-accent',
    headline: 'Gestão completa do seu portfólio imobiliário',
    description:
      'Cadastre empreendimentos, unidades individuais e acompanhe disponibilidade, valores e documentação de cada imóvel em tempo real.',
    submenus: [
      { label: 'Empreendimentos', path: '/properties' },
      { label: 'Unidades', path: '/units' },
      { label: 'Imobiliária', path: '/real-estate' },
    ],
    features: [
      { icon: Map, title: 'Mapa de Disponibilidade', desc: 'Veja quais unidades estão livres, reservadas ou vendidas.' },
      { icon: Search, title: 'Busca Inteligente', desc: 'Filtre por tipo, valor, metragem e status instantaneamente.' },
      { icon: Layers, title: 'Multi-Empreendimentos', desc: 'Gerencie vários empreendimentos em uma única visão.' },
      { icon: FileText, title: 'Ficha do Imóvel', desc: 'Todas as informações, fotos e documentos em um só lugar.' },
      { icon: Percent, title: 'Tabela de Preços', desc: 'Controle valores, descontos e condições de pagamento.' },
      { icon: FolderOpen, title: 'Documentação Digital', desc: 'Armazene plantas, matrículas e certidões por unidade.' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: Wallet,
    color: 'from-success to-success/70',
    accentBg: 'bg-success/10',
    accentText: 'text-success',
    headline: 'Bata o caixa em segundos, não em horas',
    description:
      'Importe o extrato do banco e o sistema identifica cada pagamento. O DRE funcional analisa o lucro real — por imóvel ou do negócio inteiro.',
    submenus: [
      { label: 'Visão Geral', path: '/finance' },
      { label: 'Transações', path: '/finance/transactions' },
      { label: 'Conciliação', path: '/finance/reconciliation' },
      { label: 'Categorias', path: '/finance/categories' },
      { label: 'DRE', path: '/finance/dre' },
    ],
    features: [
      { icon: ArrowLeftRight, title: 'Conciliação Automática', desc: 'O sistema lê o extrato e identifica cada pagamento.' },
      { icon: BarChart3, title: 'DRE Funcional', desc: 'Lucro real separado por receitas e despesas operacionais.' },
      { icon: Zap, title: 'Cobranças Automáticas', desc: 'Boletos e lembretes automáticos pelo WhatsApp.' },
      { icon: Receipt, title: 'Contas a Pagar/Receber', desc: 'Controle completo de vencimentos e fluxo de caixa.' },
      { icon: PieChart, title: 'Relatórios Visuais', desc: 'Gráficos de receita, despesa e margem por período.' },
      { icon: Calculator, title: 'Simulador de Rentabilidade', desc: 'Calcule o retorno real de cada imóvel gerenciado.' },
    ],
  },
  {
    id: 'ativos',
    label: 'Gestão de Ativos',
    icon: Building2,
    color: 'from-warning to-warning/70',
    accentBg: 'bg-warning/10',
    accentText: 'text-warning',
    headline: 'Reajustes, contratos e vencimentos no automático',
    description:
      'O sistema avisa sobre vencimentos, calcula reajustes automaticamente e gera os documentos sozinho. Você só acompanha.',
    submenus: [
      { label: 'Aluguéis', path: '/gestao/alugueis' },
      { label: 'Contratos', path: '/gestao/contratos' },
      { label: 'Afazeres', path: '/gestao/afazeres' },
      { label: 'Gerencial', path: '/gestao/gerencial' },
    ],
    features: [
      { icon: CalendarClock, title: 'Reajustes Automáticos', desc: 'IGPM, IPCA calculados e avisados antes do vencimento.' },
      { icon: Shield, title: 'Gestão de Contratos', desc: 'Vigência, renovações e rescisões com um clique.' },
      { icon: FileText, title: 'Documentos Automáticos', desc: 'Recibos e demonstrativos prontos para o proprietário.' },
      { icon: Bell, title: 'Alertas Inteligentes', desc: 'Notificações sobre vencimentos, inadimplência e renovações.' },
      { icon: ClipboardList, title: 'Checklist de Vistoria', desc: 'Registre o estado do imóvel na entrada e saída do inquilino.' },
      { icon: TrendingUp, title: 'Performance por Ativo', desc: 'Acompanhe a rentabilidade individual de cada imóvel.' },
    ],
  },
  {
    id: 'ia',
    label: 'Inteligência Artificial',
    icon: Brain,
    color: 'from-purple-600 to-purple-400',
    accentBg: 'bg-purple-500/10',
    accentText: 'text-purple-600',
    headline: 'A IA que trabalha por você',
    description:
      'Resumos de conversas longas, análise de patrimônio e textos de conversão para venda e aluguel. Menos tempo digitando, mais tempo fechando.',
    submenus: [
      { label: 'Chat com IA', path: '/ai-chat' },
    ],
    features: [
      { icon: Bot, title: 'Resumos de Conversas', desc: 'A IA lê conversas longas e entrega o que importa.' },
      { icon: BarChart3, title: 'Análise de Patrimônio', desc: 'Saúde financeira dos imóveis em tempo real.' },
      { icon: PenTool, title: 'Textos de Conversão', desc: 'Descrições profissionais de imóveis geradas em segundos.' },
      { icon: LineChart, title: 'Previsões de Mercado', desc: 'Insights sobre tendências de preço e demanda regional.' },
      { icon: Settings, title: 'Automações IA', desc: 'Defina regras e deixe a IA executar tarefas repetitivas.' },
      { icon: Search, title: 'Busca Semântica', desc: 'Encontre imóveis descrevendo o que o cliente quer.' },
    ],
  },
  {
    id: 'extras',
    label: 'Ferramentas Extras',
    icon: Settings,
    color: 'from-muted-foreground to-muted-foreground/70',
    accentBg: 'bg-muted',
    accentText: 'text-muted-foreground',
    headline: 'Tudo que você precisa, em um só lugar',
    description:
      'Documentos, agenda, simuladores, relatórios e mais. Cada ferramenta foi pensada para eliminar planilhas e retrabalho.',
    submenus: [
      { label: 'Documentos', path: '/documents' },
      { label: 'Agenda', path: '/schedule' },
      { label: 'Simulador', path: '/simulator' },
      { label: 'Rentabilidade', path: '/rentability' },
      { label: 'Relatórios', path: '/reports' },
      { label: 'Integrações', path: '/integrations' },
    ],
    features: [
      { icon: FileText, title: 'Gerador de Documentos', desc: 'Contratos, recibos e propostas com preenchimento automático.' },
      { icon: CalendarClock, title: 'Agenda de Visitas', desc: 'Organize visitas e receba lembretes automáticos.' },
      { icon: Calculator, title: 'Simulador Financeiro', desc: 'Simule financiamentos, impostos e compare cenários.' },
      { icon: TrendingUp, title: 'Análise de Rentabilidade', desc: 'Yield, payback e comparações entre investimentos.' },
      { icon: BarChart3, title: 'Relatórios Gerenciais', desc: 'Visão macro do seu negócio com dados atualizados.' },
      { icon: Layers, title: 'Portais de Imóveis', desc: 'Publique nos principais portais com um clique.' },
    ],
  },
];
