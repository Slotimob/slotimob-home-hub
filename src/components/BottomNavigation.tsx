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
  HelpCircle,
  History,
  LucideIcon,
  Globe,
  BarChart3,
  Plug,
  GraduationCap,
  HomeIcon,
  Filter,
  ChevronRight,
  Wallet,
  Receipt,
  ArrowLeftRight,
  HeartPulse,
  TrendingUp
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SlotiLogo } from '@/components/SlotiLogo';
import { NavLink } from '@/components/NavLink';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';
import { Separator } from '@/components/ui/separator';

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badgeKey?: 'leads' | 'pipeline' | 'schedule' | 'whatsapp';
}

interface MenuGroup {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
}

const mainTabs: MenuItem[] = [
  { title: 'Home', url: '/dashboard', icon: Home },
  { title: 'Ativos', url: '/asset-health', icon: Building2 },
  { title: 'Financeiro', url: '/finance', icon: Wallet },
  { title: 'Pipeline', url: '/pipeline', icon: Filter, badgeKey: 'pipeline' },
  { title: 'Contatos', url: '/contacts', icon: Users, badgeKey: 'leads' },
];

const menuGroups: MenuGroup[] = [
  {
    title: 'Ativos',
    icon: Building2,
    items: [
      { title: 'Gestão', url: '/asset-health', icon: HeartPulse },
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
    items: [
      { title: 'Visão Geral', url: '/finance', icon: Wallet },
      { title: 'DRE', url: '/finance/dre', icon: BarChart3 },
      { title: 'Lançamentos', url: '/finance/transactions', icon: Receipt },
      { title: 'Conciliação', url: '/finance/reconciliation', icon: ArrowLeftRight },
      { title: 'Categorias', url: '/finance/categories', icon: Filter },
    ],
  },
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

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  
  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 text-xs font-bold text-primary-foreground bg-destructive rounded-full animate-scale-in">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const badges = useNotificationBadges();

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isGroupActive = (items: MenuItem[]) => {
    return items.some(item => isActive(item.url));
  };

  // Initialize with groups that have active items open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      if (isGroupActive(group.items)) {
        initial[group.title] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleGroupClick = (group: MenuGroup) => {
    const firstItem = group.items[0];
    if (firstItem) {
      navigate(firstItem.url);
      setOpenGroups(prev => ({ ...prev, [group.title]: true }));
      setIsMenuOpen(false);
    }
  };

  const getBadgeCount = (badgeKey?: 'leads' | 'pipeline' | 'schedule' | 'whatsapp') => {
    if (!badgeKey) return 0;
    return badges[badgeKey];
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-16">
        {mainTabs.map((tab) => (
          <button
            key={tab.url}
            onClick={() => navigate(tab.url)}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
              isActive(tab.url)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <tab.icon className="h-5 w-5" />
              <Badge count={getBadgeCount(tab.badgeKey)} />
            </div>
            <span className="text-[10px] font-medium">{tab.title}</span>
          </button>
        ))}

        {/* More menu */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2 justify-center">
                <SlotiLogo size="sm" />
                <span>Menu</span>
              </SheetTitle>
            </SheetHeader>
            
            <div className="space-y-2 py-4">
              {menuGroups.map((group, groupIndex) => {
                const GroupIcon = group.icon;
                const isOpen = openGroups[group.title] ?? isGroupActive(group.items);
                
                return (
                  <div key={group.title} className="animate-fade-in" style={{ animationDelay: `${groupIndex * 50}ms` }}>
                    <Collapsible
                      open={isOpen}
                    >
                      <div className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted transition-colors">
                        <button
                          className="flex items-center gap-3 flex-1"
                          onClick={() => handleGroupClick(group)}
                        >
                          <GroupIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{group.title}</span>
                        </button>
                        <CollapsibleTrigger asChild>
                          <button
                            onClick={(e) => toggleGroup(group.title, e)}
                            className="p-1 hover:bg-muted-foreground/10 rounded"
                          >
                            <ChevronRight 
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-90"
                              )} 
                            />
                          </button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                        <div className="pl-8 py-1 space-y-1">
                          {group.items.map((item) => (
                            <NavLink
                              key={item.url}
                              to={item.url}
                              className={cn(
                                "relative flex items-center gap-3 p-2.5 rounded-lg transition-colors",
                                "hover:bg-muted text-sm"
                              )}
                              activeClassName="bg-primary/10 text-primary font-medium"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <div className="relative">
                                <item.icon className="h-4 w-4" />
                                <Badge count={getBadgeCount(item.badgeKey)} />
                              </div>
                              <span>{item.title}</span>
                            </NavLink>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    {groupIndex < menuGroups.length - 1 && (
                      <Separator className="mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Help button with legend */}
            <div className="absolute bottom-6 right-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-center w-12 h-12 rounded-full bg-muted hover:bg-muted/80 transition-colors">
                    <HelpCircle className="h-6 w-6 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-64 p-3 max-h-[50vh] overflow-y-auto">
                  <p className="text-sm font-medium mb-2 text-foreground">Legenda dos ícones:</p>
                  <div className="space-y-3">
                    {menuGroups.map((group) => (
                      <div key={group.title}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{group.title}</p>
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <div key={item.url} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
