import {
  Home,
  Building2,
  Users,
  CalendarDays,
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
  LucideIcon,
  ClipboardList,
  FileSignature,
  CheckSquare,
  Briefcase,
  Wrench,
  Landmark,
  Sparkles,
  HandCoins,
} from 'lucide-react';


export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badgeKey?: 'leads' | 'pipeline' | 'schedule' | 'whatsapp';
  /** Permission module key for granular RBAC filtering (mirrors AppSidebar) */
  moduleKey?: string;
}

export interface NavGroup {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  ownerOnly?: boolean;
  hiddenOnPlan?: string[];
  trialVisible?: boolean;
  /** Group-level permission module key */
  moduleKey?: string;
}

/**
 * Single source of truth for navigation.
 * Structure, order and labels mirror `menuItems` in src/components/AppSidebar.tsx.
 */
export const PRIMARY_TABS: NavItem[] = [
  { title: 'Home', url: '/dashboard', icon: Home, moduleKey: 'dashboard' },
  { title: 'Gestão', url: '/gestao/alugueis', icon: ClipboardList, moduleKey: 'management_rentals' },
  { title: 'Financeiro', url: '/finance', icon: Wallet, moduleKey: 'finance_overview' },
  { title: 'Pipeline', url: '/pipeline', icon: Filter, badgeKey: 'pipeline', moduleKey: 'crm_pipeline' },
  { title: 'Contatos', url: '/contacts', icon: Users, badgeKey: 'leads', moduleKey: 'crm_contacts' },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Chat IA',
    icon: Sparkles,
    hiddenOnPlan: ['free', 'essencial'],
    trialVisible: true,
    moduleKey: 'chat',
    items: [
      { title: 'Chat IA', url: '/ai-chat', icon: Sparkles, moduleKey: 'chat' },
    ],
  },
  {
    title: 'Dashboard',
    icon: Home,
    moduleKey: 'dashboard',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: Home, moduleKey: 'dashboard' },
    ],
  },
  {
    title: 'Gestão',
    icon: ClipboardList,
    moduleKey: 'management_rentals',
    items: [
      { title: 'Aluguéis', url: '/gestao/alugueis', icon: HeartPulse, moduleKey: 'management_rentals' },
      { title: 'Contratos', url: '/gestao/contratos', icon: FileSignature, moduleKey: 'management_contracts' },
      { title: 'Gerencial', url: '/gestao/gerencial', icon: Briefcase, moduleKey: 'management_reports' },
      { title: 'Manutenções', url: '/gestao/manutencoes', icon: Wrench, moduleKey: 'management_tasks' },
      { title: 'Afazeres', url: '/gestao/afazeres', icon: CheckSquare, moduleKey: 'management_tasks' },
      { title: 'Boletos', url: '/gestao/boletos', icon: Receipt, moduleKey: 'management_rentals' },
    ],
  },
  {
    title: 'Ativos',
    icon: Building2,
    items: [
      { title: 'Empreendimentos', url: '/properties', icon: Building2, moduleKey: 'assets_properties' },
      { title: 'Unidades', url: '/units', icon: LayoutGrid, moduleKey: 'assets_units' },
      { title: 'Imóveis Avulsos', url: '/real-estate', icon: HomeIcon, moduleKey: 'assets_standalone' },
    ],
  },
  {
    title: 'Financeiro',
    icon: Wallet,
    ownerOnly: true,
    moduleKey: 'finance_overview',
    items: [
      { title: 'Visão Geral', url: '/finance', icon: Wallet, moduleKey: 'finance_overview' },
      { title: 'Bancos', url: '/finance/bancos', icon: Landmark, moduleKey: 'finance_bank_accounts' },
      { title: 'DRE', url: '/finance/dre', icon: BarChart3, moduleKey: 'finance_dre' },
      { title: 'Lançamentos', url: '/finance/transactions', icon: Receipt, moduleKey: 'finance_transactions' },
      { title: 'Conciliação', url: '/finance/reconciliation', icon: ArrowLeftRight, moduleKey: 'finance_reconciliation' },
      { title: 'Categorias', url: '/finance/categories', icon: Filter, moduleKey: 'finance_categories' },
    ],
  },
  {
    title: 'Comercial',
    icon: Users,
    items: [
      { title: 'Mensagens', url: '/whatsapp', icon: MessageCircle, badgeKey: 'whatsapp', moduleKey: 'crm_whatsapp' },
      { title: 'Propostas', url: '/crm/propostas', icon: HandCoins, moduleKey: 'management_proposals' },
      { title: 'Pipeline', url: '/pipeline', icon: Filter, badgeKey: 'pipeline', moduleKey: 'crm_pipeline' },
      { title: 'Contatos', url: '/contacts', icon: Users, badgeKey: 'leads', moduleKey: 'crm_contacts' },
      { title: 'Agenda', url: '/schedule', icon: CalendarDays, badgeKey: 'schedule', moduleKey: 'crm_schedule' },
    ],
  },
  {
    title: 'Relatórios',
    icon: BarChart3,
    ownerOnly: true,
    moduleKey: 'reports',
    items: [
      { title: 'Relatórios', url: '/reports', icon: BarChart3, moduleKey: 'reports' },
    ],
  },
  {
    title: 'Documentos',
    icon: FileText,
    moduleKey: 'documents',
    items: [
      { title: 'Documentos', url: '/documents', icon: FileText, moduleKey: 'documents' },
    ],
  },
  {
    title: 'Calculadoras',
    icon: Calculator,
    items: [
      { title: 'Calculadoras', url: '/simulator', icon: Calculator },
    ],
  },
  {
    title: 'Integrações',
    icon: Plug,
    moduleKey: 'integrations',
    items: [
      { title: 'Integrações', url: '/integrations', icon: Plug, moduleKey: 'integrations' },
      { title: 'Portais', url: '/portals', icon: Globe, moduleKey: 'integrations' },
    ],
  },
  {
    title: 'Treinamentos',
    icon: GraduationCap,
    items: [
      { title: 'Treinamentos', url: '/training', icon: GraduationCap },
    ],
  },
  {
    title: 'Usuários',
    icon: UsersRound,
    hiddenOnPlan: ['essencial', 'free'],
    items: [
      { title: 'Usuários', url: '/users', icon: UsersRound },
    ],
  },
  {
    title: 'Histórico',
    icon: History,
    items: [
      { title: 'Histórico', url: '/history', icon: History },
    ],
  },
  {
    title: 'Configurações',
    icon: Settings,
    items: [
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
      { title: 'Manutenções', url: '/gestao/manutencoes' },
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
      { title: 'Bancos', url: '/finance/bancos' },
      { title: 'DRE', url: '/finance/dre' },
      { title: 'Lançamentos', url: '/finance/transactions' },
      { title: 'Conciliação', url: '/finance/reconciliation' },
      { title: 'Categorias', url: '/finance/categories' },
    ],
  },

  {
    title: 'Comercial',
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
  { title: 'Calculadoras', url: '/simulator', icon: Calculator },
  { title: 'Integrações', url: '/integrations', icon: Plug },
  { title: 'Treinamentos', url: '/training', icon: GraduationCap },
  { title: 'Usuários', url: '/users', icon: UsersRound, hiddenOnPlan: ['essencial', 'free'] },
  { title: 'Histórico', url: '/history', icon: History },
] as const;
