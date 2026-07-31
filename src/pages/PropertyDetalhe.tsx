import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  ClipboardList,
  Settings2,
  Wallet,
  Trash2,
  Copy,
  Building2,
} from 'lucide-react';

import { AppLayout } from '@/components/AppLayout';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { AssetActivityTimeline } from '@/components/assets/AssetActivityTimeline';
import { AssetFinancialPanel } from '@/components/assets/AssetFinancialPanel';
import { PropertyForm, PropertyPayload, PropertyFormData } from '@/components/properties/PropertyForm';

import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useAssetActions } from '@/hooks/useAssetActions';
import { supabase } from '@/integrations/supabase/client';

interface Property {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  neighborhood?: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  image_url?: string | null;
  commission_rate?: number | null;
  lead_id?: string | null;
  builder_name?: string | null;
  construction_stage?: string | null;
  delivery_date?: string | null;
  total_land_area?: number | null;
  number_of_towers?: number | null;
  total_units_count?: number | null;
  amenities?: string[] | null;
  security_features?: string | null;
  sustainability_features?: string | null;
  technology_features?: string | null;
  gallery_images?: string[] | null;
  intent_type?: 'sale' | 'rental' | 'both' | null;
  is_under_management?: boolean | null;
  market_value?: number | null;
  rental_value?: number | null;
  is_occupied?: boolean | null;
}

const propertyToFormData = (prop: Partial<Property>): PropertyFormData => ({
  name: prop.name || '',
  description: prop.description || '',
  address: prop.address || '',
  neighborhood: prop.neighborhood || '',
  city: prop.city || '',
  state: prop.state || '',
  postal_code: prop.postal_code || '',
  image_url: prop.image_url || null,
  commission_rate: prop.commission_rate ?? 5,
  lead_id: prop.lead_id || null,
  builder_name: prop.builder_name || '',
  construction_stage: prop.construction_stage || '',
  delivery_date: prop.delivery_date || '',
  total_land_area: prop.total_land_area?.toString() || '',
  number_of_towers: prop.number_of_towers?.toString() || '',
  total_units_count: prop.total_units_count?.toString() || '',
  amenities: prop.amenities || [],
  security_features: prop.security_features || '',
  sustainability_features: prop.sustainability_features || '',
  technology_features: prop.technology_features || '',
  gallery_images: prop.gallery_images || [],
  intent_type: prop.intent_type || 'sale',
  is_under_management: prop.is_under_management ?? false,
  market_value: prop.market_value?.toString() || '',
  rental_value: prop.rental_value?.toString() || '',
  is_occupied: prop.is_occupied ?? false,
});

export default function PropertyDetalhe() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') ?? undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOwner, hasPermission } = usePermissions();

  const canEdit = isOwner || hasPermission('assets_properties', 'edit');
  const canDelete = isOwner || hasPermission('assets_properties', 'delete');
  const canDuplicate = isOwner || hasPermission('assets_properties', 'create');

  const [activeTab, setActiveTab] = useState<string>('details');
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [freshProperty, setFreshProperty] = useState<Property | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchProperty = useCallback(async () => {
    if (!id) {
      setLoadingProperty(false);
      setLoadError(true);
      return;
    }

    setLoadingProperty(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setFreshProperty(data as Property);
      setLoadError(false);
    } catch (error: any) {
      console.error('Error fetching property:', error);
      setLoadError(true);
    } finally {
      setLoadingProperty(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  const currentProperty = freshProperty;

  const draftKey = `edit-property-${id ?? 'none'}`;
  const { data: formData, setData: setFormData, clearDraft, hasDraft, discardDraft } = useFormDraft({
    key: draftKey,
    initialData: propertyToFormData(currentProperty ?? {}),
    enabled: !!currentProperty,
  });

  useEffect(() => {
    if (freshProperty && !hasDraft) {
      setFormData(propertyToFormData(freshProperty));
    }
  }, [freshProperty, hasDraft, setFormData]);

  const invalidate = () => {
    try {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    } catch {}
  };

  const handleSubmit = async (payload: PropertyPayload) => {
    if (!id) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      invalidate();
      clearDraft();

      toast({
        title: 'Empreendimento atualizado!',
        description: 'As informações foram salvas com sucesso.',
      });

      navigate('/properties');
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar empreendimento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const { duplicateProperty, deleteProperty } = useAssetActions();
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!id) return;
    setDuplicating(true);
    const newProperty = await duplicateProperty(id);
    setDuplicating(false);
    if (newProperty) {
      invalidate();
      navigate(`/properties?id=${newProperty.id}`);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = await deleteProperty(id);
    if (ok) {
      invalidate();
      clearDraft();
      toast({
        title: 'Empreendimento excluído!',
        description: 'O empreendimento foi removido com sucesso.',
      });
      navigate('/properties');
    }
    setShowDeleteDialog(false);
  };

  const handleCancel = () => {
    clearDraft();
    navigate('/properties');
  };

  const handleRefreshProperty = async () => {
    await fetchProperty();
  };

  const handleDiscardDraft = () => {
    discardDraft();
    if (freshProperty) {
      setFormData(propertyToFormData(freshProperty));
    }
  };

  if (loadingProperty && !freshProperty) {
    return (
      <AppLayout title="Detalhe do Empreendimento">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!id || loadError || !currentProperty) {
    return (
      <AppLayout title="Detalhe do Empreendimento">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="py-10 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Empreendimento não encontrado.</p>
            <Button variant="outline" onClick={() => navigate('/properties')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para a lista
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Detalhe do Empreendimento">
      <SEOHead
        title="Detalhe do Empreendimento"
        description={`Detalhes de ${currentProperty.name}`}
        path={`/properties?id=${id}`}
        noIndex
      />

      {/* Header */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 text-muted-foreground"
            onClick={() => navigate('/properties')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Empreendimentos
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">{currentProperty.name}</h2>
                <p className="text-sm text-muted-foreground truncate">
                  {canEdit
                    ? 'Edite informações, infraestrutura, galeria e documentos'
                    : 'Visualização somente leitura'}
                </p>
              </div>
            </div>

            {(canDuplicate || canDelete) && (
              <div className="flex items-center gap-2 flex-wrap">
                {canDuplicate && (
                  <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating}>
                    <Copy className="h-4 w-4 mr-1" />
                    {duplicating ? 'Duplicando...' : 'Duplicar'}
                  </Button>
                )}
                {canDelete && (
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details" className="text-xs sm:text-sm">
            <Settings2 className="h-4 w-4 mr-1.5" />
            Detalhes
          </TabsTrigger>
          <TabsTrigger value="financial" className="text-xs sm:text-sm">
            <Wallet className="h-4 w-4 mr-1.5" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="activities" className="text-xs sm:text-sm">
            <ClipboardList className="h-4 w-4 mr-1.5" />
            Atividades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          {/* Draft recovery notice */}
          {hasDraft && !loadingProperty && (
            <Alert className="border-amber-500/50 bg-amber-500/10 mb-4">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm">Rascunho recuperado. Você tinha alterações não salvas.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscardDraft}
                  className="ml-2 h-7 text-xs"
                >
                  Descartar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {loadingProperty ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PropertyForm
              key={`${currentProperty.id}-${freshProperty?.gallery_images?.length || 0}`}
              initialData={formData}
              isEditing={true}
              onSubmit={canEdit ? handleSubmit : (undefined as any)}
              onCancel={handleCancel}
              onDelete={canDelete ? () => setShowDeleteDialog(true) : undefined}
              isSubmitting={saving}
              propertyId={currentProperty.id}
              onRefreshProperty={handleRefreshProperty}
              onFormChange={setFormData}
              disabled={!canEdit}
            />
          )}
        </TabsContent>

        <TabsContent value="financial" className="mt-4">
          <AssetFinancialPanel
            assetType="property"
            assetId={currentProperty.id}
            currentMarketValue={currentProperty.market_value}
            disabled={!canEdit}
          />
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          {user && (
            <AssetActivityTimeline
              assetType="property"
              assetId={currentProperty.id}
              brokerId={user.id}
            />
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o empreendimento "{currentProperty.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
