import {
  LayoutDashboard,
  Building2,
  Home,
  MapPin,
  HeartPulse,
  Users,
  Kanban,
  CalendarDays,
  DollarSign,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const inventoryItems = [
  { title: "Empreendimentos", url: "/properties", icon: Building2 },
  { title: "Unidades", url: "/units", icon: Home },
  { title: "Imóveis Avulsos", url: "/real-estate", icon: MapPin },
];

const crmItems = [
  { title: "Contatos", url: "/contacts", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: Kanban },
  { title: "Agenda", url: "/schedule", icon: CalendarDays },
];

const otherItems = [
  { title: "Gestão de Ativos", url: "/asset-health", icon: HeartPulse },
  { title: "Financeiro", url: "/finance", icon: DollarSign },
  { title: "Documentos", url: "/documents", icon: FileText },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
];

const bottomItems = [
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const inventoryActive = inventoryItems.some((i) => isActive(i.url));
  const crmActive = crmItems.some((i) => isActive(i.url));

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            S
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">Slotimob</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Inventário */}
        <Collapsible defaultOpen={inventoryActive || true} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:text-sidebar-foreground">
                Inventário
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>{renderItems(inventoryItems)}</SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* CRM */}
        <Collapsible defaultOpen={crmActive || true} className="group/collapsible">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:text-sidebar-foreground">
                CRM
                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>{renderItems(crmItems)}</SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Other */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(otherItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {renderItems(bottomItems)}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col text-xs leading-tight">
              <span className="font-medium text-sidebar-foreground truncate max-w-[140px]">
                {user?.user_metadata?.full_name || "Usuário"}
              </span>
              <span className="text-sidebar-foreground/60 truncate max-w-[140px]">
                {user?.email}
              </span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
