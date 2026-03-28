import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Search, X, CalendarIcon, Filter, Flame, Thermometer, Snowflake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface PipelineFiltersState {
  search: string;
  priority: string;
  temperature: string;
  origin: string;
  minValue: string;
  maxValue: string;
  propertyId: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface Property {
  id: string;
  name: string;
}

interface PipelineFiltersProps {
  filters: PipelineFiltersState;
  onFiltersChange: (filters: PipelineFiltersState) => void;
  properties: Property[];
}

const DATE_PRESETS = [
  { label: 'Hoje', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Ontem', getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: 'Últimos 7 dias', getValue: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: 'Últimos 15 dias', getValue: () => ({ from: startOfDay(subDays(new Date(), 14)), to: endOfDay(new Date()) }) },
  { label: 'Mês Atual', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Mês Passado', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Trimestre Passado', getValue: () => ({ from: startOfQuarter(subQuarters(new Date(), 1)), to: endOfQuarter(subQuarters(new Date(), 1)) }) },
  { label: 'Semestre Passado', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 6)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Ano Atual', getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  { label: 'Ano Anterior', getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) }) },
  { label: 'Período Máximo', getValue: () => ({ from: undefined, to: undefined }) },
];

export const PipelineFilters = ({
  filters,
  onFiltersChange,
  properties,
}: PipelineFiltersProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const updateFilter = <K extends keyof PipelineFiltersState>(
    key: K,
    value: PipelineFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      priority: '',
      temperature: '',
      origin: '',
      minValue: '',
      maxValue: '',
      propertyId: '',
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  const applyDatePreset = (preset: typeof DATE_PRESETS[0]) => {
    const { from, to } = preset.getValue();
    onFiltersChange({ ...filters, dateFrom: from, dateTo: to });
  };

  const hasActiveFilters =
    filters.priority ||
    filters.temperature ||
    filters.origin ||
    filters.minValue ||
    filters.maxValue ||
    filters.propertyId ||
    filters.dateFrom ||
    filters.dateTo;

  const activeFiltersCount = [
    filters.priority,
    filters.temperature,
    filters.origin,
    filters.minValue,
    filters.maxValue,
    filters.propertyId,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  // Origin options for filter
  const originOptions = [
    { value: 'website', label: 'Site' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'portal', label: 'Portal' },
    { value: 'referral', label: 'Indicação' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'zap', label: 'ZAP Imóveis' },
    { value: 'olx', label: 'OLX' },
    { value: 'vivareal', label: 'VivaReal' },
    { value: 'phone', label: 'Telefone' },
    { value: 'walk_in', label: 'Presencial' },
  ];

  const FiltersContent = () => (
    <>
      {/* Priority Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Prioridade</label>
        <Select
          value={filters.priority}
          onValueChange={(value) => updateFilter('priority', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas as prioridades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Temperature Filter - Lead Temperature */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Temperatura do Lead</label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={filters.temperature === '' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => updateFilter('temperature', '')}
            className="text-xs"
          >
            Todos
          </Button>
          <Button
            type="button"
            variant={filters.temperature === 'hot' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('temperature', 'hot')}
            className={cn(
              "text-xs gap-1",
              filters.temperature === 'hot' && "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            <Flame className="h-3 w-3" />
            Quente
          </Button>
          <Button
            type="button"
            variant={filters.temperature === 'warm' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('temperature', 'warm')}
            className={cn(
              "text-xs gap-1",
              filters.temperature === 'warm' && "bg-amber-500 hover:bg-amber-600"
            )}
          >
            <Thermometer className="h-3 w-3" />
            Morno
          </Button>
          <Button
            type="button"
            variant={filters.temperature === 'cold' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('temperature', 'cold')}
            className={cn(
              "text-xs gap-1",
              filters.temperature === 'cold' && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <Snowflake className="h-3 w-3" />
            Frio
          </Button>
        </div>
      </div>

      {/* Origin Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Origem do Lead</label>
        <Select
          value={filters.origin}
          onValueChange={(value) => updateFilter('origin', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas as origens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {originOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Empreendimento</label>
        <Select
          value={filters.propertyId}
          onValueChange={(value) => updateFilter('propertyId', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos os empreendimentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filter with Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Data de criação</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !filters.dateFrom && !filters.dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom || filters.dateTo ? (
                <>
                  {filters.dateFrom ? format(filters.dateFrom, 'dd/MM/yy', { locale: ptBR }) : '...'}
                  {' - '}
                  {filters.dateTo ? format(filters.dateTo, 'dd/MM/yy', { locale: ptBR }) : '...'}
                </>
              ) : (
                'Selecionar período'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col sm:flex-row">
              {/* Presets sidebar */}
              <div className="border-b sm:border-b-0 sm:border-r p-2 space-y-1 min-w-[150px]">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Atalhos</p>
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                    onClick={() => applyDatePreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              
              {/* Calendar pickers */}
              <div className="flex flex-col sm:flex-row">
                <div className="p-3 border-b sm:border-b-0 sm:border-r">
                  <p className="text-sm font-medium mb-2">De</p>
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => updateFilter('dateFrom', date)}
                    locale={ptBR}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium mb-2">Até</p>
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => updateFilter('dateTo', date)}
                    locale={ptBR}
                    disabled={(date) =>
                      filters.dateFrom ? date < filters.dateFrom : false
                    }
                    className="pointer-events-auto"
                  />
                </div>
              </div>
            </div>
            {(filters.dateFrom || filters.dateTo) && (
              <div className="p-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    updateFilter('dateFrom', undefined);
                    updateFilter('dateTo', undefined);
                  }}
                >
                  Limpar datas
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Value Range */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Faixa de valor</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Valor mín"
            value={filters.minValue}
            onChange={(e) => updateFilter('minValue', e.target.value)}
            className="w-full"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Valor máx"
            value={filters.maxValue}
            onChange={(e) => updateFilter('maxValue', e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 w-full">
          <X className="h-4 w-4" />
          Limpar Filtros
          <Badge variant="secondary" className="ml-1">
            {activeFiltersCount}
          </Badge>
        </Button>
      )}
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Search - always visible */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, lead, email, telefone ou imóvel..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Temperature quick filters - visible on larger screens */}
        <div className="hidden lg:flex items-center gap-1">
          <Button
            type="button"
            variant={filters.temperature === 'hot' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('temperature', filters.temperature === 'hot' ? '' : 'hot')}
            className={cn(
              "gap-1",
              filters.temperature === 'hot' && "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            <Flame className="h-3 w-3" />
            Quente
          </Button>
          <Button
            type="button"
            variant={filters.temperature === 'warm' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('temperature', filters.temperature === 'warm' ? '' : 'warm')}
            className={cn(
              "gap-1",
              filters.temperature === 'warm' && "bg-amber-500 hover:bg-amber-600"
            )}
          >
            <Thermometer className="h-3 w-3" />
            Morno
          </Button>
          <Button
            type="button"
            variant={filters.temperature === 'cold' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('temperature', filters.temperature === 'cold' ? '' : 'cold')}
            className={cn(
              "gap-1",
              filters.temperature === 'cold' && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <Snowflake className="h-3 w-3" />
            Frio
          </Button>
        </div>

        {/* Filter Sheet */}
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
            <div className="mt-6 space-y-4">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
