import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Upload, X, ChevronLeft, ChevronRight, CheckSquare, Square, Plus, Share2, RefreshCw } from 'lucide-react';
import { HeaderButton } from '@/components/ui/header-button';
import { useToast } from '@/hooks/use-toast';
import { CreateUnitDialog } from '@/components/CreateUnitDialog';
import { UnitDetailsDialog } from '@/components/UnitDetailsDialog';
import { ImportUnitsDialog } from '@/components/ImportUnitsDialog';
import { ExportUnitsButton } from '@/components/ExportUnitsButton';
import { UnitsBulkActionsBar } from '@/components/UnitsBulkActionsBar';
import { UnitsKanbanView } from '@/components/UnitsKanbanView';
import { UnitsTableView } from '@/components/units/UnitsTableView';
import { AppLayout } from '@/components/AppLayout';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Badge } from '@/components/ui/badge';
import { ViewModeTabs, type ViewMode } from '@/components/ui/view-mode-tabs';
import { UnitsFilters, type UnitsFiltersState, type ManagementFilter } from '@/components/UnitsFilters';
import { ActionToolbar } from '@/components/ActionToolbar';
import { AddAssetButton } from '@/components/units/AddAssetButton';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Database } from '@/integrations/supabase/types';

type UnitStatus = Database['public']['Enums']['unit_status'];

type SortOption = 'unit_number_asc' | 'unit_number_desc' | 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'created_at_asc' | 'created_at_desc';

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96];
const DEFAULT_ITEMS_PER_PAGE = 12;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'unit_number_asc', label: 'Número (A-Z)' },
  { value: 'unit_number_desc', label: 'Número (Z-A)' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'area_asc', label: 'Menor área' },
  { value: 'area_desc', label: 'Maior área' },
  { value: 'created_at_desc', label: 'Mais recentes' },
  { value: 'created_at_asc', label: 'Mais antigos' },
];

export interface Unit {
  id: string;
  property_id: string | null;
  unit_number: string;
  status: UnitStatus;
  price: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  iptu: number | null;
  condo_fee: number | null;
  cover_image_url: string | null;
  created_at: string;
  // New fields for asset intelligence (optional since they come from DB)
  intent_type?: string | null;
  is_managed?: boolean | null;
  is_occupied?: boolean | null;
  market_value?: number | null;
  rent_price?: number | null;
  is_standalone?: boolean | null;
  property?: {
    id: string;
    name: string;
    commission_rate?: number | null;
  };
}

interface Property {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  commission_rate?: number | null;
}

const initialFilters: UnitsFiltersState = {
  status: [],
  priceMin: '',
  priceMax: '',
  bedrooms: '',
  areaMin: '',
  areaMax: '',
  management: 'all',
};

import { UNIT_STATUS_STYLES, ALL_UNIT_STATUSES } from '@/utils/uiConstants';

const Units = () => {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  const { user, loading } = useAuth();
  const { isOwner, hasPermission } = usePermissions();
  const canCreate = isOwner || hasPermission('assets_units', 'create');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<UnitsFiltersState>(initialFilters);
  const [sortBy, setSortBy] = useState<SortOption>('unit_number_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('units-view-mode');
    return (saved === 'grid' || saved === 'kanban' || saved === 'table') ? saved : 'table';
  });

  // Persist view mode preference
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('units-view-mode', mode);
  }, []);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.bedrooms) count++;
    if (filters.areaMin || filters.areaMax) count++;
    if (filters.management !== 'all') count++;
    return count;
  }, [filters]);

  // Apply filters and sorting
  const filteredUnits = useMemo(() => {
    const filtered = units.filter((unit: any) => {
      // Search term filter
      if (searchTerm) {
        const matchesSearch = 
          unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          unit.property?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
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
  }, [units, searchTerm, filters, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUnits.length / itemsPerPage);
  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUnits.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUnits, currentPage, itemsPerPage]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, sortBy, itemsPerPage]);

  const clearFilters = () => {
    setFilters(initialFilters);
    setSearchTerm('');
    setSortBy('unit_number_asc');
    setCurrentPage(1);
  };


  // Selection functions
  const toggleUnitSelection = useCallback((unitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUnits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedUnits.size === paginatedUnits.length) {
      setSelectedUnits(new Set());
    } else {
      setSelectedUnits(new Set(paginatedUnits.map(u => u.id)));
    }
  }, [paginatedUnits, selectedUnits.size]);

  const clearSelection = useCallback(() => {
    setSelectedUnits(new Set());
    setIsSelectMode(false);
  }, []);

  const getSelectedUnitsData = useCallback(() => {
    return units.filter(u => selectedUnits.has(u.id));
  }, [units, selectedUnits]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const isAllUnitsView = !propertyId;

  useEffect(() => {
    if (user) {
      if (propertyId) {
        loadProperty();
        loadUnitsForProperty();
      } else {
        loadAllUnits();
        loadAllProperties();
      }
    }
  }, [user, propertyId]);

  const loadProperty = async () => {
    if (!propertyId) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, city, state')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar empreendimento',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/properties');
    }
  };

  const loadUnitsForProperty = async () => {
    if (!propertyId) return;

    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', propertyId)
        .order('unit_number', { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar unidades',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadAllUnits = async () => {
    try {
      // Only load units that are NOT standalone (is_standalone = false or null)
      const { data, error } = await supabase
        .from('units')
        .select('*, property:properties(id, name, commission_rate)')
        .or('is_standalone.is.null,is_standalone.eq.false')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnits(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar unidades',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadAllProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, city, state, commission_rate')
        .order('name', { ascending: true });

      if (error) throw error;
      setAllProperties(data || []);
    } catch (error: any) {
      console.error('Error loading properties:', error);
    }
  };

  const reloadUnits = () => {
    if (propertyId) {
      loadUnitsForProperty();
    } else {
      loadAllUnits();
    }
  };

  if (loading || loadingUnits || (!isAllUnitsView && !property)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const stats = {
    total: units.length,
    available: units.filter((u) => u.status === 'available').length,
    reserved: units.filter((u) => u.status === 'reserved').length,
    rented: units.filter((u) => u.status === 'rented').length,
    sold: units.filter((u) => u.status === 'sold').length,
  };

  return (
    <AppLayout
      title={isAllUnitsView ? 'Unidades' : property?.name || 'Unidades'}
      titleExtra={<HelpTooltip featureKey="assets.units" />}
      headerActions={
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Primary: Nova Unidade */}
          {canCreate && (
          <AddAssetButton
            propertyId={propertyId || undefined}
            variant="default"
            size="sm"
            onSuccess={reloadUnits}
          />
          )}
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
            units={units} 
            propertyName={isAllUnitsView ? "todas_unidades" : property?.name || 'unidades'} 
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
        <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              filters.status.length === 0 ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setFilters(prev => ({ ...prev, status: [] }))}
          >
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
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
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.available}</div>
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
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Reservadas</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.reserved}</div>
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
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Alugadas</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.rented}</div>
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
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">Vendidas</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.sold}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters Toolbar */}
        <ActionToolbar
          searchPlaceholder={isAllUnitsView ? "Buscar por unidade ou empreendimento..." : "Buscar por número da unidade..."}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          sortOptions={SORT_OPTIONS}
          sortValue={sortBy}
          onSortChange={(value) => setSortBy(value as SortOption)}
          filterSlot={
            <div className="flex items-center gap-2">
              <UnitsFilters filters={filters} onFiltersChange={setFilters} />
              {(activeFiltersCount > 0 || searchTerm) && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Limpar filtros">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          }
          viewModeSlot={
            <div className="flex items-center gap-3">
              <ViewModeTabs value={viewMode} onValueChange={handleViewModeChange} showTable={true} />
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setLoadingUnits(true); reloadUnits(); }} title="Atualizar lista">
                <RefreshCw className="h-4 w-4" />
              </Button>
              {/* Active Filters Summary Badges */}
              {activeFiltersCount > 0 && (
                <div className="hidden sm:flex items-center gap-1">
                  {filters.status.length > 0 && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Status: {filters.status.length}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setFilters(prev => ({ ...prev, status: [] }))}
                      />
                    </Badge>
                  )}
                  {(filters.priceMin || filters.priceMax) && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Preço
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setFilters(prev => ({ ...prev, priceMin: '', priceMax: '' }))}
                      />
                    </Badge>
                  )}
                  {filters.bedrooms && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      {filters.bedrooms}q
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setFilters(prev => ({ ...prev, bedrooms: '' }))}
                      />
                    </Badge>
                  )}
                  {(filters.areaMin || filters.areaMax) && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Área
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setFilters(prev => ({ ...prev, areaMin: '', areaMax: '' }))}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          }
          actionsSlot={
            <div className="flex items-center gap-3">
              {/* Selection controls */}
              {filteredUnits.length > 0 && (
                <Button
                  variant={isSelectMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    if (isSelectMode) {
                      setSelectedUnits(new Set());
                    }
                  }}
                >
                  {isSelectMode ? (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Selecionar</span>
                    </>
                  )}
                </Button>
              )}
              {isSelectMode && paginatedUnits.length > 0 && (
                <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                  {selectedUnits.size === paginatedUnits.length ? (
                    <>
                      <Square className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Desmarcar</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Todos</span>
                    </>
                  )}
                </Button>
              )}
              
              {/* Results count */}
              <p className="text-sm text-muted-foreground hidden md:block">
                {filteredUnits.length === 0 
                  ? 'Nenhuma unidade'
                  : `${filteredUnits.length} ${filteredUnits.length === 1 ? 'unidade' : 'unidades'}`
                }
              </p>

              {/* Items per page - only in grid/table mode */}
              {(viewMode === 'grid' || viewMode === 'table') && filteredUnits.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">Por página:</span>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => setItemsPerPage(parseInt(value))}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          }
          className="mb-6"
        />

        {/* Units Display */}
        {filteredUnits.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <Home className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">
                {searchTerm || activeFiltersCount > 0 ? 'Nenhuma unidade encontrada' : 'Nenhuma unidade cadastrada'}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchTerm || activeFiltersCount > 0
                  ? 'Tente ajustar os filtros ou buscar com outros termos'
                  : isAllUnitsView 
                    ? 'Cadastre unidades através dos empreendimentos'
                    : 'Comece criando a primeira unidade deste empreendimento'}
              </p>
              {(searchTerm || activeFiltersCount > 0) && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
              {!searchTerm && activeFiltersCount === 0 && !isAllUnitsView && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Unidade
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'kanban' ? (
          <div key="kanban-view" className="animate-fade-in">
            <UnitsKanbanView
              units={filteredUnits}
              isAllUnitsView={isAllUnitsView}
              properties={allProperties}
              onUnitClick={setSelectedUnit}
              onSuccess={reloadUnits}
            />
          </div>
        ) : viewMode === 'table' ? (
          <div key="table-view" className="animate-fade-in">
            <UnitsTableView
              units={paginatedUnits}
              onUnitClick={setSelectedUnit}
              onShareClick={(unit) => {
                navigate(`/gestao/propostas?create=true&unitId=${unit.id}`);
              }}
              showProperty={isAllUnitsView}
            />
          </div>
        ) : (
          <div key="grid-view" className="animate-fade-in">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedUnits.map((unit, index) => (
                <Card
                  key={unit.id}
                  className={`cursor-pointer overflow-hidden transition-all hover:shadow-md animate-scale-in ${selectedUnits.has(unit.id) ? 'ring-2 ring-primary' : ''}`}
                  style={{ animationDelay: `${index * 25}ms` }}
                  onClick={() => isSelectMode ? toggleUnitSelection(unit.id, { stopPropagation: () => {} } as React.MouseEvent) : setSelectedUnit(unit)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-32 bg-muted">
                    {isSelectMode && (
                      <div 
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => toggleUnitSelection(unit.id, e)}
                      >
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedUnits.has(unit.id) 
                            ? 'bg-primary border-primary text-primary-foreground' 
                            : 'bg-background/80 border-muted-foreground/50'
                        }`}>
                          {selectedUnits.has(unit.id) && (
                            <CheckSquare className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    )}
                    <PropertyImage
                      src={unit.cover_image_url}
                      alt={`Unidade ${unit.unit_number}`}
                      className="w-full h-full object-cover"
                    />
                    <Badge 
                      className={`absolute top-2 right-2 ${UNIT_STATUS_STYLES[unit.status].badgeClasses}`}
                    >
                      {UNIT_STATUS_STYLES[unit.status].label}
                    </Badge>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">Unidade {unit.unit_number}</CardTitle>
                    </div>
                    {isAllUnitsView && unit.property && (
                      <Badge variant="outline" className="w-fit text-xs">
                        {unit.property.name}
                      </Badge>
                    )}
                    <CardDescription className="space-y-1">
                      {unit.bedrooms !== null && unit.bathrooms !== null && (
                        <span className="block text-xs">
                          {unit.bedrooms} quarto{unit.bedrooms !== 1 ? 's' : ''} • {unit.bathrooms} banheiro
                          {unit.bathrooms !== 1 ? 's' : ''}
                        </span>
                      )}
                      {unit.area && <span className="block text-xs">{unit.area}m²</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {unit.price && (
                      <div className="text-lg font-bold text-primary">
                        R$ {unit.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {unit.condo_fee && (
                        <div>Condomínio: R$ {unit.condo_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      )}
                      {unit.iptu && (
                        <div>IPTU: R$ {unit.iptu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pagination Controls - only show in grid/table mode */}
        {(viewMode === 'grid' || viewMode === 'table') && totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              Primeira
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className="w-9"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Última
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <UnitsBulkActionsBar
        selectedUnits={getSelectedUnitsData()}
        onClearSelection={clearSelection}
        onSuccess={reloadUnits}
      />

      {isAllUnitsView ? (
        <>
          <CreateUnitDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onSuccess={reloadUnits}
          />

          {selectedUnit && (
            <UnitDetailsDialog
              unit={selectedUnit}
              propertyName={selectedUnit.property?.name || 'Empreendimento'}
              open={!!selectedUnit}
              onOpenChange={(open) => !open && setSelectedUnit(null)}
              onSuccess={reloadUnits}
            />
          )}

          <ImportUnitsDialog
            propertyId={undefined}
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
            onSuccess={reloadUnits}
          />

          {/* ShareAssetDialog replaced by Proposals deep-link */}
        </>
      ) : (
        propertyId && (
          <>
            <CreateUnitDialog
              propertyId={propertyId}
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
              onSuccess={reloadUnits}
            />

            {selectedUnit && property && (
              <UnitDetailsDialog
                unit={selectedUnit}
                propertyName={property.name}
                open={!!selectedUnit}
                onOpenChange={(open) => !open && setSelectedUnit(null)}
                onSuccess={reloadUnits}
              />
            )}

            <ImportUnitsDialog
              propertyId={propertyId}
              open={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
              onSuccess={reloadUnits}
            />

            {/* ShareAssetDialog replaced by Proposals deep-link */}
          </>
        )
      )}
    </AppLayout>
  );
};

export default Units;
