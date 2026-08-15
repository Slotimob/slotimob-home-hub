import {
  Home,
  Building2,
  Users,
  CalendarDays,
  Menu,
  LayoutGrid,
  MessageCircle,
  FileText,
  Calculator,
  Settings,
  History,
  Globe,
  BarChart3,
  Plug,
  GraduationCap,
  HomeIcon,
  Filter,
  Wallet,
  Receipt,
  ArrowLeftRight,
  HeartPulse,
  TrendingUp,
  UsersRound,
  Shield,
  LucideIcon,
  ClipboardList,
  FileSignature,
  CheckSquare,
  Briefcase,
} from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badgeKey?: 'leads' | 'pipeline' | 'schedule' | 'whatsapp';
}

export interface NavGroup {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  ownerOnly?: boolean;
  hiddenOnPlan?: string[];
}

/**
 * Single source of truth for navigation.
 * Both AppSidebar and BottomNavigation consume this.
 */
export const PRIMARY_TABS: NavItem[] = [
  { title: 'Home', url: '/dashboard', icon: Home },
  { title: 'Gestão', url: '/gestao/alugueis', icon: ClipboardList },
  { title: 'Financeiro', url: '/finance', icon: Wallet },
  { title: 'Pipeline', url: '/pipeline', icon: Filter, badgeKey: 'pipeline' },
  { title: 'Contatos', url: '/contacts', icon: Users, badgeKey: 'leads' },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Principal',
    icon: Home,
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: Home },
      { title: 'Pipeline', url: '/pipeline', icon: Filter, badgeKey: 'pipeline' },
      { title: 'Agenda', url: '/schedule', icon: CalendarDays, badgeKey: 'schedule' },
    ],
  },
  {
    title: 'Gestão',
    icon: ClipboardList,
    items: [
      { title: 'Aluguéis', url: '/gestao/alugueis', icon: HeartPulse },
      { title: 'Contratos', url: '/gestao/contratos', icon: FileSignature },
      { title: 'Gerencial', url: '/gestao/gerencial', icon: Briefcase },
      { title: 'Afazeres', url: '/gestao/afazeres', icon: CheckSquare },
      { title: 'Boletos', url: '/gestao/boletos', icon: Receipt },
    ],
  },
  {
    title: 'Ativos',
    icon: Building2,
    items: [
      { title: 'Empreendimentos', url: '/properties', icon: Building2 },
      { title: 'Imóveis', url: '/real-estate', icon: HomeIcon },
      { title: 'Unidades', url: '/units', icon: LayoutGrid },
    ],
  },
  {
    title: 'Contatos',
    icon: Users,
    items: [
      { title: 'Proprietários', url: '/contacts/owners', icon: Users },
      { title: 'Leads', url: '/contacts/leads', icon: Users, badgeKey: 'leads' },
      { title: 'Empresas', url: '/contacts/companies', icon: Building2 },
    ],
  },
  {
    title: 'Financeiro',
    icon: Wallet,
    ownerOnly: true,
    items: [
      { title: 'Visão Geral', url: '/finance', icon: Wallet },
      { title: 'DRE', url: '/finance/dre', icon: BarChart3 },
      { title: 'Lançamentos', url: '/finance/transactions', icon: Receipt },
      { title: 'Conciliação', url: '/finance/reconciliation', icon: ArrowLeftRight },
      { title: 'Categorias', url: '/finance/categories', icon: Filter },
    ],
  },
  {
    title: 'Documentos',
    icon: FileText,
    items: [
      { title: 'Meus Documentos', url: '/documents', icon: FileText },
      { title: 'Modelos Padrão', url: '/documents/templates', icon: FileText },
      { title: 'Histórico', url: '/documents/history', icon: History },
    ],
  },
  {
    title: 'Simulador',
    icon: Calculator,
    items: [
      { title: 'Financiamento', url: '/simulator/financing', icon: Calculator },
      { title: 'Taxas e IPTU', url: '/simulator/taxes', icon: Calculator },
      { title: 'Retorno de Aluguel', url: '/rentability/yield', icon: TrendingUp },
      { title: 'Payback', url: '/rentability/payback', icon: TrendingUp },
      { title: 'Comparativos', url: '/simulator/comparison', icon: Calculator },
    ],
  },
  {
    title: 'Relatórios',
    icon: BarChart3,
    ownerOnly: true,
    items: [
      { title: 'Visão Geral', url: '/reports', icon: BarChart3 },
      { title: 'Resumo Semanal', url: '/reports/weekly', icon: BarChart3 },
      { title: 'Resumo Mensal', url: '/reports/monthly', icon: BarChart3 },
    ],
  },
  {
    title: 'Integrações',
    icon: Plug,
    items: [
      { title: 'Conexões', url: '/integrations', icon: Plug },
      { title: 'Portais', url: '/portals', icon: Globe },
      { title: 'WhatsApp', url: '/whatsapp', icon: MessageCircle, badgeKey: 'whatsapp' },
    ],
  },
  {
    title: 'Outros',
    icon: Settings,
    items: [
      { title: 'Treinamentos', url: '/training', icon: GraduationCap },
      { title: 'Histórico', url: '/history', icon: History },
      { title: 'Configurações', url: '/settings', icon: Settings },
    ],
  },
];

/** Sidebar-specific items (structured differently for nested menus) */
export const SIDEBAR_ITEMS = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  {
    title: 'Gestão',
    icon: ClipboardList,
    items: [
      { title: 'Aluguéis', url: '/gestao/alugueis' },
      { title: 'Contratos', url: '/gestao/contratos' },
      { title: 'Gerencial', url: '/gestao/gerencial' },
      { title: 'Afazeres', url: '/gestao/afazeres' },
      { title: 'Boletos', url: '/gestao/boletos' },
    ],
  },
  {
    title: 'Ativos',
    icon: Building2,
    items: [
      {
        title: 'Empreendimentos',
        url: '/properties',
        nestedItems: [
          { title: 'Lista Geral', url: '/properties' },
          { title: 'Unidades', url: '/units' },
        ],
      },
      { title: 'Imóveis Avulsos', url: '/real-estate' },
    ],
  },
  {
    title: 'Financeiro',
    icon: Wallet,
    ownerOnly: true,
    items: [
      { title: 'Visão Geral', url: '/finance' },
      { title: 'DRE', url: '/finance/dre' },
      { title: 'Lançamentos', url: '/finance/transactions' },
      { title: 'Conciliação', url: '/finance/reconciliation' },
      { title: 'Categorias', url: '/finance/categories' },
    ],
  },
  {
    title: 'CRM',
    icon: Users,
    items: [
      { title: 'Mensagens', url: '/whatsapp' },
      { title: 'Pipeline', url: '/pipeline' },
      { title: 'Propostas', url: '/crm/propostas' },
      { title: 'Contatos', url: '/contacts' },
      { title: 'Agenda', url: '/schedule' },
    ],
  },
  { title: 'Relatórios', url: '/reports', icon: BarChart3, ownerOnly: true },
  { title: 'Documentos', url: '/documents', icon: FileText },
  { title: 'Simulador', url: '/simulator', icon: Calculator },
  { title: 'Integrações', url: '/integrations', icon: Plug },
  { title: 'Treinamentos', url: '/training', icon: GraduationCap },
  { title: 'Usuários', url: '/users', icon: UsersRound, hiddenOnPlan: ['essencial', 'free'] },
  { title: 'Histórico', url: '/history', icon: History },
] as const;
