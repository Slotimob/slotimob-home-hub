import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscriptionLimits, PlanFeatures } from '@/hooks/useSubscriptionLimits';
import { useWorkspace } from '@/hooks/useWorkspace';
import { MemberFeatureDenied } from './MemberFeatureDenied';

interface RequireFeatureProps {
  feature: keyof PlanFeatures;
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Route-level guard that redirects immediately if the user's plan
 * doesn't include the required feature. Prevents direct URL access.
 */
export function RequireFeature({ feature, children, redirectTo = '/dashboard' }: RequireFeatureProps) {
  const { canUse, isLoading } = useSubscriptionLimits();
  const { isMember, isLoading: isWorkspaceLoading } = useWorkspace();

  if (isLoading || isWorkspaceLoading) return null;

  if (!canUse(feature)) {
    if (isMember) {
      return <MemberFeatureDenied overlay={false} />;
    }

    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
