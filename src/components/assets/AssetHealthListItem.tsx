import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Settings2, 
  Receipt, 
  MessageSquare,
  Calendar,
  Home, 
  Building, 
  Building2,
  Zap, 
  Droplets, 
  Flame, 
  Shield, 
  MoreHorizontal,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetHealth, ObligationHealth, ObligationStatus, ObligationType } from "@/hooks/useAssetHealth";
import { useNavigate } from "react-router-dom";
import { CreateTransactionDialog, TransactionPrefill } from "@/components/finance/CreateTransactionDialog";
import { useObligationCategoryMapping } from "@/hooks/useObligationCategoryMapping";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

export interface AssetHealthListItemProps {
  asset: AssetHealth;
  onConfigureClick: (unitId: string) => void;
  onManageClick: (asset: AssetHealth) => void;
  onWhatsAppClick?: (asset: AssetHealth, obligation: ObligationHealth) => void;
  referenceDate?: Date;
}

const STATUS_CONFIG: Record<ObligationStatus, {
  bgClassName: string;
  textClassName: string;
}> = {
  paid: {
    bgClassName: "bg-green-500/20",
    textClassName: "text-green-600",
  },
  pending: {
    bgClassName: "bg-yellow-500/20",
    textClassName: "text-yellow-600",
  },
  overdue: {
    bgClassName: "bg-red-500/20",
    textClassName: "text-red-600",
  },
  ignored: {
    bgClassName: "bg-muted",
    textClassName: "text-muted-foreground",
  },
};

const OBLIGATION_ICONS: Record<ObligationType, LucideIcon> = {
  rent: Home,
  condominium: Building,
  iptu: Receipt,
  energy: Zap,
  water: Droplets,
  gas: Flame,
  insurance: Shield,
  other: MoreHorizontal,
};

const OVERALL_STATUS_CONFIG: Record<AssetHealth["overallStatus"], {
  className: string;
  label: string;
}> = {
  healthy: {
    className: "bg-green-500/15 text-green-600 border-green-500/30",
    label: "Saudável",
  },
  attention: {
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    label: "Atenção",
  },
  critical: {
    className: "bg-red-500/15 text-red-600 border-red-500/30",
    label: "Crítico",
  },
};

function ObligationDot({ 
  obligation, 
  onPayClick,
  onWhatsAppClick,
  isMobile,
}: { 
  obligation: ObligationHealth;
  onPayClick?: () => void;
  onWhatsAppClick?: () => void;
  isMobile: boolean;
}) {
  const config = STATUS_CONFIG[obligation.status];
  const showActions = obligation.status === "pending" || obligation.status === "overdue";
  const Icon = OBLIGATION_ICONS[obligation.type] || MoreHorizontal;

  const statusLabels: Record<ObligationStatus, string> = {
    paid: "Pago",
    pending: "Pendente",
    overdue: "Atrasado",
    ignored: "Ignorado",
  };

  const dotContent = (
    <div
      className={cn(
        "w-5 h-5 rounded flex items-center justify-center shrink-0 transition-transform hover:scale-110",
        config.bgClassName
      )}
    >
      <Icon className={cn("h-3 w-3", config.textClassName)} />
    </div>
  );

  if (isMobile) {
    return dotContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative group cursor-pointer">
          {dotContent}
          {showActions && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-0.5 bg-popover border rounded-md shadow-lg p-0.5 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onPayClick?.();
                }}
              >
                <Receipt className="h-3 w-3 text-green-600" />
              </Button>
              {onWhatsAppClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWhatsAppClick();
                  }}
                >
                  <MessageSquare className="h-3 w-3 text-blue-600" />
                </Button>
              )}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs max-w-xs whitespace-normal">
        <p className="font-medium">{obligation.label}</p>
        <p className="text-muted-foreground">{statusLabels[obligation.status]}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function AssetHealthListItem({ asset, onConfigureClick, onManageClick, onWhatsAppClick, referenceDate }: AssetHealthListItemProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const overallConfig = OVERALL_STATUS_CONFIG[asset.overallStatus];
  const { findCategoryForObligation, getTransactionTypeForObligation } = useObligationCategoryMapping();

  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionPrefill, setTransactionPrefill] = useState<TransactionPrefill | undefined>();

  const activeObligations = asset.obligations.filter(o => o.status !== "ignored");

  // Calculate next due date using reference date (from filter)
  const refDate = referenceDate || new Date();
  const currentDay = refDate.getDate();
  const pendingObligations = activeObligations.filter(o => o.status === "pending" || o.status === "overdue");
  
  let nextDueDate: Date | null = null;
  let nextDueObligation: ObligationHealth | null = null;
  
  pendingObligations.forEach(o => {
    if (o.dueDay) {
      const dueDate = new Date(refDate.getFullYear(), refDate.getMonth(), o.dueDay);
      if (!nextDueDate || dueDate < nextDueDate) {
        nextDueDate = dueDate;
        nextDueObligation = o;
      }
    }
  });

  // Calculate total pending amount
  const totalPending = pendingObligations.reduce((sum, o) => sum + (o.amount || 0), 0);

  const handlePayClick = (obligation: ObligationHealth) => {
    const monthYear = format(refDate, "MMMM/yyyy", { locale: ptBR });
    const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    
    const dueDay = obligation.dueDay || 10;
    const dueDate = new Date(refDate.getFullYear(), refDate.getMonth(), dueDay);
    
    const categoryId = findCategoryForObligation(obligation.type);
    const transactionType = getTransactionTypeForObligation(obligation.type);

    setTransactionPrefill({
      description: `${obligation.label} - ${capitalizedMonthYear}`,
      unitId: asset.unitId,
      categoryId: categoryId || undefined,
      type: transactionType,
      dueDate: format(dueDate, "yyyy-MM-dd"),
      status: "paid",
      amount: obligation.amount || undefined,
    });
    setTransactionDialogOpen(true);
  };

  const handleTransactionSuccess = () => {
    setTransactionDialogOpen(false);
    setTransactionPrefill(undefined);
    queryClient.invalidateQueries({ queryKey: ["asset-health"] });
    queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
  };

  const handleWhatsAppClick = (obligation: ObligationHealth) => {
    if (onWhatsAppClick) {
      onWhatsAppClick(asset, obligation);
    }
  };

  // Get the first pending/overdue obligation for quick action
  const firstPendingObligation = pendingObligations[0];

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card transition-all hover:shadow-sm",
          asset.overallStatus === "critical" && "border-red-500/30 bg-red-500/5",
          asset.overallStatus === "attention" && "border-yellow-500/30 bg-yellow-500/5"
        )}
      >
        {/* Unit Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Asset Type Badge */}
            <Badge 
              variant="outline" 
              className="shrink-0 text-[10px] px-1.5 py-0.5 gap-1"
            >
              {asset.propertyName ? (
                <>
                  <Building2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Unidade</span>
                </>
              ) : (
                <>
                  <Home className="h-3 w-3" />
                  <span className="hidden sm:inline">Avulso</span>
                </>
              )}
            </Badge>
            <span className="font-medium text-sm truncate">{asset.unitNumber}</span>
            {asset.propertyName && (
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                • {asset.propertyName}
              </span>
            )}
          </div>
          {asset.ownerName && (
            <p className="text-xs text-muted-foreground truncate">
              {asset.ownerName}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <Badge className={cn("shrink-0 text-[10px] px-2 py-0.5", overallConfig.className)}>
          {overallConfig.label}
        </Badge>

        {/* Obligation Dots */}
        <TooltipProvider delayDuration={0}>
          <div className="hidden sm:flex items-center gap-1">
            {activeObligations.slice(0, 6).map((obligation) => (
              <ObligationDot
                key={obligation.type}
                obligation={obligation}
                onPayClick={() => handlePayClick(obligation)}
                onWhatsAppClick={onWhatsAppClick ? () => handleWhatsAppClick(obligation) : undefined}
                isMobile={isMobile}
              />
            ))}
            {activeObligations.length > 6 && (
              <span className="text-[10px] text-muted-foreground ml-0.5">
                +{activeObligations.length - 6}
              </span>
            )}
          </div>
        </TooltipProvider>

        {/* Next Due Date */}
        {nextDueDate && (
          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Calendar className="h-3 w-3" />
            <span>{format(nextDueDate, "dd/MM")}</span>
          </div>
        )}

        {/* Pending Total */}
        {totalPending > 0 && (
          <div className="hidden lg:block text-xs font-medium text-right shrink-0 w-24">
            <span className="text-red-600">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalPending)}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {firstPendingObligation && (
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePayClick(firstPendingObligation);
                    }}
                  >
                  <Receipt className="h-3.5 w-3.5 text-green-600" />
                </Button>
              </TooltipTrigger>
              {!isMobile && (
                <TooltipContent>
                  <p>Registrar pagamento</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onManageClick(asset)}
              >
                <ClipboardList className="h-3.5 w-3.5 text-primary" />
              </Button>
            </TooltipTrigger>
            {!isMobile && (
              <TooltipContent>
                <p>Gerenciar ativo</p>
              </TooltipContent>
            )}
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onConfigureClick(asset.unitId)}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            {!isMobile && (
              <TooltipContent>
                <p>Configurar obrigações</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      {/* Transaction Dialog */}
      <CreateTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        onSuccess={handleTransactionSuccess}
        prefill={transactionPrefill}
      />
    </>
  );
}
