import { useState } from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  Calculator, 
  Home, 
  History, 
  BarChart3, 
  Plug, 
  GraduationCap, 
  Settings,
  ChevronRight,
  ChevronDown,
  Wallet,
  UsersRound,
  Shield,
  Sparkles,
  Lock,
  ClipboardList,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { SlotiLogo } from '@/components/SlotiLogo';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useCockpitAccess } from '@/hooks/useCockpitAccess';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

interface NestedSubMenuItem {
  title: string;
  url: string;
}

interface SubMenuItem {
  title: string;
  url: string;
  nestedItems?: NestedSubMenuItem[];
}

interface MenuItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  items?: SubMenuItem[];
  ownerOnly?: boolean;
  hiddenOnPlan?: string[];
  trialVisible?: boolean;
}

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed' && !isMobile;
  const { isAgent } = useUserRole();
  const { plan, isTrialActive, canUse, features } = useSubscriptionLimits();
  const { hasCockpitAccess } = useCockpitAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<'essencial' | 'pro' | 'business'>('pro');
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();

  const isPlanProOrAbove = plan === 'pro' || plan === 'business';

  // Determine which sub-items are locked
  const isSubItemLocked = (url: string, title: string): boolean => {
    if (url === '/finance/dre' || url === '/finance/reconciliation') return !canUse('finance_full');
    if (url === '/whatsapp' || title === 'Mensagens') return !features || (features.whatsapp_instances_limit ?? 0) <= 0;
    if (url === '/ai-chat') return !canUse('ai_chat');
    // Gestão sub-items locked for free/essencial (unless trialing)
    if (url.startsWith('/gestao/')) return !isPlanProOrAbove && !isTrialActive;
    return false;
  };

  const getTargetPlan = (url: string): 'essencial' | 'pro' | 'business' => {
    if (url === '/whatsapp' || url === '/finance/dre' || url === '/finance/reconciliation') return plan === 'pro' ? 'business' : 'pro';
    if (url === '/ai-chat') return plan === 'pro' ? 'business' : 'pro';
    if (url === '/reports' || url.startsWith('/gestao/')) return plan === 'pro' ? 'business' : 'pro';
    return plan === 'pro' ? 'business' : 'pro';
  };

  const handleLockedClick = (url: string, title: string) => {
    setUpgradeTarget(getTargetPlan(url));
    setUpgradeFeature(title);
    setUpgradeOpen(true);
  };

  // Check if a top-level item (without sub-items) is locked
  const isTopItemLocked = (item: MenuItem): boolean => {
    if (item.url === '/ai-chat') return !canUse('ai_chat');
    if (item.url === '/reports') return !isPlanProOrAbove && !isTrialActive;
    return false;
  };

  // Build menu items with role/plan gating
  const menuItems: MenuItem[] = [
    { title: 'Chat IA', url: '/ai-chat', icon: Sparkles, hiddenOnPlan: ['free', 'essencial'], trialVisible: true },
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { 
      title: 'Gestão', 
      icon: ClipboardList,
      items: [
        { title: 'Aluguéis', url: '/gestao/alugueis' },
        { title: 'Contratos', url: '/gestao/contratos' },
        { title: 'Gerencial', url: '/gestao/gerencial' },
        { title: 'Afazeres', url: '/gestao/afazeres' },
      ]
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
          ]
        },
        { title: 'Imóveis Avulsos', url: '/real-estate' },
      ]
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
      ]
    },
    { 
      title: 'CRM', 
      icon: Users,
      items: [
        { title: 'Mensagens', url: '/whatsapp' },
        { title: 'Pipeline', url: '/pipeline' },
        { title: 'Contatos', url: '/contacts' },
        { title: 'Agenda', url: '/schedule' },
      ]
    },
    { title: 'Relatórios', url: '/reports', icon: BarChart3, ownerOnly: true },
    { title: 'Documentos', url: '/documents', icon: FileText },
    { title: 'Simulador', url: '/simulator', icon: Calculator },
    { title: 'Integrações', url: '/integrations', icon: Plug },
    { title: 'Treinamentos', url: '/training', icon: GraduationCap },
    { title: 'Usuários', url: '/users', icon: UsersRound, ownerOnly: true, hiddenOnPlan: ['essencial', 'free'] },
    { title: 'Histórico', url: '/history', icon: History },
  ];

  // Filter menu items based on role and plan
  const filteredMenuItems = menuItems.filter(item => {
    if (item.ownerOnly && isAgent) return false;
    if (item.hiddenOnPlan?.includes(plan)) {
      // If trial is active and item is marked trialVisible, show it anyway
      if (item.trialVisible && isTrialActive) return true;
      // PLG: Show locked items instead of hiding (for Chat IA)
      if (item.url === '/ai-chat') return true;
      return false;
    }
    return true;
  });

  // Add Cockpit for staff roles (super_admin, admin, support)
  if (hasCockpitAccess) {
    filteredMenuItems.push({ title: 'Cockpit Master', url: '/admin/cockpit', icon: Shield });
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    if (path.startsWith('/finance')) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isGroupActive = (items?: SubMenuItem[]) => {
    if (!items) return false;
    return items.some(item => {
      if (isActive(item.url)) return true;
      if (item.nestedItems) {
        return item.nestedItems.some(nested => isActive(nested.url));
      }
      return false;
    });
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    filteredMenuItems.forEach(item => {
      if (item.items && isGroupActive(item.items)) {
        initial[item.title] = true;
        item.items.forEach(subItem => {
          if (subItem.nestedItems?.some(nested => isActive(nested.url))) {
            initial[`${item.title}-${subItem.title}`] = true;
          }
        });
      }
    });
    return initial;
  });

  const toggleGroup = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleGroupClick = (item: MenuItem) => {
    const firstSubItem = item.items?.[0];
    if (firstSubItem) {
      const targetUrl = firstSubItem.nestedItems?.[0]?.url || firstSubItem.url;
      navigate(targetUrl);
      setOpenGroups(prev => ({ ...prev, [item.title]: true }));
      if (isMobile) setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-card transition-all duration-300 ease-out">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <SlotiLogo size="sm" />
          <span className={`font-semibold text-lg whitespace-nowrap transition-all duration-300 ease-out ${collapsed ? 'opacity-0 w-0 -ml-3' : 'opacity-100 w-auto'}`}>
            SLOTIMOB
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-4 flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className={`transition-opacity duration-300 ${collapsed ? 'sr-only' : ''}`}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const topLocked = isTopItemLocked(item);

                if (!item.items) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild={!topLocked} isActive={!topLocked && isActive(item.url!)} tooltip={item.title}>
                        {topLocked ? (
                          <button
                            className="flex items-center gap-3 transition-all duration-200 w-full text-muted-foreground cursor-pointer"
                            onClick={() => handleLockedClick(item.url!, item.title)}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className={`flex items-center gap-1.5 transition-all duration-300 ease-out ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                              {item.title}
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </span>
                          </button>
                        ) : (
                          <NavLink 
                            to={item.url!} 
                            className="flex items-center gap-3 transition-all duration-200" 
                            activeClassName="bg-primary/10 text-primary font-medium"
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <item.icon className="h-4 w-4 shrink-0 transition-transform duration-200" />
                            <span className={`transition-all duration-300 ease-out ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                              {item.title}
                              {item.trialVisible && isTrialActive && !collapsed && (
                                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary leading-none align-middle">
                                  PRO
                                </span>
                              )}
                            </span>
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const groupActive = isGroupActive(item.items);
                const isOpen = openGroups[item.title] ?? groupActive;

                return (
                  <Collapsible
                    key={item.title}
                    open={!collapsed && isOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        tooltip={item.title}
                        className={cn(
                          "flex items-center gap-3 w-full transition-all duration-200 cursor-pointer",
                          groupActive && "bg-primary/10 text-primary font-medium"
                        )}
                        onClick={() => {
                          // If all sub-items are locked, treat the group click as locked
                          const allLocked = item.items?.every(sub => isSubItemLocked(sub.url, sub.title));
                          if (allLocked) {
                            const firstUrl = item.items?.[0]?.url || '';
                            handleLockedClick(firstUrl, item.title);
                            return;
                          }
                          handleGroupClick(item);
                        }}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className={`flex-1 text-left transition-all duration-300 ease-out ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                          {item.title}
                          {item.items?.every(sub => isSubItemLocked(sub.url, sub.title)) && !collapsed && (
                            <Lock className="inline h-3 w-3 ml-1.5 text-muted-foreground" />
                          )}
                        </span>
                        <CollapsibleTrigger asChild onClick={(e) => toggleGroup(item.title, e)}>
                          <ChevronRight 
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200 hover:bg-muted rounded",
                              collapsed ? 'opacity-0 w-0' : 'opacity-100',
                              isOpen && "rotate-90"
                            )} 
                          />
                        </CollapsibleTrigger>
                      </SidebarMenuButton>
                      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                        <SidebarMenuSub className="animate-fade-in">
                          {item.items.map((subItem) => {
                            if (subItem.nestedItems && subItem.nestedItems.length > 0) {
                              const nestedKey = `${item.title}-${subItem.title}`;
                              const nestedActive = subItem.nestedItems.some(nested => isActive(nested.url));
                              const nestedOpen = openGroups[nestedKey] ?? nestedActive;

                              return (
                                <Collapsible
                                  key={subItem.url}
                                  open={nestedOpen}
                                  className="w-full"
                                >
                                  <SidebarMenuSubItem className="flex flex-col">
                                    <div className="flex items-center w-full">
                                      <SidebarMenuSubButton 
                                        asChild 
                                        isActive={nestedActive}
                                        className="flex-1"
                                      >
                                        <NavLink 
                                          to={subItem.nestedItems[0].url}
                                          className="transition-colors duration-200"
                                          activeClassName="bg-primary/10 text-primary font-medium"
                                          onClick={() => {
                                            setOpenGroups(prev => ({ ...prev, [nestedKey]: true }));
                                            if (isMobile) setOpenMobile(false);
                                          }}
                                        >
                                          {subItem.title}
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                      <CollapsibleTrigger 
                                        onClick={(e) => toggleGroup(nestedKey, e)}
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                      >
                                        <ChevronDown 
                                          className={cn(
                                            "h-3 w-3 transition-transform duration-200",
                                            nestedOpen && "rotate-180"
                                          )} 
                                        />
                                      </CollapsibleTrigger>
                                    </div>
                                    <CollapsibleContent className="overflow-hidden">
                                      <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-2">
                                        {subItem.nestedItems.map((nested) => (
                                          <NavLink
                                            key={nested.url}
                                            to={nested.url}
                                            className={cn(
                                              "block py-1.5 px-2 text-sm rounded-md transition-colors",
                                              isActive(nested.url) 
                                                ? "bg-primary/10 text-primary font-medium" 
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                            onClick={() => isMobile && setOpenMobile(false)}
                                          >
                                            {nested.title}
                                          </NavLink>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </SidebarMenuSubItem>
                                </Collapsible>
                              );
                            }

                            return (
                              <SidebarMenuSubItem key={subItem.url}>
                                <SidebarMenuSubButton asChild={!isSubItemLocked(subItem.url, subItem.title)} isActive={!isSubItemLocked(subItem.url, subItem.title) && isActive(subItem.url)}>
                                {isSubItemLocked(subItem.url, subItem.title) ? (
                                  <button
                                    className="flex items-center gap-1.5 w-full text-muted-foreground cursor-pointer transition-colors duration-200"
                                    onClick={() => handleLockedClick(subItem.url, subItem.title)}
                                  >
                                    {subItem.title}
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                ) : (
                                  <NavLink 
                                    to={subItem.url} 
                                    className="transition-colors duration-200"
                                    activeClassName="bg-primary/10 text-primary font-medium"
                                    onClick={() => isMobile && setOpenMobile(false)}
                                  >
                                    {subItem.title}
                                  </NavLink>
                                )}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip="Configurações">
              <NavLink 
                to="/settings" 
                className="flex items-center gap-3" 
                activeClassName="bg-primary/10 text-primary font-medium"
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span className={`transition-all duration-300 ease-out ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Configurações</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        targetPlan={upgradeTarget}
        feature={upgradeFeature}
      />
    </Sidebar>
  );
}
