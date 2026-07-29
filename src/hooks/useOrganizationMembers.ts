import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import type { Permissions } from './usePermissions';

export interface OrganizationMemberWithProfile {
  id: string;
  organization_owner_id: string;
  user_id: string;
  role_label: string | null;
  permissions: Permissions;
  invited_at: string | null;
  accepted_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile: {
    full_name: string;
    email: string | null;
  };
}

/**
 * Lista os membros da organização (com perfil resolvido) do workspace atual.
 * Fonte única usada pela página /users e pela revisão trimestral de acessos.
 */
export const useOrganizationMembers = () => {
  const { effectiveBrokerId } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ['organization-members', effectiveBrokerId],
    queryFn: async (): Promise<OrganizationMemberWithProfile[]> => {
      if (!effectiveBrokerId) return [];

      const { data: rows, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_owner_id', effectiveBrokerId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const memberRows = rows ?? [];
      const userIds = memberRows.map((m) => m.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profile_directory' as never)
        .select('id, full_name, email')
        .in('id', userIds);
      if (profilesError) throw profilesError;

      type DirectoryRow = { id: string; full_name: string | null; email: string | null };
      const profileMap = new Map<string, DirectoryRow>(
        ((profiles ?? []) as unknown as DirectoryRow[]).map((p) => [p.id, p]),
      );

      return memberRows.map((m) => {
        const profile = profileMap.get(m.user_id);
        const resolvedEmail = profile?.email?.trim() || null;
        const resolvedName = profile?.full_name?.trim() || resolvedEmail || 'Membro sem nome definido';

        return {
          ...m,
          permissions: (m.permissions ?? {}) as Permissions,
          profile: {
            full_name: resolvedName,
            email: resolvedEmail,
          },
        } as OrganizationMemberWithProfile;
      });
    },
    enabled: !!effectiveBrokerId,
  });

  const members = data ?? [];

  return {
    members,
    activeMembers: members.filter((m) => m.is_active),
    isLoading,
  };
};
