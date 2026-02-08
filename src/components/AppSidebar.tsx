import { useState } from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  Calculator, 
  Home, 
  CalendarDays, 
  History, 
  BarChart3, 
  Plug, 
  GraduationCap, 
  Settings,
  ChevronRight,
  ChevronDown,
  Wallet,
  UsersRound,
  MessageSquare,
  Kanban,
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
}

// Main menu items
const menuItems: MenuItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { 
    title: 'Ativos', 
    icon: Building2,
    items: [
      { title: 'Gestão', url: '/asset-health' },
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
  { title: 'Relatórios', url: '/reports', icon: BarChart3 },
  { title: 'Documentos', url: '/documents', icon: FileText },
  { title: 'Simulador', url: '/simulator', icon: Calculator },
  { 
    title: 'Integrações', 
    icon: Plug,
    items: [
      { title: 'Conexões', url: '/integrations' },
      { title: 'Portais', url: '/portals' },
    ]
  },
  { title: 'Treinamentos', url: '/training', icon: GraduationCap },
  { title: 'Usuários', url: '/users', icon: UsersRound },
  { title: 'Histórico', url: '/history', icon: History },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed' && !isMobile;

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    // Use strict equality for all finance subroutes to prevent parent highlighting
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

  // Track which groups and nested groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuItems.forEach(item => {
      if (item.items && isGroupActive(item.items)) {
        initial[item.title] = true;
        // Also open nested groups with active items
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
      // If first subitem has nested items, navigate to first nested item's URL
      // Otherwise, navigate to the subitem's direct URL
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
        {/* Main Menu Group */}
        <SidebarGroup>
          <SidebarGroupLabel className={`transition-opacity duration-300 ${collapsed ? 'sr-only' : ''}`}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Simple menu item (no subitems)
                if (!item.items) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url!)} tooltip={item.title}>
                        <NavLink 
                          to={item.url!} 
                          className="flex items-center gap-3 transition-all duration-200" 
                          activeClassName="bg-primary/10 text-primary font-medium"
                          onClick={() => isMobile && setOpenMobile(false)}
                        >
                          <item.icon className="h-4 w-4 shrink-0 transition-transform duration-200" />
                          <span className={`transition-all duration-300 ease-out ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Collapsible menu item with subitems
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
                        onClick={() => handleGroupClick(item)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className={`flex-1 text-left transition-all duration-300 ease-out ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                          {item.title}
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
                            // Check if this subitem has nested items
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

                            // Regular sub item without nesting
                            return (
                              <SidebarMenuSubItem key={subItem.url}>
                                <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                <NavLink 
                                  to={subItem.url} 
                                  className="transition-colors duration-200"
                                  activeClassName="bg-primary/10 text-primary font-medium"
                                  onClick={() => isMobile && setOpenMobile(false)}
                                >
                                  {subItem.title}
                                </NavLink>
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
    </Sidebar>
  );
}
