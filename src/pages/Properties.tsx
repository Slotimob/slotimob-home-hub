import { PropertyImage } from '@/components/ui/PropertyImage';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, MapPin, Package, Upload, Percent, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditPropertyDialog } from '@/components/EditPropertyDialog';
import { AppLayout } from '@/components/AppLayout';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { CreatePropertyDialog } from '@/components/CreatePropertyDialog';
import { ImportUnitsDialog } from '@/components/ImportUnitsDialog';
import { ActionToolbar } from '@/components/ActionToolbar';
import { AddAssetButton } from '@/components/units/AddAssetButton';
import { PropertiesTableView } from '@/components/properties/PropertiesTableView';
import { ViewModeTabs } from '@/components/ui/view-mode-tabs';
import { usePropertyUnitsCount } from '@/hooks/usePropertyUnitsCount';

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

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Mais Recentes' },
  { value: 'name', label: 'Nome (A-Z)' },
  { value: 'total_units', label: 'Mais Unidades' },
  { value: 'commission_rate', label: 'Maior Comissão' },
];

const Properties = () => {
  const { user, loading } = useAuth();
  const { isOwner, hasPermission } = usePermissions();
  const canCreate = isOwner || hasPermission('assets_properties', 'create');
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Property[];
    },
    enabled: !!user,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Get property IDs for dynamic unit count
  const propertyIds = useMemo(() => properties.map(p => p.id), [properties]);
  const { counts: unitCounts } = usePropertyUnitsCount(propertyIds);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Helper to get unit count for a property
  const getUnitCount = (propertyId: string) => unitCounts[propertyId] || 0;

  const getSortedProperties = () => {
    // First filter by search term
    const filtered = properties.filter((property) =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Then sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'total_units':
          return getUnitCount(b.id) - getUnitCount(a.id);
        case 'commission_rate':
          return (b.commission_rate ?? 5) - (a.commission_rate ?? 5);
        case 'created_at':
        default:
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      }
    });
  };

  if (loading || loadingProperties) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <AppLayout
      title="Empreendimentos"
      titleExtra={<HelpTooltip featureKey="assets.properties" />}
      headerActions={
        <div className="flex items-center gap-1 sm:gap-1.5">
          {canCreate && (
            <>
              <Button size="sm" className="h-8 sm:h-9 px-2 sm:px-3" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline md:ml-2">Novo Empreendimento</span>
              </Button>
              <AddAssetButton
                variant="outline"
                showIcon={true}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['properties'] })}
              />
              <Button variant="outline" size="sm" className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3" onClick={() => setIsImportOpen(true)}>
                <Upload className="h-4 w-4" />
                <span className="hidden lg:inline lg:ml-2">Importar</span>
              </Button>
            </>
          )}
        </div>
      }
    >
      <CreatePropertyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['properties'] })}
      />
      
      <div className="space-y-6">
        {/* Action Toolbar */}
        <ActionToolbar
          searchPlaceholder="Buscar empreendimentos..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          sortOptions={SORT_OPTIONS}
          sortValue={sortBy}
          onSortChange={setSortBy}
          viewModeSlot={
            <ViewModeTabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as 'grid' | 'table')}
              showKanban={false}
              showTable={true}
            />
          }
        />

        {/* Properties View */}
        {properties.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Nenhum empreendimento cadastrado</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comece criando seu primeiro empreendimento
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Empreendimento
              </Button>
            </CardContent>
          </Card>
        ) : getSortedProperties().length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Nenhum empreendimento encontrado</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Tente buscar com outros termos
              </p>
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Limpar busca
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <PropertiesTableView
            properties={getSortedProperties()}
            unitCounts={unitCounts}
            onPropertyClick={(property) => {
              setSelectedProperty(property);
              setIsEditDialogOpen(true);
            }}
            onManageUnits={(propertyId) => navigate(`/units?propertyId=${propertyId}`)}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {getSortedProperties().map((property) => (
              <Card 
                key={property.id} 
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedProperty(property);
                  setIsEditDialogOpen(true);
                }}
              >
                {/* Thumbnail */}
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                  <PropertyImage
                    src={property.image_url}
                    alt={property.name ?? 'Imóvel'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start gap-2">
                    <span className="line-clamp-1">{property.name}</span>
                  </CardTitle>
                  {property.description && (
                    <CardDescription className="line-clamp-2">{property.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {(property.city || property.state) && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">
                        {property.city && property.state
                          ? `${property.city} - ${property.state}`
                          : property.city || property.state}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{getUnitCount(property.id)} unidades</span>
                    </div>
                    <div className={`flex items-center gap-1 ${(property.commission_rate ?? 5) >= 6 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      {(property.commission_rate ?? 5) >= 6 && (
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                      )}
                      <Percent className="h-3.5 w-3.5" />
                      <span className="text-sm font-medium">{property.commission_rate ?? 5}%</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/units?propertyId=${property.id}`);
                    }}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Gerenciar Unidades
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedProperty && (
        <EditPropertyDialog
          property={selectedProperty}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            setSelectedProperty(null);
          }}
        />
      )}

      <ImportUnitsDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['properties'] })}
      />
    </AppLayout>
  );
};

export default Properties;
