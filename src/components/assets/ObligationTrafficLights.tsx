import { cn } from "@/lib/utils";
import { ObligationHealth, ObligationStatus, ObligationType } from "@/hooks/useAssetHealth";
import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  MessageSquare, 
  Home, 
  Building, 
  Zap, 
  Droplets, 
  Flame, 
  Shield, 
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useIsMobile } from "@/hooks/use-mobile";

interface ObligationTrafficLightsProps {
  obligations: ObligationHealth[];
  onPayClick: (obligation: ObligationHealth) => void;
  onWhatsAppClick?: (obligation: ObligationHealth) => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<ObligationStatus, {
  bgClassName: string;
  textClassName: string;
  label: string;
}> = {
  paid: {
    bgClassName: "bg-green-500/20",
    textClassName: "text-green-600",
    label: "Pago",
  },
  pending: {
    bgClassName: "bg-yellow-500/20",
    textClassName: "text-yellow-600",
    label: "Pendente",
  },
  overdue: {
    bgClassName: "bg-red-500/20",
    textClassName: "text-red-600",
    label: "Atrasado",
  },
  ignored: {
    bgClassName: "bg-muted",
    textClassName: "text-muted-foreground",
    label: "Ignorado",
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

function TrafficLight({
  obligation,
  onPayClick,
  onWhatsAppClick,
  isMobile,
}: {
  obligation: ObligationHealth;
  onPayClick: () => void;
  onWhatsAppClick?: () => void;
  isMobile: boolean;
}) {
  const config = STATUS_CONFIG[obligation.status];
  const showActions = obligation.status === "pending" || obligation.status === "overdue";
  const Icon = OBLIGATION_ICONS[obligation.type] || MoreHorizontal;

  const lightElement = (
    <div
      className={cn(
        "w-6 h-6 rounded-md shrink-0 transition-all cursor-pointer flex items-center justify-center",
        config.bgClassName,
        obligation.status === "overdue" && "animate-pulse"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", config.textClassName)} />
    </div>
  );

  // On mobile, just show the light without tooltip
  if (isMobile) {
    return lightElement;
  }

  return (
    <HoverCard openDelay={100} closeDelay={50}>
      <HoverCardTrigger asChild>
        {lightElement}
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center" 
        className="w-auto p-2 max-w-xs"
        sideOffset={8}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-5 h-5 rounded flex items-center justify-center", config.bgClassName)}>
              <Icon className={cn("h-3 w-3", config.textClassName)} />
            </div>
            <div>
              <p className="text-xs font-medium">{obligation.label}</p>
              <p className="text-[10px] text-muted-foreground">{config.label}</p>
            </div>
          </div>
          
          {showActions && (
            <div className="flex gap-1 pt-1 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onPayClick();
                }}
              >
                <Receipt className="h-3 w-3 mr-1 text-green-600" />
                Pagar
              </Button>
              {onWhatsAppClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWhatsAppClick();
                  }}
                >
                  <MessageSquare className="h-3 w-3 mr-1 text-blue-600" />
                  Cobrar
                </Button>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function ObligationTrafficLights({
  obligations,
  onPayClick,
  onWhatsAppClick,
  compact = false,
}: ObligationTrafficLightsProps) {
  const isMobile = useIsMobile();
  const activeObligations = obligations.filter(o => o.status !== "ignored");
  const ignoredObligations = obligations.filter(o => o.status === "ignored");

  if (activeObligations.length === 0 && ignoredObligations.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma obrigação
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Active obligations */}
      <div className="flex flex-wrap gap-1.5">
        {activeObligations.map((obligation) => (
          <TrafficLight
            key={obligation.type}
            obligation={obligation}
            onPayClick={() => onPayClick(obligation)}
            onWhatsAppClick={onWhatsAppClick ? () => onWhatsAppClick(obligation) : undefined}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Ignored count (only in non-compact mode) */}
      {!compact && ignoredObligations.length > 0 && activeObligations.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] text-muted-foreground cursor-default">
                +{ignoredObligations.length} ignorado{ignoredObligations.length > 1 ? "s" : ""}
              </span>
            </TooltipTrigger>
            {!isMobile && (
              <TooltipContent>
                <p>{ignoredObligations.map(o => o.label).join(", ")}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
