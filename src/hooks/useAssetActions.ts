import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Centralized duplicate/delete logic for units and properties, reused across
 * the detail pages and the list-view action menus. Callers own navigation,
 * cache invalidation and any success messaging for deletes.
 */
export function useAssetActions() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const duplicateUnit = async (unitId: string): Promise<any | null> => {
    setIsProcessing(true);
    try {
      const { data: original, error: fetchError } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .single();

      if (fetchError || !original) throw fetchError || new Error('Unidade não encontrada');

      const { id, created_at, updated_at, ...rest } = original as any;

      const payload = {
        ...rest,
        unit_number: `${original.unit_number} (cópia)`,
        status: 'available',
        is_occupied: false,
        tenant_contact_id: null,
        tenant_id: null,
        registration_number: null,
        has_no_registration: false,
        iptu_number: null,
        cib: null,
        is_published_portal: false,
        acquisition_value: null,
        acquisition_date: null,
        acquisition_costs: 0,
        acquisition_notes: null,
      };

      const { data: newUnit, error: insertError } = await supabase
        .from('units')
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: original.is_standalone ? 'Imóvel duplicado!' : 'Unidade duplicada!',
        description: `Criada a cópia "${newUnit.unit_number}".`,
      });

      return newUnit;
    } catch (error: any) {
      toast({ title: 'Erro ao duplicar', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const duplicateProperty = async (propertyId: string): Promise<any | null> => {
    setIsProcessing(true);
    try {
      const { data: original, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchError || !original) throw fetchError || new Error('Empreendimento não encontrado');

      const { id, created_at, updated_at, ...rest } = original as any;

      const payload = {
        ...rest,
        name: `${original.name} (cópia)`,
        is_occupied: false,
        registration_number: null,
        iptu_number: null,
        cib: null,
        acquisition_value: null,
        acquisition_date: null,
        acquisition_costs: 0,
        acquisition_notes: null,
      };

      const { data: newProperty, error: insertError } = await supabase
        .from('properties')
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Empreendimento duplicado!',
        description: `Criada a cópia "${newProperty.name}".`,
      });

      return newProperty;
    } catch (error: any) {
      toast({ title: 'Erro ao duplicar', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteUnit = async (unitId: string): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('units').delete().eq('id', unitId);
      if (error) throw error;
      return true;
    } catch (error: any) {
      if (error?.code === '23503') {
        toast({
          title: 'Não é possível excluir esta unidade',
          description:
            'Existem contratos, propostas ou visitas vinculadas a esta unidade. Encerre ou exclua esses registros primeiro.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      }
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteProperty = async (propertyId: string): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const { count, error: countError } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propertyId);

      if (countError) throw countError;

      if (count && count > 0) {
        toast({
          title: 'Não é possível excluir',
          description: `Este empreendimento possui ${count} unidade${count > 1 ? 's' : ''} cadastrada${count > 1 ? 's' : ''}. Exclua-as primeiro.`,
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase.from('properties').delete().eq('id', propertyId);
      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao excluir empreendimento', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return { duplicateUnit, duplicateProperty, deleteUnit, deleteProperty, isProcessing };
}
