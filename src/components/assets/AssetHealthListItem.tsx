import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Building2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetHealth, ObligationHealth } from "@/hooks/useAssetHealth";
import { ObligationTrafficLights } from "./ObligationTrafficLights";

export interface AssetHealthListItemProps {
  asset: AssetHealth;
  onManageClick: (asset: AssetHealth) => void;
  onLinkClick?: (asset: AssetHealth, obligation: ObligationHealth) => void;
}

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

export function AssetHealthListItem({ asset, onManageClick, onLinkClick }: AssetHealthListItemProps) {
  const overallConfig = OVERALL_STATUS_CONFIG[asset.overallStatus];

  const handleLinkClick = (obligation: ObligationHealth) => {
    if (onLinkClick) {
      onLinkClick(asset, obligation);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card transition-all hover:shadow-sm",
        asset.overallStatus === "critical" && "border-red-500/30 bg-red-500/5",
        asset.overallStatus === "attention" && "border-yellow-500/30 bg-yellow-500/5"
      )}
    >
      {/* Left Column: Unit Info (clickable) */}
      <button
        type="button"
        className="flex-1 min-w-0 text-left cursor-pointer"
        onClick={() => onManageClick(asset)}
      >
        <div className="flex items-center gap-2">
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
      </button>

      {/* Center Column: Obligations + Status */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center">
          <ObligationTrafficLights
            obligations={asset.obligations}
            onLinkClick={onLinkClick ? handleLinkClick : undefined}
            compact
          />
        </div>
        <Badge className={cn("shrink-0 text-[10px] px-2 py-0.5", overallConfig.className)}>
          {overallConfig.label}
        </Badge>
      </div>

      {/* Right Column: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-[11px] px-2"
          onClick={() => onManageClick(asset)}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Gerenciar</span>
        </Button>
      </div>
    </div>
  );
}
