import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';
import type { PropertyPayload } from '@/components/properties/PropertyForm';

/**
 * Shared logic to insert a new property (empreendimento) under the
 * effective workspace broker. Returns success as a boolean so callers
 * can decide what to do next (close dialog / navigate).
 */
export function useCreateProperty() {
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [saving, setSaving] = useState(false);

  const createProperty = async (payload: PropertyPayload): Promise<boolean> => {
    try {
      setSaving(true);

      const { error } = await supabase.from('properties').insert([
        {
          broker_id: effectiveBrokerId,
          ...payload,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Empreendimento criado!',
        description: 'O empreendimento foi cadastrado com sucesso.',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar empreendimento',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { createProperty, saving };
}
