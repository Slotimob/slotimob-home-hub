import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WorkspaceInfo {
  /** The effective broker_id to use for inserts (owner's ID for members, own ID for owners) */
  effectiveBrokerId: string | null;
  /** Whether current user is a member of someone else's organization */
  isMember: boolean;
  /** The owner's user ID (same as effectiveBrokerId when isMember) */
  ownerId: string | null;
  isLoading: boolean;
}

/**
 * Provides workspace context for multi-tenant data access.
 * Members get their owner's broker_id for inserts so all data is
 * centralized under the owner's account.
 */
export const useWorkspace = (): WorkspaceInfo => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-membership', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: membership, error } = await supabase
        .from('organization_members')
        .select('organization_owner_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching workspace membership:', error);
        return null;
      }

      if (membership) {
        return {
          isMember: true,
          ownerId: membership.organization_owner_id,
          effectiveBrokerId: membership.organization_owner_id,
        };
      }

      return {
        isMember: false,
        ownerId: user.id,
        effectiveBrokerId: user.id,
      };
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  return {
    effectiveBrokerId: data?.effectiveBrokerId ?? user?.id ?? null,
    isMember: data?.isMember ?? false,
    ownerId: data?.ownerId ?? user?.id ?? null,
    isLoading,
  };
};
