import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';
import { countLeasesByStatus, getAdjustmentStatus, LeaseStatusCounts } from '@/lib/lease-status';

export interface LeaseStatusCountsResult {
  counts: LeaseStatusCounts;
  adjustmentsDue: number;
  isLoading: boolean;
}

export const useLeaseStatusCounts = (): LeaseStatusCountsResult => {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();

  const brokerId = effectiveBrokerId || user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['lease-status-counts', brokerId],
    queryFn: async () => {
      if (!brokerId) return null;
      const { data, error } = await supabase
        .from('leases')
        .select('status, next_adjustment_date')
        .eq('broker_id', brokerId);
      if (error) {
        console.error('Error fetching lease status counts:', error);
        return null;
      }
      return data as Array<{ status: string | null; next_adjustment_date: string | null }>;
    },
    enabled: !!brokerId,
    staleTime: 60 * 1000,
  });

  const counts = countLeasesByStatus(data);
  const adjustmentsDue =
    data?.filter(
      (l) =>
        l.status === 'active' &&
        ['proximo', 'vencido'].includes(getAdjustmentStatus(l.next_adjustment_date))
    ).length ?? 0;

  return { counts, adjustmentsDue, isLoading };
};
