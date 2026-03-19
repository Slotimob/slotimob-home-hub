import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';
import { PropertyForm, PropertyPayload } from '@/components/properties/PropertyForm';

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreatePropertyDialog = ({ open, onOpenChange, onSuccess }: CreatePropertyDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (payload: PropertyPayload) => {
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

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar empreendimento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-3xl max-h-[90vh] overflow-y-auto px-4 sm:px-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Novo Empreendimento
          </DialogTitle>
          <DialogDescription>
            Cadastre um novo empreendimento com ficha técnica completa
          </DialogDescription>
        </DialogHeader>

        <PropertyForm
          isEditing={false}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={saving}
        />
      </DialogContent>
    </Dialog>
  );
};
