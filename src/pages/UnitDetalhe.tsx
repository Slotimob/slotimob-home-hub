import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Info,
  Image,
  FileText,
  FileSignature,
  ClipboardList,
  Wallet,
  Trash2,
  Copy,
  Building2,
  Users,
  Layers,
} from 'lucide-react';

import { AppLayout } from '@/components/AppLayout';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { UnitFormFields, UnitFormData } from '@/components/units/UnitFormFields';
import { UnitGalleryUpload } from '@/components/units/UnitGalleryUpload';
import { AssetDocuments } from '@/components/assets/AssetDocuments';
import { TenantHistoryPanel } from '@/components/units/TenantHistoryPanel';
import { UnitContractTab } from '@/components/units/UnitContractTab';
import { UnitSubdivisionsPanel } from '@/components/units/UnitSubdivisionsPanel';
import { UnitSubdivisionSetupAlert } from '@/components/units/SubdivisionSetupAlert';

import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useAssetActions } from '@/hooks/useAssetActions';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { UNIT_STATUS_STYLES } from '@/utils/uiConstants';

const unitSchema = z.object({
  unit_number: z.string().min(1, 'Número da unidade é obrigatório').max(50),
  status: z.enum(['available', 'reserved', 'rented', 'sold']),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero').optional().nullable(),
  rent_price: z.number().min(0, 'Preço locação deve ser maior ou igual a zero').optional().nullable(),
  area: z.number().min(0, 'Área deve ser maior ou igual a zero').optional().nullable(),
  area_total: z.number().min(0, 'Área total deve ser maior ou igual a zero').optional().nullable(),
  bedrooms: z.number().int().min(0, 'Quartos deve ser >= 0').optional().nullable(),
  suites: z.number().int().min(0, 'Suítes deve ser >= 0').optional().nullable(),
  bathrooms: z.number().int().min(0, 'Banheiros deve ser >= 0').optional().nullable(),
  condo_fee: z.number().min(0, 'Condomínio deve ser >= 0').optional().nullable(),
  iptu: z.number().min(0, 'IPTU deve ser >= 0').optional().nullable(),
  parking_spots: z.number().int().min(0).optional().nullable(),
  property_type: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  furnished: z.string().optional().nullable(),
  solar_orientation: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  iptu_number: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
});

function mapUnitToFormData(u: any): UnitFormData {
  return {
    unit_number: u.unit_number || '',
    status: u.status || 'available',
    property_type: u.property_type || '',
    condition: u.condition || '',
    price: u.price?.toString() || '',
    rent_price: u.rent_price?.toString() || '',
    area: u.area?.toString() || '',
    area_total: u.area_total?.toString() || '',
    bedrooms: u.bedrooms?.toString() || '',
    suites: u.suites?.toString() || '',
    bathrooms: u.bathrooms?.toString() || '',
    parking_spots: u.parking_spots?.toString() || '',
    condo_fee: u.condo_fee?.toString() || '',
    iptu: u.iptu?.toString() || '',
    furnished: u.furnished || '',
    solar_orientation: u.solar_orientation || '',
    is_financeable: u.is_financeable ?? true,
    registration_number: u.registration_number || '',
    has_no_registration: u.has_no_registration ?? false,
    iptu_number: u.iptu_number || '',
    cib: u.cib || '',
    owner_contact_id: u.owner_contact_id || '',
    tenant_contact_id: u.tenant_contact_id || null,
    cover_image_url: u.cover_image_url || null,
    property_id: u.property_id || '',
    is_managed: u.is_managed ?? false,
    description: u.description || '',
    address: u.address || '',
    neighborhood: u.neighborhood || '',
    city: u.city || '',
    state: u.state || '',
    postal_code: u.postal_code || '',
    tags: u.tags || [],
    intent_type: u.intent_type || 'sale',
    market_value: u.market_value?.toString() || '',
    is_occupied: u.is_occupied ?? false,
    is_published_portal: u.is_published_portal ?? false,
    has_subdivisions: u.has_subdivisions ?? false,
  };
}

export default function UnitDetalhe() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') ?? undefined;
  const propertyIdParam = searchParams.get('propertyId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOwner: isPermOwner, hasPermission } = usePermissions();

  const [activeTab, setActiveTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [propertyName, setPropertyName] = useState<string>('');

  const { data: unit, isLoading } = useQuery({
    queryKey: ['unit-detalhe', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const isStandalone = unit?.is_standalone ?? false;
  const showSubdivisionsTab = isStandalone && !!unit?.has_subdivisions;
  const tabsCount = showSubdivisionsTab ? 8 : 7;
  const moduleKey = isStandalone ? 'assets_standalone' : 'assets_units';
  const canEdit = isPermOwner || hasPermission(moduleKey, 'edit');
  const canDelete = isPermOwner || hasPermission(moduleKey, 'delete');
  const canDuplicate = isPermOwner || hasPermission(moduleKey, 'create');
  const showPropertySelector = !isStandalone;

  const backTo = (() => {
    const base = isStandalone ? '/real-estate' : '/units';
    return propertyIdParam ? `${base}?propertyId=${propertyIdParam}` : base;
  })();

  const draftKey = `edit-unit-${unit?.id ?? 'none'}`;
  const { data: formData, setData: setFormData, clearDraft, hasDraft, discardDraft } = useFormDraft({
    key: draftKey,
    initialData: mapUnitToFormData(unit ?? {}),
    enabled: !!unit,
  });

  useEffect(() => {
    if (unit && !hasDraft) {
      setFormData(mapUnitToFormData(unit));
    }
    if (unit) {
      setGalleryImages(unit.gallery_images || []);
    }
  }, [unit, hasDraft, setFormData]);

  useEffect(() => {
    if (!unit) return;
    if (showPropertySelector) {
      supabase
        .from('properties')
        .select('id, name')
        .order('name')
        .then(({ data }) => setProperties(data || []));
    }
    if (unit.property_id) {
      supabase
        .from('properties')
        .select('name')
        .eq('id', unit.property_id)
        .single()
        .then(({ data }) => setPropertyName((data as any)?.name || ''));
    }
  }, [unit, showPropertySelector]);

  const handleDiscardDraft = () => {
    discardDraft();
    if (unit) {
      setFormData(mapUnitToFormData(unit));
      setGalleryImages(unit.gallery_images || []);
    }
  };

  const invalidate = () => {
    try {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['asset-health'] });
      queryClient.invalidateQueries({ queryKey: ['unit-full-data'] });
    } catch {}
  };

  const { duplicateUnit, deleteUnit } = useAssetActions();
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!unit) return;
    setDuplicating(true);
    const newUnit = await duplicateUnit(unit.id);
    setDuplicating(false);
    if (newUnit) {
      invalidate();
      const target = isStandalone
        ? `/real-estate?id=${newUnit.id}`
        : `/units?id=${newUnit.id}${propertyIdParam ? `&propertyId=${propertyIdParam}` : ''}`;
      navigate(target);
    }
  };

  const handleDelete = async () => {
    if (!unit) return;
    setDeleting(true);
    const ok = await deleteUnit(unit.id);
    if (ok) {
      invalidate();
      toast({ title: 'Imóvel excluído com sucesso' });
      clearDraft();
      navigate(backTo);
    }
    setDeleting(false);
    setShowDeleteDialog(false);
  };

  const saveUnit = async () => {
    if (!unit) return;

    if (formData.intent_type === 'sale' || formData.intent_type === 'both') {
      if (!formData.price) {
        toast({
          title: 'Campo obrigatório',
          description: 'Informe o Valor de Venda para imóveis com objetivo de venda.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.intent_type === 'rental' || formData.intent_type === 'both') {
      if (!formData.rent_price) {
        toast({
          title: 'Campo obrigatório',
          description: 'Informe o Preço de Locação para imóveis com objetivo de locação.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.intent_type === 'rental' && !formData.market_value) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o Valor Estimado do Patrimônio para calcular a rentabilidade.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        unit_number: formData.unit_number.trim(),
        status: formData.status,
        price: formData.price ? parseFloat(formData.price) : null,
        rent_price: formData.rent_price ? parseFloat(formData.rent_price) : null,
        area: formData.area ? parseFloat(formData.area) : null,
        area_total: formData.area_total ? parseFloat(formData.area_total) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        suites: formData.suites ? parseInt(formData.suites) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        condo_fee: formData.condo_fee ? parseFloat(formData.condo_fee) : null,
        iptu: formData.iptu ? parseFloat(formData.iptu) : null,
        parking_spots: formData.parking_spots ? parseInt(formData.parking_spots) : 0,
        property_id: isStandalone ? null : formData.property_id || unit.property_id,
        property_type: formData.property_type || null,
        condition: formData.condition || null,
        furnished: formData.furnished || null,
        solar_orientation: formData.solar_orientation || null,
        is_financeable: formData.is_financeable,
        registration_number: formData.registration_number || null,
        has_no_registration: formData.has_no_registration,
        iptu_number: formData.iptu_number || null,
        cib: formData.cib || null,
        owner_contact_id: formData.owner_contact_id || null,
        // Imóvel fracionado não tem inquilino no nível da unidade:
        // cada fração guarda o seu (e é ela que gera o contrato).
        tenant_contact_id: formData.has_subdivisions ? null : (formData.tenant_contact_id || null),
        cover_image_url: formData.cover_image_url || null,
        is_managed: formData.is_managed,
        description: formData.description || null,
        address: formData.address || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
        postal_code: formData.postal_code || null,
        tags: formData.tags.length > 0 ? formData.tags : [],
        intent_type: formData.intent_type,
        market_value: formData.market_value ? parseFloat(formData.market_value) : null,
        is_occupied: formData.is_occupied,
        is_published_portal: formData.is_published_portal,
        has_subdivisions: formData.has_subdivisions,
      };

      unitSchema.parse(payload);
      setSaving(true);

      const { error } = await supabase.from('units').update(payload).eq('id', unit.id);
      if (error) throw error;

      invalidate();
      clearDraft();

      toast({
        title: isStandalone ? 'Imóvel atualizado!' : 'Unidade atualizada!',
        description: 'As informações foram salvas com sucesso.',
      });

      navigate(backTo);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: isStandalone ? 'Erro ao atualizar imóvel' : 'Erro ao atualizar unidade',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Detalhe do Imóvel">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!id || !unit) {
    return (
      <AppLayout title="Detalhe do Imóvel">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="py-10 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Imóvel não encontrado.</p>
            <Button variant="outline" onClick={() => navigate('/units')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para a lista
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const statusStyle = UNIT_STATUS_STYLES[unit.status as keyof typeof UNIT_STATUS_STYLES];

  return (
    <AppLayout title="Detalhe do Imóvel">
      <SEOHead
        title="Detalhe do Imóvel"
        description={`Detalhes de ${unit.unit_number}`}
        path={`/units/detalhe?id=${id}`}
        noIndex
      />

      {/* Header */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 text-muted-foreground"
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {isStandalone ? 'Imóveis Avulsos' : 'Unidades'}
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">
                  {isStandalone ? unit.unit_number : `Unidade ${unit.unit_number}`}
                </h2>
                {propertyName && (
                  <p className="text-sm text-muted-foreground truncate">{propertyName}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {statusStyle && (
                    <Badge variant="outline" className={cn(statusStyle.badgeClasses)}>
                      {statusStyle.label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {(canEdit || canDuplicate || canDelete) && (
              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && (
                  <Button size="sm" onClick={saveUnit} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                )}
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

      {hasDraft && (
        <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">Rascunho recuperado. Você tinha alterações não salvas.</span>
            <Button variant="ghost" size="sm" onClick={handleDiscardDraft} className="ml-2 h-7 text-xs">
              Descartar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showSubdivisionsTab && unit?.id && (
        <div className="mb-4">
          <UnitSubdivisionSetupAlert
            unitId={unit.id}
            hasSubdivisions={unit.has_subdivisions}
            intentType={unit.intent_type}
            onAction={() => setActiveTab('subdivisions')}
            actionLabel="Ir para Frações"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn('grid w-full', tabsCount === 8 ? 'grid-cols-8' : 'grid-cols-7')}>
          <TabsTrigger value="info" className="text-xs sm:text-sm">
            <Info className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Informações</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="text-xs sm:text-sm">
            <Wallet className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Financeiro</span>
            <span className="sm:hidden">Fin.</span>
          </TabsTrigger>
          <TabsTrigger value="contract" className="text-xs sm:text-sm">
            <FileSignature className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Contrato</span>
            <span className="sm:hidden">Contr.</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="text-xs sm:text-sm">
            <Image className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Galeria</span>
            <span className="sm:hidden">Fotos</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="activities" className="text-xs sm:text-sm">
            <ClipboardList className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Atividades</span>
            <span className="sm:hidden">Log</span>
          </TabsTrigger>
          <TabsTrigger value="tenants" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Inquilinos</span>
            <span className="sm:hidden">Inq.</span>
          </TabsTrigger>
          {showSubdivisionsTab && (
            <TabsTrigger value="subdivisions" className="text-xs sm:text-sm">
              <Layers className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Frações</span>
              <span className="sm:hidden">Fraç.</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Info */}
        <TabsContent value="info" className="mt-4">
          <form onSubmit={(e) => { e.preventDefault(); if (canEdit) saveUnit(); }} className="space-y-4">
            <fieldset disabled={!canEdit}>
              <UnitFormFields
                formData={formData}
                setFormData={setFormData}
                properties={properties}
                showImageUpload={true}
                showPropertySelector={showPropertySelector}
                propertyRequired={!isStandalone}
                isStandalone={isStandalone}
                onPropertiesChange={setProperties}
                disabled={!canEdit}
                unitId={unit?.id}
                onNavigateSubdivisions={() => setActiveTab('subdivisions')}
              />
            </fieldset>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(backTo)}>
                {canEdit ? 'Cancelar' : 'Fechar'}
              </Button>
              {canEdit && (
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              )}
            </div>
          </form>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financial" className="mt-4">
          <AssetFinancialPanel
            assetType="unit"
            assetId={unit.id}
            currentMarketValue={unit.market_value}
            disabled={!canEdit}
          />
        </TabsContent>

        {/* Contrato */}
        <TabsContent value="contract" className="mt-4">
          <UnitContractTab unitId={unit.id} />
        </TabsContent>

        {/* Galeria */}
        <TabsContent value="gallery" className="mt-4">
          {user && (
            <UnitGalleryUpload
              unitId={unit.id}
              userId={effectiveBrokerId}
              images={galleryImages}
              onImagesChange={setGalleryImages}
              maxImages={20}
            />
          )}
          <p className="text-xs text-muted-foreground mt-4">
            As imagens são salvas automaticamente ao serem enviadas.
          </p>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documents" className="mt-4">
          {user && <AssetDocuments assetType="unit" assetId={unit.id} userId={effectiveBrokerId} />}
        </TabsContent>

        {/* Atividades */}
        <TabsContent value="activities" className="mt-4">
          {user && <AssetActivityTimeline assetType="unit" assetId={unit.id} brokerId={user.id} />}
        </TabsContent>

        {/* Inquilinos */}
        <TabsContent value="tenants" className="mt-4">
          <TenantHistoryPanel unitId={unit.id} />
        </TabsContent>

        {/* Frações */}
        {showSubdivisionsTab && (
          <TabsContent value="subdivisions" className="mt-4">
            <UnitSubdivisionsPanel unitId={unit.id} />
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imóvel</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{unit.unit_number}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
