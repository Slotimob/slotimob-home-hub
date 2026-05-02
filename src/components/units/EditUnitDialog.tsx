import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { z } from 'zod';
import { Info, Image, FileText, AlertCircle, Trash2, ClipboardList, DollarSign } from 'lucide-react';
import { AssetActivityTimeline } from '@/components/assets/AssetActivityTimeline';
import { AssetFinancialPanel } from '@/components/assets/AssetFinancialPanel';
import { UnitFormFields, UnitFormData, getInitialFormData } from '@/components/units/UnitFormFields';
import { UnitGalleryUpload } from '@/components/units/UnitGalleryUpload';
import { UnitDocuments } from '@/components/units/UnitDocuments';
import { useFormDraft } from '@/hooks/useFormDraft';
import { Alert, AlertDescription } from '@/components/ui/alert';

const unitSchema = z.object({
  unit_number: z.string().min(1, 'Número da unidade é obrigatório').max(50),
  status: z.enum(['available', 'reserved', 'rented', 'sold']),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero').optional().nullable(),
  rent_price: z.number().min(0, 'Preço locação deve ser maior ou igual a zero').optional().nullable(),
  area: z.number().min(0, 'Área deve ser maior ou igual a zero').optional().nullable(),
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

interface Unit {
  id: string;
  unit_number: string;
  status: 'available' | 'reserved' | 'rented' | 'sold';
  property_id: string | null;
  price: number | null;
  rent_price: number | null;
  area: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  condo_fee: number | null;
  iptu: number | null;
  property_type: string | null;
  condition: string | null;
  furnished: string | null;
  solar_orientation: string | null;
  is_financeable: boolean | null;
  registration_number: string | null;
  has_no_registration: boolean | null;
  iptu_number: string | null;
  cib: string | null;
  // Unified contacts - these are the correct columns
  owner_contact_id: string | null;
  tenant_contact_id: string | null;
  cover_image_url: string | null;
  is_standalone: boolean | null;
  is_managed: boolean | null;
  description: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  tags: string[] | null;
  gallery_images?: string[] | null;
  // New fields for asset intelligence
  intent_type?: 'sale' | 'rental' | 'both' | null;
  market_value?: number | null;
  is_occupied?: boolean | null;
}

interface EditUnitDialogProps {
  unit: Unit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultTab?: string;
}

function mapUnitToFormData(u: Unit): UnitFormData {
  return {
    unit_number: u.unit_number || '',
    status: u.status || 'available',
    property_type: u.property_type || '',
    condition: u.condition || '',
    price: u.price?.toString() || '',
    rent_price: u.rent_price?.toString() || '',
    area: u.area?.toString() || '',
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
    // Use the correct contact columns from units table
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
    // New fields
    intent_type: u.intent_type || 'sale',
    market_value: u.market_value?.toString() || '',
    is_occupied: u.is_occupied ?? false,
  };
}

export const EditUnitDialog = ({ 
  unit, 
  open, 
  onOpenChange, 
  onSuccess,
  defaultTab = 'info',
}: EditUnitDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOwner: isPermOwner, hasPermission } = usePermissions();
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  
  const isStandalone = unit.is_standalone ?? false;
  const moduleKey = isStandalone ? 'assets_standalone' : 'assets_units';
  const canEdit = isPermOwner || hasPermission(moduleKey, 'edit');
  const canDelete = isPermOwner || hasPermission(moduleKey, 'delete');
  const showPropertySelector = !isStandalone;

  // Use form draft hook for persistence
  const draftKey = `edit-unit-${unit.id}`;
  const { data: formData, setData: setFormData, clearDraft, hasDraft, discardDraft } = useFormDraft({
    key: draftKey,
    initialData: mapUnitToFormData(unit),
    enabled: open,
  });

  // Update draft when unit changes (only if no existing draft)
  useEffect(() => {
    if (open && !hasDraft) {
      setFormData(mapUnitToFormData(unit));
      setGalleryImages(unit.gallery_images || []);
      setActiveTab(defaultTab || 'info');
    }
  }, [open, unit, hasDraft, setFormData, defaultTab]);

  useEffect(() => {
    if (open && user) {
      if (showPropertySelector) {
        supabase.from('properties').select('id, name').order('name').then(({ data }) => setProperties(data || []));
      }
    }
  }, [open, user, showPropertySelector]);

  // Handle discard draft
  const handleDiscardDraft = () => {
    discardDraft();
    setFormData(mapUnitToFormData(unit));
    setGalleryImages(unit.gallery_images || []);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('units').delete().eq('id', unit.id);
      if (error) throw error;
      toast({ title: 'Imóvel excluído com sucesso' });
      clearDraft();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate financial fields based on intent_type
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

    // For rental-only, market_value is needed for Yield calculation
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
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        suites: formData.suites ? parseInt(formData.suites) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        condo_fee: formData.condo_fee ? parseFloat(formData.condo_fee) : null,
        iptu: formData.iptu ? parseFloat(formData.iptu) : null,
        parking_spots: formData.parking_spots ? parseInt(formData.parking_spots) : 0,
        property_id: isStandalone ? null : (formData.property_id || unit.property_id),
        property_type: formData.property_type || null,
        condition: formData.condition || null,
        furnished: formData.furnished || null,
        solar_orientation: formData.solar_orientation || null,
        is_financeable: formData.is_financeable,
        registration_number: formData.registration_number || null,
        has_no_registration: formData.has_no_registration,
        iptu_number: formData.iptu_number || null,
        cib: formData.cib || null,
        // Use correct contact columns (NOT legacy owner_id/lead_id)
        owner_contact_id: formData.owner_contact_id || null,
        tenant_contact_id: formData.tenant_contact_id || null,
        cover_image_url: formData.cover_image_url || null,
        is_managed: formData.is_managed,
        description: formData.description || null,
        address: formData.address || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
        postal_code: formData.postal_code || null,
        tags: formData.tags.length > 0 ? formData.tags : [],
        // New fields
        intent_type: formData.intent_type,
        market_value: formData.market_value ? parseFloat(formData.market_value) : null,
        is_occupied: formData.is_occupied,
      };

      unitSchema.parse(payload);
      setSaving(true);

      const { error } = await supabase
        .from('units')
        .update(payload)
        .eq('id', unit.id);

      if (error) throw error;

      // Clear draft on successful save
      clearDraft();

      toast({
        title: isStandalone ? 'Imóvel atualizado!' : 'Unidade atualizada!',
        description: 'As informações foram salvas com sucesso.',
      });

      onOpenChange(false);
      onSuccess();
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

  const handleCancel = () => {
    clearDraft();
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{canEdit ? (isStandalone ? 'Editar Imóvel Avulso' : 'Editar Unidade') : (isStandalone ? 'Visualizar Imóvel Avulso' : 'Visualizar Unidade')}</DialogTitle>
          <DialogDescription>
            {canEdit
              ? (isStandalone ? 'Edite todas as informações do imóvel' : 'Edite todas as informações da unidade')
              : 'Visualização somente leitura'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Draft recovery notice */}
        {hasDraft && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info" className="text-xs sm:text-sm">
              <Info className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Informações</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="text-xs sm:text-sm">
              <DollarSign className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Financeiro</span>
              <span className="sm:hidden">Fin.</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="text-xs sm:text-sm">
              <Image className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Galeria</span>
              <span className="sm:hidden">Fotos</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Documentos</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="activities" className="text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Atividades</span>
              <span className="sm:hidden">Log</span>
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="mt-4">
            <form onSubmit={canEdit ? handleSubmit : (e) => e.preventDefault()} className="space-y-4">
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
                />
              </fieldset>

              <div className="flex justify-between gap-2 pt-4 border-t">
                <div>
                  {canDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    {canEdit ? 'Cancelar' : 'Fechar'}
                  </Button>
                  {canEdit && (
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="mt-4">
            {user && (
              <UnitGalleryUpload
                unitId={unit.id}
                userId={user.id}
                images={galleryImages}
                onImagesChange={setGalleryImages}
                maxImages={20}
              />
            )}
            <p className="text-xs text-muted-foreground mt-4">
              As imagens são salvas automaticamente ao serem enviadas.
            </p>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-4">
            {user && (
              <UnitDocuments unitId={unit.id} userId={user.id} />
            )}
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="mt-4">
            {user && (
              <AssetActivityTimeline
                assetType="unit"
                assetId={unit.id}
                brokerId={user.id}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

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
          <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
