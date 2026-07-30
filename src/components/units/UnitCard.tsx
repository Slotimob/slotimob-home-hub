import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Share2, Home, Ruler, Bed, Rss } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { UNIT_STATUS_STYLES, PROPERTY_TYPE_LABELS } from "@/utils/uiConstants";
import { showSalePrice, showRentalPrice } from "@/utils/unitPricing";

type UnitStatus = Database["public"]["Enums"]["unit_status"];

interface Unit {
  id: string;
  property_id: string | null;
  unit_number: string;
  status: UnitStatus;
  price: number | null;
  area: number | null;
  area_total?: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  rent_price?: number | null;
  intent_type?: string | null;
  market_value?: number | null;
  property_type?: string | null;
  cover_image_url: string | null;
  is_published_portal?: boolean | null;
  property?: {
    id: string;
    name: string;
  } | null;
}

interface UnitCardProps {
  unit: Unit;
  onUnitClick: (unit: Unit) => void;
  onShareClick?: (unit: Unit) => void;
  showProperty?: boolean;
}


const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export function UnitCard({ unit, onUnitClick, onShareClick, showProperty }: UnitCardProps) {
  const navigate = useNavigate();
  const canShowSale = showSalePrice(unit.intent_type) && unit.price != null;
  const canShowRent = showRentalPrice(unit.intent_type) && unit.rent_price != null;

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onUnitClick(unit)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Unit Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">{unit.unit_number}</p>
              {unit.property_type && (
                <p className="text-xs text-muted-foreground">
                  {PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0.5 whitespace-nowrap ${UNIT_STATUS_STYLES[unit.status].badgeClasses}`}
            >
              {UNIT_STATUS_STYLES[unit.status].label}
            </Badge>
            {unit.is_published_portal && (
              <Badge className="text-[10px] px-1.5 py-0.5 bg-violet-500/10 text-violet-600 border-violet-500/20 whitespace-nowrap">
                <Rss className="h-2.5 w-2.5 mr-0.5" />
                Portal
              </Badge>
            )}
          </div>
        </div>

        {/* Property Name (if applicable) */}
        {showProperty && unit.property?.name && (
          <p className="text-sm text-muted-foreground truncate">
            {unit.property.name}
          </p>
        )}

        {/* Unit Details */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {(unit.area || unit.area_total) && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" />
              {unit.area_total && unit.area
                ? `${unit.area_total} m² total · ${unit.area} m² útil`
                : `${unit.area ?? unit.area_total} m²${unit.area_total && !unit.area ? ' total' : ''}`}
            </span>
          )}
          {unit.bedrooms !== null && (
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" />
              {unit.bedrooms} quartos
            </span>
          )}
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between pt-2 border-t">
          {canShowSale && (
            <div>
              <p className="text-xs text-muted-foreground">Venda</p>
              <p className="font-semibold">{formatCurrency(unit.price)}</p>
            </div>
          )}
          {canShowRent && (
            <div className={canShowSale ? "text-right" : undefined}>
              <p className="text-xs text-muted-foreground">Aluguel</p>
              <p className="font-semibold text-blue-600">{formatCurrency(unit.rent_price)}</p>
            </div>
          )}
          {!canShowSale && !canShowRent && unit.market_value != null && (
            <div>
              <p className="text-xs text-muted-foreground">Valor Imóvel</p>
              <p className="font-semibold">{formatCurrency(unit.market_value)}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/gestao/propostas?create=true&unitId=${unit.id}`);
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            Proposta
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onUnitClick(unit);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
