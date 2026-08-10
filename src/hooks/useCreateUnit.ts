import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { showSuccess, showError } from '@/utils/notifications';
import type { UnitFormData } from '@/components/units/UnitFormFields';

export const unitSchema = z.object({
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

/**
 * Shared creation logic for units / standalone real estate.
 * `effectivePropertyId` should be null for standalone units.
 */
export function useCreateUnit(standalone: boolean) {
  const { effectiveBrokerId } = useWorkspace();
  const [saving, setSaving] = useState(false);

  const createUnit = async (
    formData: UnitFormData,
    effectivePropertyId: string | null
  ): Promise<{ id: string; intent_type: string; tenant_contact_id: string | null } | null> => {
    // For non-standalone mode, require property selection
    if (!standalone && !effectivePropertyId) {
      showError('Empreendimento obrigatório', 'Selecione um empreendimento para vincular a unidade.');
      return null;
    }

    // Validate financial fields based on intent_type
    if (formData.intent_type === 'sale' || formData.intent_type === 'both') {
      if (!formData.price) {
        showError('Campo obrigatório', 'Informe o Valor de Venda para imóveis com objetivo de venda.');
      return null;
      }
    }

    if (formData.intent_type === 'rental' || formData.intent_type === 'both') {
      if (!formData.rent_price) {
        showError('Campo obrigatório', 'Informe o Preço de Locação para imóveis com objetivo de locação.');
      return null;
      }
    }

    // For rental-only, market_value is needed for Yield calculation
    if (formData.intent_type === 'rental' && !formData.market_value) {
      showError('Campo obrigatório', 'Informe o Valor Estimado do Patrimônio para calcular a rentabilidade.');
      return null;
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
      };

      unitSchema.parse(payload);
      setSaving(true);

      const { data: insertedUnit, error } = await supabase
        .from('units')
        .insert([
          {
            ...payload,
            property_id: standalone ? null : effectivePropertyId,
            broker_id: effectiveBrokerId,
            property_type: formData.property_type || null,
            condition: formData.condition || null,
            furnished: formData.furnished || null,
            solar_orientation: formData.solar_orientation || null,
            is_financeable: formData.is_financeable,
            registration_number: formData.registration_number || null,
            has_no_registration: formData.has_no_registration,
            iptu_number: formData.iptu_number || null,
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
            intent_type: formData.intent_type,
            market_value: formData.market_value ? parseFloat(formData.market_value) : null,
            is_occupied: formData.is_occupied,
            has_subdivisions: formData.has_subdivisions,
          },
        ])
        .select('id, intent_type, tenant_contact_id')
        .single();

      if (error) throw error;

      showSuccess(
        standalone ? 'Imóvel criado!' : 'Unidade criada!',
        standalone ? 'O imóvel avulso foi cadastrado com sucesso.' : 'A unidade foi cadastrada com sucesso.'
      );

      return insertedUnit;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        showError('Erro de validação', error.errors[0].message);
      } else {
        showError(standalone ? 'Erro ao criar imóvel' : 'Erro ao criar unidade', error.message);
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { createUnit, saving };
}
