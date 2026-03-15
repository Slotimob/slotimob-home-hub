import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
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
import { useToast } from '@/hooks/use-toast';
import { PropertyForm, PropertyPayload, PropertyFormData } from '@/components/properties/PropertyForm';
import { Loader2, AlertCircle } from 'lucide-react';
import { useFormDraft } from '@/hooks/useFormDraft';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Property {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
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
  // New fields for asset intelligence
  intent_type?: 'sale' | 'rental' | 'both' | null;
  is_under_management?: boolean | null;
  market_value?: number | null;
  rental_value?: number | null;
  is_occupied?: boolean | null;
}

interface EditPropertyDialogProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Convert property data to form initial data format
const propertyToFormData = (prop: Property): PropertyFormData => ({
  name: prop.name,
  description: prop.description || '',
  address: prop.address || '',
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
  // New fields
  intent_type: prop.intent_type || 'sale',
  is_under_management: prop.is_under_management ?? false,
  market_value: prop.market_value?.toString() || '',
  rental_value: prop.rental_value?.toString() || '',
  is_occupied: prop.is_occupied ?? false,
});

export const EditPropertyDialog = ({ property, open, onOpenChange, onSuccess }: EditPropertyDialogProps) => {
  const { toast } = useToast();
  const { isOwner, hasPermission } = usePermissions();
  const canEdit = isOwner || hasPermission('properties', 'edit');
  const canDelete = isOwner || hasPermission('properties', 'delete');
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [freshProperty, setFreshProperty] = useState<Property | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(false);

  const currentProperty = freshProperty || property;

  // Fetch fresh property data when dialog opens
  const fetchProperty = useCallback(async () => {
    if (!open || !property.id) return;
    
    setLoadingProperty(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', property.id)
        .single();

      if (error) throw error;
      setFreshProperty(data as Property);
    } catch (error: any) {
      console.error('Error fetching property:', error);
      // Fallback to prop data if fetch fails
      setFreshProperty(property);
    } finally {
      setLoadingProperty(false);
    }
  }, [open, property.id]);

  useEffect(() => {
    if (open) {
      fetchProperty();
    } else {
      // Reset when dialog closes
      setFreshProperty(null);
    }
  }, [open, fetchProperty]);

  // Use form draft hook for persistence
  const draftKey = `edit-property-${property.id}`;
  const { data: formData, setData: setFormData, clearDraft, hasDraft, discardDraft } = useFormDraft({
    key: draftKey,
    initialData: propertyToFormData(currentProperty),
    enabled: open,
  });

  // Update draft when fresh property is loaded (only if no existing draft)
  useEffect(() => {
    if (freshProperty && !hasDraft) {
      setFormData(propertyToFormData(freshProperty));
    }
  }, [freshProperty, hasDraft, setFormData]);

  const handleSubmit = async (payload: PropertyPayload) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', property.id);

      if (error) throw error;

      // Clear draft on successful save
      clearDraft();

      toast({
        title: 'Empreendimento atualizado!',
        description: 'As informações foram salvas com sucesso.',
      });

      onOpenChange(false);
      onSuccess();
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

  const handleDelete = async () => {
    try {
      const { count, error: countError } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', property.id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast({
          title: 'Não é possível excluir',
          description: `Este empreendimento possui ${count} unidade${count > 1 ? 's' : ''} cadastrada${count > 1 ? 's' : ''}. Exclua-as primeiro.`,
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', property.id);

      if (error) throw error;

      // Clear draft on delete
      clearDraft();

      toast({
        title: 'Empreendimento excluído!',
        description: 'O empreendimento foi removido com sucesso.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir empreendimento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    // Clear draft when canceling
    clearDraft();
    onOpenChange(false);
  };

  // Callback to refresh property data after gallery changes
  const handleRefreshProperty = async () => {
    await fetchProperty();
  };

  // Handle discard draft
  const handleDiscardDraft = () => {
    discardDraft();
    if (freshProperty) {
      setFormData(propertyToFormData(freshProperty));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Empreendimento</DialogTitle>
            <DialogDescription>
              Edite informações, infraestrutura, galeria e documentos
            </DialogDescription>
          </DialogHeader>

          {/* Draft recovery notice */}
          {hasDraft && !loadingProperty && (
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

          {loadingProperty ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PropertyForm
              key={`${property.id}-${freshProperty?.gallery_images?.length || 0}`}
              initialData={formData}
              isEditing={true}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onDelete={() => setShowDeleteDialog(true)}
              isSubmitting={saving}
              propertyId={property.id}
              onRefreshProperty={handleRefreshProperty}
              onFormChange={setFormData}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o empreendimento "{property.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
