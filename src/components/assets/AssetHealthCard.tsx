import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Building2, 
  Settings2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetHealth, ObligationHealth } from "@/hooks/useAssetHealth";
import { ObligationTrafficLights } from "./ObligationTrafficLights";

interface AssetHealthCardProps {
  asset: AssetHealth;
  onConfigureClick: (unitId: string) => void;
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

export function AssetHealthCard({ asset, onConfigureClick, onManageClick, onLinkClick }: AssetHealthCardProps) {
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
          {asset.coverImage ? (
            <img
              src={asset.coverImage}
              alt={asset.unitNumber}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center group-hover:bg-muted/80 transition-colors">
              {asset.propertyName ? (
                <Building2 className="h-10 w-10 text-muted-foreground/60" />
              ) : (
                <Home className="h-10 w-10 text-muted-foreground/60" />
              )}
            </div>
          )}
          
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
              <Button
                variant="link"
                size="sm"
                onClick={() => onConfigureClick(asset.unitId)}
                className="mt-0.5 h-6 text-xs"
              >
                Configurar obrigações
              </Button>
            </div>
          )}

          {/* Quick Actions - 2 buttons */}
          <div className="pt-2 border-t space-y-1.5">
            <Button
              variant="default"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => onManageClick(asset)}
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Gerenciar Ativo</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1 px-2"
              onClick={() => onConfigureClick(asset.unitId)}
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Configurar</span>
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
