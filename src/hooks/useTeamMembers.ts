import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Fetches all team members (owner + active members) for the current workspace.
 * Returns an empty array for non-Business plans (single user).
 * Used to populate agent selectors in create dialogs.
 */
export const useTeamMembers = () => {
  const { user } = useAuth();
  const { effectiveBrokerId, isMember, isLoading: wsLoading } = useWorkspace();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members', effectiveBrokerId],
    queryFn: async () => {
      if (!effectiveBrokerId) return [];

      // Get all workspace user IDs via the security definer function
      const { data: ownerProfile } = await (supabase as any)
        .from('profile_directory')
        .select('id, full_name, email')
        .eq('id', effectiveBrokerId)
        .single();

      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id, role_label')
        .eq('organization_owner_id', effectiveBrokerId)
        .eq('is_active', true);

      if (!orgMembers || orgMembers.length === 0) {
        // Solo user, no team
        return [];
      }

      // Fetch profiles for all members
      const memberIds = orgMembers.map(m => m.user_id);
      const { data: memberProfiles } = await (supabase as any)
        .from('profile_directory')
        .select('id, full_name, email')
        .in('id', memberIds);

      const team: TeamMember[] = [];

      // Add owner first
      if (ownerProfile) {
        team.push({
          id: ownerProfile.id,
          full_name: ownerProfile.full_name || 'Proprietário',
          email: ownerProfile.email || '',
        });
      }

      // Add members
      (memberProfiles || []).forEach(p => {
        team.push({
          id: p.id,
          full_name: p.full_name || p.email || 'Membro',
          email: p.email || '',
        });
      });

      return team;
    },
    enabled: !!effectiveBrokerId && !wsLoading,
    staleTime: 5 * 60 * 1000,
  });

  return {
    members,
    isTeam: members.length > 1,
    isLoading: isLoading || wsLoading,
  };
};
