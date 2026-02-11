import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ModulePermissions {
  [action: string]: boolean;
}

export interface Permissions {
  assets?: ModulePermissions;
  crm?: ModulePermissions;
  financial?: ModulePermissions;
  documents?: ModulePermissions;
  [module: string]: ModulePermissions | undefined;
}

export interface PermissionsResult {
  permissions: Permissions | null;
  roleLabel: string | null;
  isOwner: boolean;
  isLoading: boolean;
  hasPermission: (module: string, action: string) => boolean;
  can: (module: string, action: string) => boolean;
}

/**
 * Hook that provides granular permission checking for organization members.
 * Owners (the organization_owner) have full access by default.
 * Members get permissions from the organization_members JSONB column.
 */
export const usePermissions = (): PermissionsResult => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['member-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check if user is a member of any organization
      const { data: membership, error } = await supabase
        .from('organization_members')
        .select('permissions, role_label, organization_owner_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching permissions:', error);
        return null;
      }

      // If no membership found, user is an owner (full access)
      if (!membership) {
        return { isOwner: true, permissions: null, roleLabel: null };
      }

      return {
        isOwner: false,
        permissions: membership.permissions as Permissions,
        roleLabel: membership.role_label,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isOwner = data?.isOwner ?? true;
  const permissions = data?.permissions ?? null;
  const roleLabel = data?.roleLabel ?? null;

  const hasPermission = (module: string, action: string): boolean => {
    // Owners always have full access
    if (isOwner) return true;
    if (!permissions) return false;
    return permissions[module]?.[action] === true;
  };

  // Alias
  const can = hasPermission;

  return { permissions, roleLabel, isOwner, isLoading, hasPermission, can };
};
