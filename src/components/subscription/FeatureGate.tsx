import { ReactNode } from 'react';
import { useSubscriptionLimits, PlanFeatures } from '@/hooks/useSubscriptionLimits';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Lock, Rocket, Building2, Briefcase, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface FeatureGateProps {
  feature: keyof PlanFeatures;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradeOverlay?: boolean;
  requiredPlan?: 'essencial' | 'pro' | 'business';
}

export const FeatureGate = ({
  feature,
  children,
  fallback,
  showUpgradeOverlay = true,
  requiredPlan,
}: FeatureGateProps) => {
  const { canUse, getUpgradeReason, plan, isLoading } = useSubscriptionLimits();
  const { isMember, isLoading: isLoadingWorkspace } = useWorkspace();

  if (isLoading || isLoadingWorkspace) return <>{children}</>;

  if (canUse(feature)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (!showUpgradeOverlay) return null;

  // Membros convidados não podem fazer upgrade — a decisão é do dono da conta.
  // Mostra mensagem de permissão em vez do CTA de upgrade.
  if (isMember) {
    return (
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-6 max-w-md">
            <div className="mx-auto mb-4 text-muted-foreground">
              <ShieldAlert className="h-8 w-8 mx-auto" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Acesso restrito</span>
            </div>
            <p className="text-foreground font-medium">
              Você não tem permissão para acessar este módulo. Fale com o administrador da sua conta.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const targetPlan = requiredPlan || (plan === 'free' ? 'essencial' : plan === 'essencial' ? 'pro' : 'business');
  const planIcon = targetPlan === 'business' ? <Building2 className="h-8 w-8" /> : targetPlan === 'pro' ? <Rocket className="h-8 w-8" /> : <Briefcase className="h-8 w-8" />;
  const planName = targetPlan === 'business' ? 'Business' : targetPlan === 'pro' ? 'Pro' : 'Essencial';
  const planColor = targetPlan === 'business' ? 'text-purple-500' : targetPlan === 'pro' ? 'text-blue-500' : 'text-emerald-500';

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
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
          <Button asChild className={targetPlan === 'business' ? 'bg-purple-600 hover:bg-purple-700' : targetPlan === 'pro' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}>
            <Link to={`/checkout?plan=${targetPlan}&cycle=annual&mode=immediate`}>
              Upgrade para {planName}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
