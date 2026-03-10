import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { showSuccess, showError } from '@/utils/notifications';
import { z } from 'zod';
import { UnitFormFields, UnitFormData, getInitialFormData } from '@/components/units/UnitFormFields';

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
  const { effectiveBrokerId } = useWorkspace();
  const [saving, setSaving] = useState(false);
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

    // For non-standalone mode without a fixed propertyId, require property selection
    if (!standalone && !propertyId && !formData.property_id) {
      showError('Empreendimento obrigatório', 'Selecione um empreendimento para vincular a unidade.');
      return;
    }

    // Validate financial fields based on intent_type
    if (formData.intent_type === 'sale' || formData.intent_type === 'both') {
      if (!formData.price) {
        showError('Campo obrigatório', 'Informe o Valor de Venda para imóveis com objetivo de venda.');
        return;
      }
    }

    if (formData.intent_type === 'rental' || formData.intent_type === 'both') {
      if (!formData.rent_price) {
        showError('Campo obrigatório', 'Informe o Preço de Locação para imóveis com objetivo de locação.');
        return;
      }
    }

    // For rental-only, market_value is needed for Yield calculation
    if (formData.intent_type === 'rental' && !formData.market_value) {
      showError('Campo obrigatório', 'Informe o Valor Estimado do Patrimônio para calcular a rentabilidade.');
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
      };

      unitSchema.parse(payload);
      setSaving(true);

      // Determine the effective property_id (null for standalone units)
      const effectivePropertyId = standalone 
        ? null 
        : (propertyId || formData.property_id);

      const { error } = await supabase.from('units').insert([
        {
          ...payload,
          property_id: effectivePropertyId,
          broker_id: effectiveBrokerId,
          property_type: formData.property_type || null,
          condition: formData.condition || null,
          furnished: formData.furnished || null,
          solar_orientation: formData.solar_orientation || null,
          is_financeable: formData.is_financeable,
          registration_number: formData.registration_number || null,
          has_no_registration: formData.has_no_registration,
          iptu_number: formData.iptu_number || null,
          // Use correct contact columns (NOT legacy owner_id/lead_id)
          owner_contact_id: formData.owner_contact_id || null,
          tenant_contact_id: formData.tenant_contact_id || null,
          cover_image_url: formData.cover_image_url || null,
          is_standalone: standalone,
          is_managed: formData.is_managed,
          description: formData.description || null,
          address: formData.address || null,
          neighborhood: formData.neighborhood || null,
          city: formData.city || null,
          state: formData.state || null,
          postal_code: formData.postal_code || null,
          cib: formData.cib || null,
          tags: formData.tags.length > 0 ? formData.tags : [],
          // New fields for asset intelligence
          intent_type: formData.intent_type,
          market_value: formData.market_value ? parseFloat(formData.market_value) : null,
          is_occupied: formData.is_occupied,
        },
      ]);

      if (error) throw error;

      showSuccess(
        standalone ? 'Imóvel criado!' : 'Unidade criada!',
        standalone ? 'O imóvel avulso foi cadastrado com sucesso.' : 'A unidade foi cadastrada com sucesso.'
      );

      onOpenChange(false);
      setFormData(getInitialFormData());
      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        showError('Erro de validação', error.errors[0].message);
      } else {
        showError(standalone ? 'Erro ao criar imóvel' : 'Erro ao criar unidade', error.message);
      }
    } finally {
      setSaving(false);
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
