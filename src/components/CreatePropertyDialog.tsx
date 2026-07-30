import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2 } from 'lucide-react';
import { PropertyForm, PropertyPayload } from '@/components/properties/PropertyForm';
import { useCreateProperty } from '@/hooks/useCreateProperty';

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreatePropertyDialog = ({ open, onOpenChange, onSuccess }: CreatePropertyDialogProps) => {
  const { createProperty, saving } = useCreateProperty();

  const handleSubmit = async (payload: PropertyPayload) => {
    const ok = await createProperty(payload);
    if (ok) {
      onOpenChange(false);
      onSuccess();
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
