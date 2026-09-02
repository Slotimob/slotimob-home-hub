import { cn } from "@/lib/utils";
import { ObligationHealth, ObligationStatus, ObligationType } from "@/hooks/useAssetHealth";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Building, 
  Zap, 
  Droplets, 
  Flame, 
  Shield, 
  MoreHorizontal,
  Link2,
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
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface ObligationTrafficLightsProps {
  obligations: ObligationHealth[];
  onLinkClick?: (obligation: ObligationHealth) => void;
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
  iptu: MoreHorizontal,
  energy: Zap,
  water: Droplets,
  gas: Flame,
  garbage_fee: Trash2,
  insurance: Shield,
  other: MoreHorizontal,
};

function TrafficLight({
  obligation,
  onLinkClick,
  isMobile,
}: {
  obligation: ObligationHealth;
  onLinkClick?: () => void;
  isMobile: boolean;
}) {
  const config = STATUS_CONFIG[obligation.status];
  const showLink = (obligation.status === "pending" || obligation.status === "overdue") && onLinkClick;
  const Icon = OBLIGATION_ICONS[obligation.type] || MoreHorizontal;
  const isManagerial = obligation.controlType === "managerial";

  const lightElement = (
    <div className="relative">
      <div
        className={cn(
          "w-6 h-6 rounded-md shrink-0 transition-all flex items-center justify-center",
          config.bgClassName,
          obligation.status === "overdue" && "animate-pulse",
          isManagerial && "ring-1 ring-purple-400/50"
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", config.textClassName)} />
      </div>
      {isManagerial && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 border border-background" />
      )}
    </div>
  );

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
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-muted-foreground">{config.label}</p>
                {isManagerial && (
                  <Badge variant="outline" className="h-3.5 px-1 text-[8px] border-purple-400 text-purple-600">
                    Gerencial
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {showLink && (
            <div className="pt-1 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onLinkClick();
                }}
              >
                <Link2 className="h-3 w-3 mr-1 text-primary" />
                Vincular lançamento
              </Button>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function ObligationTrafficLights({
  obligations,
  onLinkClick,
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
      <div className="flex flex-wrap gap-1.5">
        {activeObligations.map((obligation) => (
          <TrafficLight
            key={obligation.type}
            obligation={obligation}
            onLinkClick={onLinkClick ? () => onLinkClick(obligation) : undefined}
            isMobile={isMobile}
          />
        ))}
      </div>

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
