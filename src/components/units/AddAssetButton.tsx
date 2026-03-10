import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateUnitDialog } from '@/components/CreateUnitDialog';
import { CreateRealEstateDialog } from '@/components/CreateRealEstateDialog';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

interface AddAssetButtonProps {
  propertyId?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
  showIcon?: boolean;
  standalone?: boolean;
  onSuccess?: () => void;
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
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { plan, features } = useSubscriptionLimits();

  // Count current units
  const { data: unitCount = 0 } = useQuery({
    queryKey: ['unit-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('broker_id', user.id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const assetsLimit = features?.assets_limit || 2;
  const isAtLimit = assetsLimit !== -1 && unitCount >= assetsLimit;

  const defaultLabel = standalone ? 'Novo Imóvel Avulso' : 'Nova Unidade';
  const buttonLabel = label ?? defaultLabel;

  const handleClick = () => {
    if (isAtLimit) {
      setUpgradeOpen(true);
      return;
    }
    setOpen(true);
  };

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  const showLabel = size !== 'icon';
  const responsiveClasses = size === 'sm' 
    ? 'h-8 sm:h-9 px-2 sm:px-3' 
    : size === 'icon' 
      ? 'h-8 w-8 sm:h-9 sm:w-9' 
      : 'h-8 sm:h-9 px-2 sm:px-3';

  const targetPlan = plan === 'free' ? 'essencial' : plan === 'essencial' ? 'pro' : 'business';

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
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

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        targetPlan={targetPlan}
        feature={`Você atingiu o limite de ${assetsLimit} unidades do seu plano.`}
      />
    </>
  );
}