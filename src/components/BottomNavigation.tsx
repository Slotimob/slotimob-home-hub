import { 
  Menu, 
  HelpCircle,
  ChevronRight,
  Lock,
  LucideIcon,
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
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { Separator } from '@/components/ui/separator';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { PRIMARY_TABS, NAV_GROUPS, type NavItem, type NavGroup } from '@/config/navigationItems';

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
  const { plan, isTrialActive, canUse, features } = useSubscriptionLimits();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<'essencial' | 'pro' | 'business'>('pro');
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();

  const isPlanProOrAbove = plan === 'pro' || plan === 'business';

  const isNavItemLocked = (url: string): boolean => {
    // Gestão group
    if (url.startsWith('/gestao/') || url === '/gestao/alugueis') return !isPlanProOrAbove && !isTrialActive;
    // Reports
    if (url === '/reports' || url.startsWith('/reports/')) return !isPlanProOrAbove && !isTrialActive;
    // DRE / Reconciliation
    if (url === '/finance/dre' || url === '/finance/reconciliation') return !canUse('finance_full');
    // WhatsApp
    if (url === '/whatsapp') return !features || (features.whatsapp_instances_limit ?? 0) <= 0;
    return false;
  };

  const getTargetPlan = (url: string): 'essencial' | 'pro' | 'business' => {
    return plan === 'pro' ? 'business' : 'pro';
  };

  const handleLockedClick = (url: string, title: string) => {
    setUpgradeTarget(getTargetPlan(url));
    setUpgradeFeature(title);
    setUpgradeOpen(true);
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isGroupActive = (items: NavItem[]) => {
    return items.some(item => isActive(item.url));
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach(group => {
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

  const handleGroupClick = (group: NavGroup) => {
    const firstItem = group.items[0];
    if (firstItem) {
      // Check if first item is locked
      if (isNavItemLocked(firstItem.url)) {
        handleLockedClick(firstItem.url, group.title);
        return;
      }
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
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center justify-around h-16">
          {PRIMARY_TABS.map((tab) => {
            const locked = isNavItemLocked(tab.url);
            return (
              <button
                key={tab.url}
                onClick={() => {
                  if (locked) {
                    handleLockedClick(tab.url, tab.title);
                    return;
                  }
                  navigate(tab.url);
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors min-h-[44px] min-w-[44px]",
                  locked
                    ? "text-muted-foreground/50"
                    : isActive(tab.url)
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <tab.icon className="h-5 w-5" />
                  {locked ? (
                    <Lock className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Badge count={getBadgeCount(tab.badgeKey)} />
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.title}</span>
              </button>
            );
          })}

          {/* More menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors min-h-[44px] min-w-[44px]",
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
                {NAV_GROUPS.map((group, groupIndex) => {
                  const GroupIcon = group.icon;
                  const isOpen = openGroups[group.title] ?? isGroupActive(group.items);
                  const allItemsLocked = group.items.every(item => isNavItemLocked(item.url));
                  
                  return (
                    <div key={group.title} className="animate-fade-in" style={{ animationDelay: `${groupIndex * 50}ms` }}>
                      <Collapsible
                        open={isOpen}
                      >
                        <div className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted transition-colors">
                          <button
                            className="flex items-center gap-3 flex-1 min-h-[44px]"
                            onClick={() => handleGroupClick(group)}
                          >
                            <GroupIcon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{group.title}</span>
                            {allItemsLocked && (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                          <CollapsibleTrigger asChild>
                            <button
                              onClick={(e) => toggleGroup(group.title, e)}
                              className="p-2 hover:bg-muted-foreground/10 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                            {group.items.map((item) => {
                              const itemLocked = isNavItemLocked(item.url);
                              
                              if (itemLocked) {
                                return (
                                  <button
                                    key={item.url}
                                    className="relative flex items-center gap-3 p-3 rounded-lg transition-colors min-h-[44px] hover:bg-muted text-sm text-muted-foreground w-full text-left"
                                    onClick={() => {
                                      setIsMenuOpen(false);
                                      handleLockedClick(item.url, item.title);
                                    }}
                                  >
                                    <div className="relative">
                                      <item.icon className="h-4 w-4" />
                                      <Lock className="absolute -top-1 -right-1 h-2.5 w-2.5" />
                                    </div>
                                    <span>{item.title}</span>
                                  </button>
                                );
                              }

                              return (
                                <NavLink
                                  key={item.url}
                                  to={item.url}
                                  className={cn(
                                    "relative flex items-center gap-3 p-3 rounded-lg transition-colors min-h-[44px]",
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
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                      {groupIndex < NAV_GROUPS.length - 1 && (
                        <Separator className="mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Help button */}
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
                      {NAV_GROUPS.map((group) => (
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

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        targetPlan={upgradeTarget}
        feature={upgradeFeature}
      />
    </>
  );
}
