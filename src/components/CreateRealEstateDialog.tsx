import { CreateUnitDialog } from '@/components/CreateUnitDialog';

interface CreateRealEstateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * This is a wrapper component that uses CreateUnitDialog in standalone mode.
 * It exists for backwards compatibility and semantic clarity when creating standalone real estate.
 */
export function CreateRealEstateDialog({ open, onOpenChange, onSuccess }: CreateRealEstateDialogProps) {
  return (
    <CreateUnitDialog
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      standalone={true}
    />
  );
}
