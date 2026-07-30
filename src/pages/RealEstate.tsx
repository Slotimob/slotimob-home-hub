import { PropertyImage } from '@/components/ui/PropertyImage';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/subscription/PermissionGate';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Wallet, Bed, Bath, Car, Square, Upload, Share2, Eye, RefreshCw } from 'lucide-react';
import { HeaderButton } from '@/components/ui/header-button';
import { useToast } from '@/hooks/use-toast';
import { ImportUnitsDialog } from '@/components/ImportUnitsDialog';
import { ExportUnitsButton } from '@/components/ExportUnitsButton';
import { EditUnitDialog } from '@/components/units/EditUnitDialog';
import { UnitsFilters, type UnitsFiltersState } from '@/components/UnitsFilters';

import { SEOHead } from '@/components/SEOHead';
import { TagsFilter } from '@/components/units/TagsFilter';
import { getTagColor } from '@/components/units/TagsInput';
import { ActionToolbar } from '@/components/ActionToolbar';
import { ViewModeTabs, type ViewMode } from '@/components/ui/view-mode-tabs';
import { AddAssetButton } from '@/components/units/AddAssetButton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

import { RealEstateKanbanView } from '@/components/units/RealEstateKanbanView';

interface RealEstateUnit {
  id: string;
  unit_number: string;
  property_type: string | null;
  condition: string | null;
  price: number | null;
  rent_price: number | null;
  area: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  furnished: string | null;
  solar_orientation: string | null;
  status: 'available' | 'reserved' | 'rented' | 'sold';
  cover_image_url: string | null;
  is_standalone: boolean;
  is_financeable: boolean | null;
  owner_id: string | null;
  property_id: string | null;
  condo_fee: number | null;
  iptu: number | null;
  description: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  created_at: string;
  tags: string[] | null;
  gallery_images?: string[] | null;
  is_managed?: boolean;
  registration_number?: string | null;
  has_no_registration?: boolean | null;
  iptu_number?: string | null;
  lead_id?: string | null;
  owner?: {
    name: string;
  } | null;
  property?: {
    name: string;
  } | null;
}

type SortOption = 'unit_number_asc' | 'unit_number_desc' | 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'created_at_desc' | 'created_at_asc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'unit_number_asc', label: 'Nome (A-Z)' },
  { value: 'unit_number_desc', label: 'Nome (Z-A)' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'area_asc', label: 'Menor área' },
  { value: 'area_desc', label: 'Maior área' },
  { value: 'created_at_desc', label: 'Mais recentes' },
  { value: 'created_at_asc', label: 'Mais antigos' },
];

const initialFilters: UnitsFiltersState = {
  status: [],
  priceMin: '',
  priceMax: '',
  bedrooms: '',
  areaMin: '',
  areaMax: '',
  management: 'all',
};

import { UNIT_STATUS_STYLES, PROPERTY_TYPE_LABELS } from '@/utils/uiConstants';

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  rented: 'Alugado',
  sold: 'Vendido',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  sala_comercial: 'Sala Comercial',
  loja: 'Loja',
  galpao: 'Galpão',
  rural: 'Rural',
  outros: 'Outros',
};

const CONDITION_LABELS: Record<string, string> = {
  construcao: 'Em Construção',
  na_planta: 'Na Planta',
  novo: 'Novo',
  usado: 'Usado',
};

const RealEstate = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<UnitsFiltersState>(initialFilters);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('created_at_desc');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const [selectedUnit, setSelectedUnit] = useState<RealEstateUnit | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('real-estate-view-mode');
    return (saved === 'grid' || saved === 'table' || saved === 'kanban') ? saved : 'table';
  });
  const isMobile = useIsMobile();

  const queryClient = useQueryClient();

  const { data: realEstateUnits = [], isLoading } = useQuery({
    queryKey: ['units', 'standalone'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          owner:owners(name)
        `)
        .eq('is_standalone', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RealEstateUnit[];
    },
    enabled: !!user,
  });

  const reloadRealEstateUnits = () => {
    queryClient.invalidateQueries({ queryKey: ['units'] });
  };

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('real-estate-view-mode', mode);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);


  // Apply filters and sorting
  const filteredUnits = useMemo(() => {
    const filtered = realEstateUnits.filter((unit: any) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          unit.unit_number.toLowerCase().includes(searchLower) ||
          (unit.property_type && PROPERTY_TYPE_LABELS[unit.property_type]?.toLowerCase().includes(searchLower)) ||
          (unit.address && unit.address.toLowerCase().includes(searchLower)) ||
          (unit.neighborhood && unit.neighborhood.toLowerCase().includes(searchLower)) ||
          (unit.city && unit.city.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Tags filter
      if (selectedTags.length > 0) {
        if (!unit.tags || !Array.isArray(unit.tags)) return false;
        const hasAllTags = selectedTags.every((tag) => unit.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      // Management filter
      if (filters.management === 'managed' && !unit.is_managed) {
        return false;
      }
      if (filters.management === 'not_managed' && unit.is_managed) {
        return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(unit.status)) {
        return false;
      }

      // Price filter
      const priceMin = filters.priceMin ? parseFloat(filters.priceMin) : null;
      const priceMax = filters.priceMax ? parseFloat(filters.priceMax) : null;
      if (priceMin !== null && (unit.price === null || unit.price < priceMin)) {
        return false;
      }
      if (priceMax !== null && (unit.price === null || unit.price > priceMax)) {
        return false;
      }

      // Bedrooms filter
      if (filters.bedrooms) {
        const bedroomsFilter = parseInt(filters.bedrooms);
        if (filters.bedrooms === '4+') {
          if (unit.bedrooms === null || unit.bedrooms < 4) return false;
        } else if (unit.bedrooms !== bedroomsFilter) {
          return false;
        }
      }

      // Area filter
      const areaMin = filters.areaMin ? parseFloat(filters.areaMin) : null;
      const areaMax = filters.areaMax ? parseFloat(filters.areaMax) : null;
      if (areaMin !== null && (unit.area === null || unit.area < areaMin)) {
        return false;
      }
      if (areaMax !== null && (unit.area === null || unit.area > areaMax)) {
        return false;
      }

      return true;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'unit_number_asc':
          return a.unit_number.localeCompare(b.unit_number, 'pt-BR', { numeric: true });
        case 'unit_number_desc':
          return b.unit_number.localeCompare(a.unit_number, 'pt-BR', { numeric: true });
        case 'price_asc':
          if (a.price === null) return 1;
          if (b.price === null) return -1;
          return a.price - b.price;
        case 'price_desc':
          if (a.price === null) return 1;
          if (b.price === null) return -1;
          return b.price - a.price;
        case 'area_asc':
          if (a.area === null) return 1;
          if (b.area === null) return -1;
          return a.area - b.area;
        case 'area_desc':
          if (a.area === null) return 1;
          if (b.area === null) return -1;
          return b.area - a.area;
        case 'created_at_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_at_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
  }, [realEstateUnits, searchTerm, filters, sortBy, selectedTags]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.bedrooms) count++;
    if (filters.areaMin || filters.areaMax) count++;
    if (filters.management !== 'all') count++;
    if (selectedTags.length > 0) count++;
    return count;
  }, [filters, selectedTags]);

  const clearFilters = () => {
    setFilters(initialFilters);
    setSearchTerm('');
    setSortBy('created_at_desc');
    setSelectedTags([]);
  };

  const stats = useMemo(() => ({
    total: realEstateUnits.length,
    available: realEstateUnits.filter((u) => u.status === 'available').length,
    reserved: realEstateUnits.filter((u) => u.status === 'reserved').length,
    rented: realEstateUnits.filter((u) => u.status === 'rented').length,
    sold: realEstateUnits.filter((u) => u.status === 'sold').length,
  }), [realEstateUnits]);

  // Prepare units for export (same interface as ExportUnitsButton expects)
  const unitsForExport = useMemo(() => {
    return filteredUnits.map(unit => ({
      unit_number: unit.unit_number,
      status: unit.status,
      price: unit.price,
      area: unit.area,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      condo_fee: unit.condo_fee,
    }));
  }, [filteredUnits]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Generate dynamic description for SEO
  const seoDescription = filteredUnits.length > 0
    ? `${filteredUnits.length} imóveis disponíveis. Encontre casas, apartamentos e mais.`
    : 'Gerencie seus imóveis avulsos - casas, apartamentos, terrenos e mais.';

  return (
    <>
      <SEOHead
        title="Imóveis Avulsos"
        description={seoDescription}
        path="/real-estate"
        noIndex={true}
      />
      <AppLayout 
        title="Imóveis Avulsos"
      titleExtra={<HelpTooltip featureKey="assets.standalone" />}
        headerActions={
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Primary: Novo Imóvel Avulso */}
            <PermissionGate permission="assets_standalone.create">
              <AddAssetButton
                standalone={true}
                variant="default"
                size="sm"
                onSuccess={reloadRealEstateUnits}
              />
            </PermissionGate>
            {/* Secondary: Compartilhar */}
            <HeaderButton 
              variant="outline" 
              iconOnly 
              showTextAt="lg" 
            icon={<Share2 className="h-4 w-4" />} 
            onClick={() => navigate('/gestao/propostas?create=true')}
          >
            Compartilhar
            </HeaderButton>
            {/* Tertiary: Exportar */}
            <ExportUnitsButton 
              units={unitsForExport} 
              propertyName="imoveis_avulsos" 
            />
            {/* Quaternary: Importar */}
            <HeaderButton 
              variant="outline" 
              iconOnly 
              showTextAt="xl" 
              icon={<Upload className="h-4 w-4" />} 
              onClick={() => setIsImportDialogOpen(true)}
            >
              Importar
            </HeaderButton>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Clickable Stats Cards for Quick Filtering */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                filters.status.length === 0 ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setFilters(prev => ({ ...prev, status: [] }))}
            >
              <CardContent className="pb-3 pt-3 px-3">
                <p className="text-xs font-medium text-muted-foreground">Total</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                filters.status.length === 1 && filters.status[0] === 'available' 
                  ? 'ring-2 ring-green-500 bg-green-500/5' 
                  : 'hover:bg-green-500/5'
              }`}
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                status: prev.status.length === 1 && prev.status[0] === 'available' ? [] : ['available'] 
              }))}
            >
              <CardContent className="pb-3 pt-3 px-3">
                <p className="text-xs font-medium text-muted-foreground">Disponível</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.available}</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                filters.status.length === 1 && filters.status[0] === 'reserved' 
                  ? 'ring-2 ring-yellow-500 bg-yellow-500/5' 
                  : 'hover:bg-yellow-500/5'
              }`}
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                status: prev.status.length === 1 && prev.status[0] === 'reserved' ? [] : ['reserved'] 
              }))}
            >
              <CardContent className="pb-3 pt-3 px-3">
                <p className="text-xs font-medium text-muted-foreground">Reservado</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.reserved}</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                filters.status.length === 1 && filters.status[0] === 'rented' 
                  ? 'ring-2 ring-blue-500 bg-blue-500/5' 
                  : 'hover:bg-blue-500/5'
              }`}
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                status: prev.status.length === 1 && prev.status[0] === 'rented' ? [] : ['rented'] 
              }))}
            >
              <CardContent className="pb-3 pt-3 px-3">
                <p className="text-xs font-medium text-muted-foreground">Alugado</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.rented}</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md col-span-2 sm:col-span-1 ${
                filters.status.length === 1 && filters.status[0] === 'sold' 
                  ? 'ring-2 ring-red-500 bg-red-500/5' 
                  : 'hover:bg-red-500/5'
              }`}
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                status: prev.status.length === 1 && prev.status[0] === 'sold' ? [] : ['sold'] 
              }))}
            >
              <CardContent className="pb-3 pt-3 px-3">
                <p className="text-xs font-medium text-muted-foreground">Vendido</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.sold}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters Toolbar - Using ActionToolbar for consistency */}
          <ActionToolbar
            searchPlaceholder="Buscar por nome, tipo, endereço ou bairro..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            sortOptions={SORT_OPTIONS}
            sortValue={sortBy}
            onSortChange={(value) => setSortBy(value as SortOption)}
            filterSlot={
              <>
                <UnitsFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                />
                <TagsFilter
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  standalone={true}
                />
              </>
            }
            viewModeSlot={
              <div className="flex items-center gap-3">
                <ViewModeTabs
                  value={viewMode}
                  onValueChange={handleViewModeChange}
                  showKanban={true}
                  showTable={true}
                />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => reloadRealEstateUnits()} title="Atualizar lista">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            }
          />

          {/* Real Estate Display */}
          {filteredUnits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Home className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum imóvel encontrado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || activeFiltersCount > 0 ? 'Tente ajustar sua busca ou filtros' : 'Comece cadastrando seu primeiro imóvel avulso'}
                </p>
                {!searchTerm && activeFiltersCount === 0 && (
                  <AddAssetButton
                    standalone={true}
                    variant="default"
                    onSuccess={reloadRealEstateUnits}
                  />
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'kanban' ? (
            <RealEstateKanbanView
              units={filteredUnits}
              onUnitClick={(unit) => setSelectedUnit(unit)}
              onSuccess={reloadRealEstateUnits}
            />
          ) : viewMode === 'table' ? (
            <TooltipProvider delayDuration={0}>
              <div className="rounded-lg border bg-card animate-fade-in overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[140px] sm:w-[180px]">Identificação</TableHead>
                      <TableHead className="w-[90px] sm:w-[100px]">Status</TableHead>
                      <TableHead className="hidden sm:table-cell w-[100px]">Tipo</TableHead>
                      <TableHead className="text-right w-[100px] sm:w-[120px]">Preço</TableHead>
                      <TableHead className="text-right w-[100px] sm:w-[120px]">Aluguel</TableHead>
                      <TableHead className="w-[80px] sm:w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnits.map((unit) => {
                      const shouldShowRent = unit.status === 'rented' || unit.rent_price;
                      return (
                        <TableRow 
                          key={unit.id} 
                          className="cursor-pointer"
                          onClick={() => setSelectedUnit(unit)}
                        >
                          <TableCell className="font-medium py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[120px] sm:max-w-[160px] text-sm">{unit.unit_number}</span>
                              {unit.area && (
                                <span className="text-xs text-muted-foreground">
                                  {unit.area} m²
                                  {unit.bedrooms !== null && ` • ${unit.bedrooms}q`}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 sm:py-4">
                            <Badge className={`text-[10px] px-1.5 sm:px-2 py-0.5 whitespace-nowrap ${UNIT_STATUS_STYLES[unit.status].badgeClasses}`}>
                              {STATUS_LABELS[unit.status]}
                            </Badge>
                          </TableCell>
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
                            {unit.price ? (
                              <span className="font-medium text-xs sm:text-sm">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                  maximumFractionDigits: 0,
                                }).format(unit.price)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-2 sm:py-4">
                            {shouldShowRent && unit.rent_price ? (
                              <span className="font-medium text-xs sm:text-sm text-blue-600">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                  maximumFractionDigits: 0,
                                }).format(unit.rent_price)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-2 sm:py-4">
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/gestao/propostas?create=true&unitId=${unit.id}`);
                                    }}
                                  >
                                    <Share2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                {!isMobile && (
                                  <TooltipContent>
                                    <p>Proposta</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUnit(unit);
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
              {filteredUnits.map((unit) => (
                <Card 
                  key={unit.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => setSelectedUnit(unit)}
                >
                  <div className="aspect-video bg-muted relative">
                    <PropertyImage
                      src={unit.cover_image_url}
                      alt={unit.unit_number ?? 'Imóvel'}
                      className="w-full h-full object-cover"
                    />
                    <Badge className={`absolute top-2 right-2 ${UNIT_STATUS_STYLES[unit.status].badgeClasses}`}>
                      {STATUS_LABELS[unit.status]}
                    </Badge>
                    {/* Share button overlay */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/gestao/propostas?create=true&unitId=${unit.id}`);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg truncate">{unit.unit_number}</h3>
                      {unit.property_type && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type}
                        </Badge>
                      )}
                    </div>
                    {unit.condition && (
                      <p className="text-sm text-muted-foreground">
                        {CONDITION_LABELS[unit.condition] || unit.condition}
                      </p>
                    )}
                    {unit.price && (
                      <div className="text-lg font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          maximumFractionDigits: 0,
                        }).format(unit.price)}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {unit.bedrooms !== null && (
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          <span>{unit.bedrooms}</span>
                        </div>
                      )}
                      {unit.bathrooms !== null && (
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          <span>{unit.bathrooms}</span>
                        </div>
                      )}
                      {unit.parking_spots !== null && unit.parking_spots > 0 && (
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          <span>{unit.parking_spots}</span>
                        </div>
                      )}
                      {unit.area && (
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4" />
                          <span>{unit.area} m²</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {unit.tags && unit.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {unit.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className={`${getTagColor(tag)} text-[10px] px-1.5 py-0`}
                          >
                            {tag}
                          </Badge>
                        ))}
                        {unit.tags.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            +{unit.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Location info */}
                    {(unit.neighborhood || unit.city) && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground truncate">
                          {unit.neighborhood}
                          {unit.neighborhood && unit.city && ', '}
                          {unit.city}
                          {unit.state && ` - ${unit.state}`}
                        </p>
                      </div>
                    )}

                    {unit.owner && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          Proprietário: <span className="font-medium">{unit.owner.name}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <ImportUnitsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onSuccess={reloadRealEstateUnits}
          standalone={true}
        />


        {selectedUnit && (
          <EditUnitDialog
            unit={selectedUnit as any}
            open={!!selectedUnit}
            onOpenChange={(open) => !open && setSelectedUnit(null)}
            onSuccess={reloadRealEstateUnits}
          />
        )}

        {/* ShareAssetDialog replaced by Proposals deep-link */}
      </AppLayout>
    </>
  );
};

export default RealEstate;
