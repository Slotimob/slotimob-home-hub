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
import { UnitFormFields, UnitFormData, getInitialFormData } from '@/components/units/UnitFormFields';
import { useCreateUnit } from '@/hooks/useCreateUnit';

interface CreateUnitDialogProps {
  propertyId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** If true, this dialog creates a standalone real estate (no property required) */
  standalone?: boolean;
}

export const CreateUnitDialog = ({ 
  propertyId, 
  open, 
  onOpenChange, 
  onSuccess,
  standalone = false 
}: CreateUnitDialogProps) => {
  const { user } = useAuth();
  const { createUnit, saving } = useCreateUnit(standalone);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState<UnitFormData>(() => {
    const initial = getInitialFormData();
    if (propertyId) initial.property_id = propertyId;
    return initial;
  });

  // Determine if we need to show property selector
  // Show property selector if: not standalone AND no propertyId provided
  const showPropertySelector = !standalone && !propertyId;

  useEffect(() => {
    if (open && user) {
      // Load properties if we need property selector
      if (showPropertySelector) {
        supabase.from('properties').select('id, name').order('name').then(({ data }) => setProperties(data || []));
      }
    }
  }, [open, user, showPropertySelector]);

  // Update property_id when propertyId prop changes
  useEffect(() => {
    if (propertyId) {
      setFormData(prev => ({ ...prev, property_id: propertyId }));
    }
  }, [propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const effectivePropertyId = standalone ? null : (propertyId || formData.property_id || null);
    const ok = await createUnit(formData, effectivePropertyId);

    if (ok) {
      onOpenChange(false);
      setFormData(getInitialFormData());
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle>{standalone ? 'Novo Imóvel Avulso' : 'Nova Unidade'}</DialogTitle>
          <DialogDescription>
            {standalone 
              ? 'Cadastre um imóvel que não pertence a um empreendimento'
              : 'Cadastre uma nova unidade para o empreendimento'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <UnitFormFields
            formData={formData}
            setFormData={setFormData}
            properties={properties}
            showImageUpload={true}
            showPropertySelector={showPropertySelector}
            propertyRequired={!standalone && !propertyId}
            isStandalone={standalone}
            onPropertiesChange={setProperties}
          />

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Criando...' : (standalone ? 'Criar Imóvel' : 'Criar Unidade')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
