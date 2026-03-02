import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscriptionLimits, PlanFeatures } from '@/hooks/useSubscriptionLimits';

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

  if (isLoading) return null;

  if (!canUse(feature)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
