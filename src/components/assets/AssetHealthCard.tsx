import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyImage } from "@/components/ui/PropertyImage";
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

interface AssetHealthCardProps {
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

export function AssetHealthCard({ asset, onManageClick, onLinkClick }: AssetHealthCardProps) {
  const overallConfig = OVERALL_STATUS_CONFIG[asset.overallStatus];
  const activeObligations = asset.obligations.filter(o => o.status !== "ignored");

  const handleLinkClick = (obligation: ObligationHealth) => {
    if (onLinkClick) {
      onLinkClick(asset, obligation);
    }
  };

  return (
      <Card
        className={cn(
          "overflow-hidden transition-all hover:shadow-md",
          asset.overallStatus === "critical" && "ring-1 ring-red-500/30",
          asset.overallStatus === "attention" && "ring-1 ring-yellow-500/30"
        )}
      >
        {/* Cover Image or Placeholder - Clickable */}
        <div 
          className="aspect-[16/9] bg-muted relative cursor-pointer group"
          onClick={() => onManageClick(asset)}
        >
          <PropertyImage
            src={asset.coverImage}
            alt={asset.unitNumber ?? 'Imóvel'}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          
          {/* Overall Status Badge */}
          <Badge className={cn("absolute top-2 right-2 text-[10px] px-2 py-0.5", overallConfig.className)}>
            {overallConfig.label}
          </Badge>
          
          {/* Asset Type Badge */}
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 text-[10px] px-2 py-0.5 gap-1 bg-background/80 backdrop-blur-sm text-foreground"
          >
            {asset.propertyName ? (
              <>
                <Building2 className="h-3 w-3" />
                Unidade
              </>
            ) : (
              <>
                <Home className="h-3 w-3" />
                Avulso
              </>
            )}
          </Badge>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
        </div>

        <CardHeader className="p-3 pb-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold line-clamp-2 leading-tight">
                {asset.unitNumber}
              </CardTitle>
              {asset.propertyName && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {asset.propertyName}
                </p>
              )}
              {asset.ownerName && (
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {asset.ownerName}
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-2 space-y-2">
          {/* Traffic Light Indicators */}
          {activeObligations.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Status do Mês
              </p>
              <ObligationTrafficLights
                obligations={asset.obligations}
                onLinkClick={onLinkClick ? handleLinkClick : undefined}
              />
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">
                Nenhuma obrigação configurada
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-2 border-t">
            <Button
              variant="default"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => onManageClick(asset)}
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Gerenciar Ativo</span>
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
