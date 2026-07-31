import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Home, Rss } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { UnitCard } from "./UnitCard";
import { UnitActionsMenu } from "./UnitActionsMenu";
import { EmptyState } from "@/components/shared/EmptyState";
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
  iptu: number | null;
  condo_fee: number | null;
  cover_image_url: string | null;
  created_at: string;
  property_type?: string | null;
  intent_type?: string | null;
  is_managed?: boolean | null;
  is_occupied?: boolean | null;
  market_value?: number | null;
  rent_price?: number | null;
  is_standalone?: boolean | null;
  is_published_portal?: boolean | null;
  property?: {
    id: string;
    name: string;
    commission_rate?: number | null;
  } | null;
  owner?: {
    name: string;
  } | null;
}

interface UnitsTableViewProps {
  units: Unit[];
  onUnitClick: (unit: Unit) => void;
  onShareClick?: (unit: Unit) => void;
  onDuplicate?: (unit: Unit) => void | Promise<void>;
  onDelete?: (unit: Unit) => void | Promise<void>;
  showProperty?: boolean;
  showOwner?: boolean;
  hasFiltersApplied?: boolean;
  onClearFilters?: () => void;
}


const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
};

export function UnitsTableView({
  units,
  onUnitClick,
  onShareClick,
  showProperty = false,
  hasFiltersApplied = false,
  onClearFilters,
}: UnitsTableViewProps) {
  const isMobile = useIsMobile();

  if (units.length === 0) {
    if (hasFiltersApplied) {
      return (
        <EmptyState
          type="no-results"
          description="Nenhuma unidade corresponde aos filtros aplicados."
          actionLabel="Limpar Filtros"
          onAction={onClearFilters}
        />
      );
    }
    return (
      <EmptyState
        type="no-data"
        icon={Home}
        title="Nenhuma unidade encontrada"
        description="Adicione sua primeira unidade para começar a gerenciar seu portfólio."
      />
    );
  }

  // Check if unit should show rent price (rented or intent_type is rental)
  const shouldShowRent = (unit: Unit): boolean => {
    return unit.status === 'rented' || unit.intent_type === 'rental' || unit.intent_type === 'both';
  };

  // Mobile: Card View
  if (isMobile) {
    return (
      <div className="grid gap-3">
        {units.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            onUnitClick={onUnitClick}
            onShareClick={onShareClick}
            showProperty={showProperty}
          />
        ))}
      </div>
    );
  }

  // Desktop: Table View
  return (
    <TooltipProvider delayDuration={0}>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[140px] sm:w-[180px]">Identificação</TableHead>
              <TableHead className="w-[90px] sm:w-[100px]">Status</TableHead>
              {showProperty && <TableHead className="hidden md:table-cell min-w-[150px]">Empreendimento</TableHead>}
              <TableHead className="hidden sm:table-cell w-[100px]">Tipo</TableHead>
              <TableHead className="text-right w-[90px] sm:w-[110px]">Valor Imóvel</TableHead>
              <TableHead className="text-right w-[90px] sm:w-[110px]">Preço Venda</TableHead>
              <TableHead className="text-right w-[90px] sm:w-[110px]">R$ Aluguel</TableHead>
              <TableHead className="w-[60px] sm:w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow
                key={unit.id}
                className="cursor-pointer"
                onClick={() => onUnitClick(unit)}
              >
                <TableCell className="font-medium py-2 sm:py-4">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[120px] sm:max-w-[160px] text-sm">{unit.unit_number}</span>
                    {(unit.area || unit.area_total) && (
                      <span className="text-xs text-muted-foreground">
                        {unit.area_total && `${unit.area_total} m² total`}
                        {unit.area_total && unit.area && ' · '}
                        {unit.area && `${unit.area} m² útil`}
                        {unit.bedrooms !== null && ` • ${unit.bedrooms}q`}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2 sm:py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 sm:px-2 py-0.5 whitespace-nowrap ${UNIT_STATUS_STYLES[unit.status].badgeClasses}`}
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
                </TableCell>
                {showProperty && (
                  <TableCell className="hidden md:table-cell py-2 sm:py-4">
                    {unit.property?.name ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-[150px] lg:max-w-[200px] block text-sm">
                            {unit.property.name}
                          </span>
                        </TooltipTrigger>
                        {!isMobile && unit.property.name.length > 20 && (
                          <TooltipContent
                            side="top"
                            className="max-w-xs whitespace-normal break-words"
                          >
                            <p>{unit.property.name}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="hidden sm:table-cell py-2 sm:py-4">
                  {unit.property_type ? (
                    <span className="text-xs text-muted-foreground">
                      {PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right py-2 sm:py-4">
                  {unit.market_value != null ? (
                    <span className="font-medium text-xs sm:text-sm">
                      {formatCurrency(unit.market_value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right py-2 sm:py-4">
                  {showSalePrice(unit.intent_type) && unit.price != null ? (
                    <span className="font-medium text-xs sm:text-sm">
                      {formatCurrency(unit.price)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right py-2 sm:py-4">
                  {showRentalPrice(unit.intent_type) && unit.rent_price != null ? (
                    <span className="font-medium text-xs sm:text-sm text-blue-600">
                      {formatCurrency(unit.rent_price)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right py-2 sm:py-4">
                  <div className="flex justify-end gap-1">
                    {onShareClick && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareClick(unit);
                            }}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        {!isMobile && (
                          <TooltipContent>
                            <p>Compartilhar</p>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnitClick(unit);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      {!isMobile && (
                        <TooltipContent>
                          <p>Ver detalhes</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
