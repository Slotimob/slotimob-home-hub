import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateUnitDialog } from '@/components/CreateUnitDialog';
import { CreateRealEstateDialog } from '@/components/CreateRealEstateDialog';

interface AddAssetButtonProps {
  /** Property ID to pre-select when creating a unit within a property */
  propertyId?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Label text */
  label?: string;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** If true, opens the standalone real estate dialog instead */
  standalone?: boolean;
  /** Callback after successful creation */
  onSuccess?: () => void;
  /** Additional class names */
  className?: string;
}

export function AddAssetButton({
  propertyId,
  variant = 'default',
  size = 'default',
  label,
  showIcon = true,
  standalone = false,
  onSuccess,
  className,
}: AddAssetButtonProps) {
  const [open, setOpen] = useState(false);

  const defaultLabel = standalone ? 'Novo Imóvel Avulso' : 'Nova Unidade';
  const buttonLabel = label ?? defaultLabel;

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  // Determine responsive label display
  const showLabel = size !== 'icon';
  const responsiveClasses = size === 'sm' 
    ? 'h-8 sm:h-9 px-2 sm:px-3' 
    : size === 'icon' 
      ? 'h-8 w-8 sm:h-9 sm:w-9' 
      : 'h-8 sm:h-9 px-2 sm:px-3';

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={`${responsiveClasses} ${className || ''}`}
      >
        {showIcon && <Plus className={`h-4 w-4 ${showLabel ? 'sm:mr-2' : ''}`} />}
        {showLabel && <span className="hidden sm:inline">{buttonLabel}</span>}
      </Button>

      {standalone ? (
        <CreateRealEstateDialog
          open={open}
          onOpenChange={setOpen}
          onSuccess={handleSuccess}
        />
      ) : (
        <CreateUnitDialog
          propertyId={propertyId}
          open={open}
          onOpenChange={setOpen}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
