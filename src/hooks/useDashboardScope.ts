import { usePermissions } from '@/hooks/usePermissions';

export type RentalScope = 'self' | 'workspace';

export function useDashboardScope(): RentalScope {
  const { isOwner } = usePermissions();
  return isOwner ? 'workspace' : 'self';
}
