import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'owner' | 'agent';

export interface UserRoleInfo {
  role: UserRole;
  isOwner: boolean;
  isAgent: boolean;
  isLoading: boolean;
}

/**
 * Determines the user's role in the system.
 * - "owner": The account creator / subscription holder. Has full access.
 * - "agent": An invited team member. Restricted access.
 * 
 * Currently, since the system is single-user per account,
 * all users default to "owner". When multi-user (Business plan) is enabled,
 * invited users will get the "agent" role via user_roles table.
 */
export const useUserRole = (): UserRoleInfo => {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async (): Promise<UserRole> => {
      if (!user?.id) return 'owner';

      // Check if user has 'agent' role in user_roles table
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'agent' as any });

      if (error) {
        console.error('Error checking user role:', error);
        return 'owner'; // Default to owner on error
      }

      return data === true ? 'agent' : 'owner';
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const resolvedRole = role || 'owner';

  return {
    role: resolvedRole,
    isOwner: resolvedRole === 'owner',
    isAgent: resolvedRole === 'agent',
    isLoading,
  };
};
