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
import { Building2, MapPin, Package, Percent, Flame, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { normalizePropertyImageUrl } from '@/lib/imageUtils';

interface Property {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  created_at?: string;
  image_url?: string | null;
  commission_rate?: number | null;
}

type SortField = 'name' | 'city' | 'total_units' | 'commission_rate' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface PropertiesTableViewProps {
  properties: Property[];
  unitCounts: Record<string, number>;
  onPropertyClick: (property: Property) => void;
  onManageUnits: (propertyId: string) => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}

export function PropertiesTableView({
  properties,
  unitCounts,
  onPropertyClick,
  onManageUnits,
  sortField,
  sortDirection,
  onSort,
}: PropertiesTableViewProps) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum empreendimento encontrado
      </div>
    );
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => onSort?.(field)}
      >
        {children}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ArrowDown className="ml-2 h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        )}
      </Button>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>
                <SortableHeader field="name">Nome</SortableHeader>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortableHeader field="city">Localização</SortableHeader>
              </TableHead>
              <TableHead className="text-center w-[120px]">
                <SortableHeader field="total_units">Unidades</SortableHeader>
              </TableHead>
              <TableHead className="text-center w-[130px]">
                <SortableHeader field="commission_rate">Comissão</SortableHeader>
              </TableHead>
              <TableHead className="w-[150px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => {
              const commissionRate = property.commission_rate ?? 5;
              const isHighCommission = commissionRate >= 6;

              return (
                <TableRow
                  key={property.id}
                  className="cursor-pointer"
                  onClick={() => onPropertyClick(property)}
                >
                  <TableCell className="p-2">
                    {property.image_url ? (
                      <img
                        src={normalizePropertyImageUrl(property.image_url) ?? undefined}
                        alt={property.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[200px]">
                        {property.name}
                      </span>
                      {property.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {property.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(property.city || property.state) && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="text-sm">
                          {property.city && property.state
                            ? `${property.city} - ${property.state}`
                            : property.city || property.state}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      <span>{unitCounts[property.id] || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`${
                            isHighCommission
                              ? 'bg-orange-500/15 text-orange-600 border-orange-500/30'
                              : 'bg-green-500/15 text-green-600 border-green-500/30'
                          }`}
                        >
                          {isHighCommission && <Flame className="h-3 w-3 mr-1" />}
                          <Percent className="h-3 w-3 mr-0.5" />
                          {commissionRate}%
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Taxa de comissão: {commissionRate}%</p>
                        {isHighCommission && <p className="text-orange-500">Comissão acima da média!</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageUnits(property.id);
                      }}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Unidades
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
