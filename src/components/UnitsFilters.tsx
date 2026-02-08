import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { UNIT_STATUS_STYLES, ALL_UNIT_STATUSES, getStatusLabel } from '@/utils/uiConstants';

type UnitStatus = Database['public']['Enums']['unit_status'];

export type ManagementFilter = 'all' | 'managed' | 'not_managed';

export interface UnitsFiltersState {
  status: UnitStatus[];
  priceMin: string;
  priceMax: string;
  bedrooms: string;
  areaMin: string;
  areaMax: string;
  management: ManagementFilter;
}

interface UnitsFiltersProps {
  filters: UnitsFiltersState;
  onFiltersChange: (filters: UnitsFiltersState) => void;
}

export const UnitsFilters = ({ filters, onFiltersChange }: UnitsFiltersProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const updateFilter = <K extends keyof UnitsFiltersState>(
    key: K,
    value: UnitsFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleStatus = (status: UnitStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    updateFilter('status', newStatuses);
  };

  const clearFilters = () => {
    onFiltersChange({
      status: [],
      priceMin: '',
      priceMax: '',
      bedrooms: '',
      areaMin: '',
      areaMax: '',
      management: 'all',
    });
  };

  const activeFiltersCount = [
    filters.status.length > 0,
    filters.priceMin || filters.priceMax,
    filters.bedrooms,
    filters.areaMin || filters.areaMax,
    filters.management !== 'all',
  ].filter(Boolean).length;

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative flex-shrink-0">
          <Filter className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Management Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Gestão</Label>
            <Select 
              value={filters.management} 
              onValueChange={(value: ManagementFilter) => updateFilter('management', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os imóveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os imóveis</SelectItem>
                <SelectItem value="managed">Imóveis sob Gestão</SelectItem>
                <SelectItem value="not_managed">Apenas para Venda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <div className="space-y-2">
              {ALL_UNIT_STATUSES.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`filter-status-${status}`}
                    checked={filters.status.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <label
                    htmlFor={`filter-status-${status}`}
                    className="text-sm cursor-pointer"
                  >
                    {getStatusLabel(status)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Faixa de Preço (R$)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Mín"
                value={filters.priceMin}
                onChange={(e) => updateFilter('priceMin', e.target.value)}
              />
              <span className="flex items-center text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Máx"
                value={filters.priceMax}
                onChange={(e) => updateFilter('priceMax', e.target.value)}
              />
            </div>
          </div>

          {/* Bedrooms */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quartos</Label>
            <div className="flex flex-wrap gap-2">
              {['1', '2', '3', '4+'].map((beds) => (
                <Button
                  key={beds}
                  type="button"
                  variant={filters.bedrooms === beds ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    updateFilter('bedrooms', filters.bedrooms === beds ? '' : beds)
                  }
                >
                  {beds}
                </Button>
              ))}
            </div>
          </div>

          {/* Area Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Área (m²)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Mín"
                value={filters.areaMin}
                onChange={(e) => updateFilter('areaMin', e.target.value)}
              />
              <span className="flex items-center text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Máx"
                value={filters.areaMax}
                onChange={(e) => updateFilter('areaMax', e.target.value)}
              />
            </div>
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <Button variant="ghost" onClick={clearFilters} className="w-full gap-2">
              <X className="h-4 w-4" />
              Limpar Filtros
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
