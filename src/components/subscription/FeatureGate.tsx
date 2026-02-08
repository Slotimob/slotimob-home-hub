import { ReactNode } from 'react';
import { useSubscriptionLimits, PlanFeatures } from '@/hooks/useSubscriptionLimits';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface FeatureGateProps {
  feature: keyof PlanFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradeOverlay?: boolean;
  requiredPlan?: 'ouro' | 'diamante';
}

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback,
  showUpgradeOverlay = true,
  requiredPlan,
}: FeatureGateProps) => {
  const { canUse, getUpgradeReason, plan, isLoading } = useSubscriptionLimits();

  if (isLoading) {
    return <>{children}</>;
  }

  const hasAccess = canUse(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradeOverlay) {
    return null;
  }

  const targetPlan = requiredPlan || (plan === 'free' ? 'ouro' : 'diamante');
  const planIcon = targetPlan === 'diamante' ? <Sparkles className="h-8 w-8" /> : <Crown className="h-8 w-8" />;
  const planName = targetPlan === 'diamante' ? 'Diamante' : 'Ouro';
  const planColor = targetPlan === 'diamante' ? 'text-purple-500' : 'text-amber-500';

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      
      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-md">
          <div className={`mx-auto mb-4 ${planColor}`}>
            {planIcon}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Funcionalidade bloqueada</span>
          </div>
          <p className="text-foreground font-medium mb-4">
            {getUpgradeReason(feature)}
          </p>
          <Button asChild className={targetPlan === 'diamante' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-amber-600 hover:bg-amber-700'}>
            <Link to="/#pricing">
              Upgrade para {planName}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
