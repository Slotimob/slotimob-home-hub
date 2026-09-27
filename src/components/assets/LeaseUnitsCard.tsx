import { Link, useNavigate } from "react-router-dom";
import { Building2, Home, Pencil, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLeaseUnits } from "@/hooks/useLeases";

interface Props {
  leaseId: string;
  canEdit?: boolean;
}

/** Card "Imóveis do contrato": principal, adicionais e % do rateio. */
export function LeaseUnitsCard({ leaseId, canEdit }: Props) {
  const navigate = useNavigate();
  const { data: rows = [] } = useLeaseUnits(leaseId);
  if (!rows.length) return null;
  const hasShares = rows.some((r) => r.share_percent != null);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Imóveis do contrato</CardTitle>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/gestao/contratos/novo?edit=${leaseId}&step=unit`)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Editar imóveis
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => {
          const standalone = !!r.unit?.is_standalone;
          const href = standalone ? `/real-estate?id=${r.unit_id}` : `/units?id=${r.unit_id}`;
          const label =
            [r.unit?.property?.name, r.unit?.unit_number].filter(Boolean).join(" — ") || "Imóvel";
          return (
            <div key={r.id} className="flex items-start gap-3 p-2 rounded-md border min-w-0">
              {standalone ? (
                <Home className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              ) : (
                <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <Link to={href} className="text-sm font-medium hover:underline break-words">
                  {label}
                </Link>
                {r.subdivision?.label && (
                  <p className="text-xs text-primary">Fração: {r.subdivision.label}</p>
                )}
                {r.unit?.address && (
                  <p className="text-xs text-muted-foreground break-words">{r.unit.address}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {r.is_primary && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Star className="h-3 w-3 mr-1" />
                    Principal
                  </Badge>
                )}
                {hasShares && (
                  <span className="text-xs text-muted-foreground">
                    {(Number(r.share_percent) || 0).toLocaleString("pt-BR")}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {rows.length > 1 && !hasShares && (
          <p className="text-[11px] text-muted-foreground">Rateio em partes iguais entre os imóveis.</p>
        )}
      </CardContent>
    </Card>
  );
}
