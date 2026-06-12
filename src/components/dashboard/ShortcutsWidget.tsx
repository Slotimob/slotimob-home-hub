import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Building2, 
  Home, 
  Receipt, 
  Calendar, 
  MessageCircle,
  PlusCircle,
  LucideIcon,
  Handshake,
  MapPin,
  BarChart3,
  FileText,
  Calculator,
  HeartPulse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ShortcutConfig } from '@/hooks/useDashboardPreferences';
import { useState } from 'react';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';
import { CreateUnitDialog } from '@/components/CreateUnitDialog';
import { CreateRealEstateDialog } from '@/components/CreateRealEstateDialog';
import { CreateTransactionDialog } from '@/components/finance/CreateTransactionDialog';
import { CreateDealDialog } from '@/components/CreateDealDialog';
import { CreateVisitDialog } from '@/components/CreateVisitDialog';

const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus,
  Building2,
  Home,
  Receipt,
  Calendar,
  MessageCircle,
  PlusCircle,
  Handshake,
  MapPin,
  BarChart3,
  FileText,
  Calculator,
  HeartPulse,
};

interface ShortcutsWidgetProps {
  shortcuts: ShortcutConfig[];
  isLoading?: boolean;
}

export function ShortcutsWidget({ shortcuts, isLoading }: ShortcutsWidgetProps) {
  const navigate = useNavigate();
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [createRealEstateOpen, setCreateRealEstateOpen] = useState(false);
  const [createTransactionOpen, setCreateTransactionOpen] = useState(false);
  const [createDealOpen, setCreateDealOpen] = useState(false);
  const [createVisitOpen, setCreateVisitOpen] = useState(false);

  const enabledShortcuts = shortcuts.filter(s => s.enabled);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 px-3 lg:px-6">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 lg:h-14" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleShortcutClick = (shortcut: ShortcutConfig) => {
    switch (shortcut.id) {
      case 'new-lead':
        setCreateContactOpen(true);
        break;
      case 'new-unit':
        setCreateUnitOpen(true);
        break;
      case 'new-property':
        setCreateRealEstateOpen(true);
        break;
      case 'new-transaction':
        setCreateTransactionOpen(true);
        break;
      case 'new-deal':
        setCreateDealOpen(true);
        break;
      case 'new-visit':
        setCreateVisitOpen(true);
        break;
      default:
        navigate(shortcut.route);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <>
        <Card>
          <CardHeader className="pb-2 px-3 lg:px-6 pt-3 lg:pt-6">
            <CardTitle className="text-sm lg:text-base font-semibold">Acessos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
            {/* Grid responsivo - sem overflow em nenhum breakpoint */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-[repeat(auto-fill,minmax(95px,1fr))] gap-2 lg:gap-3">
              {enabledShortcuts.map((shortcut) => {
                const Icon = ICON_MAP[shortcut.icon] || Building2;
                return (
                  <Tooltip key={shortcut.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-auto py-2 lg:py-3 px-2 lg:px-3 flex flex-col items-center gap-1 lg:gap-1.5 hover:bg-primary/10 hover:border-primary/40 hover:text-foreground transition-all group w-full"
                        onClick={() => handleShortcutClick(shortcut)}
                      >
                        <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-primary flex-shrink-0 group-hover:text-primary" />
                        <span 
                          className="text-xs text-center leading-tight w-full text-foreground break-words hyphens-auto"
                        >
                          {shortcut.label}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{shortcut.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <CreateContactDialog
          open={createContactOpen}
          onOpenChange={setCreateContactOpen}
          onSuccess={() => setCreateContactOpen(false)}
          defaultCategory="Lead"
        />
        <CreateUnitDialog
          open={createUnitOpen}
          onOpenChange={setCreateUnitOpen}
          onSuccess={() => setCreateUnitOpen(false)}
        />
        <CreateRealEstateDialog
          open={createRealEstateOpen}
          onOpenChange={setCreateRealEstateOpen}
          onSuccess={() => setCreateRealEstateOpen(false)}
        />
        <CreateTransactionDialog
          open={createTransactionOpen}
          onOpenChange={setCreateTransactionOpen}
          onSuccess={() => setCreateTransactionOpen(false)}
        />
        <CreateDealDialog
          open={createDealOpen}
          onOpenChange={setCreateDealOpen}
          onSuccess={() => setCreateDealOpen(false)}
        />
        <CreateVisitDialog
          open={createVisitOpen}
          onOpenChange={setCreateVisitOpen}
          onSuccess={() => setCreateVisitOpen(false)}
        />
      </>
    </TooltipProvider>
  );
}