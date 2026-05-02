import { useAuth } from './useAuth';
import { usePermissions, FULL_MODULE_PERMISSION, PERMISSION_MODULES_KEYS } from './usePermissions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Permissions, ModulePermission } from './usePermissions';
import { useCallback, useMemo } from 'react';

export type EditScope = 'owner' | 'super_admin' | 'delegate' | 'none';

export interface CanEditPermissionsResult {
  canEdit: boolean;
  scope: EditScope;
  grantableScope: Permissions;
  canEditMember: (target: { id: string; permissions: Permissions; isOwner: boolean }) => boolean;
  isLoading: boolean;
}

export function useCanEditPermissions(): CanEditPermissionsResult {
  const { user } = useAuth();
  const { isOwner, permissions } = usePermissions();

  const { data: isSuperAdmin, isLoading: isSuperAdminLoading } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .maybeSingle();
      return data?.is_super_admin === true;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const scope = useMemo<EditScope>(() => {
    if (isOwner) return 'owner';
    if (isSuperAdmin) return 'super_admin';
    if (permissions?.manage_team_permissions?.edit === true) return 'delegate';
    return 'none';
  }, [isOwner, isSuperAdmin, permissions]);

  const canEdit = scope !== 'none';

  const grantableScope = useMemo<Permissions>(() => {
    if (scope === 'owner' || scope === 'super_admin') {
      const full: Permissions = {};
      for (const key of PERMISSION_MODULES_KEYS) {
        full[key] = { ...FULL_MODULE_PERMISSION };
      }
      full['manage_team_permissions'] = { ...FULL_MODULE_PERMISSION };
      return full;
    }
    if (scope === 'delegate' && permissions) {
      const delegateScope: Permissions = {};
      for (const key of Object.keys(permissions)) {
        if (key === 'manage_team_permissions') continue; // delegate cannot grant this
        const mod = permissions[key];
        if (mod) delegateScope[key] = { ...mod };
      }
      return delegateScope;
    }
    return {};
  }, [scope, permissions]);

  const canEditMember = useCallback((target: { id: string; permissions: Permissions; isOwner: boolean }) => {
    if (!user?.id || target.id === user.id) return false;
    if (scope === 'none') return false;
    if (scope === 'owner') return !target.isOwner; // owner can edit all except self
    if (scope === 'super_admin') return true;
    // delegate
    if (target.isOwner) return false;
    if (target.permissions?.manage_team_permissions?.edit === true) return false;
    return true;
  }, [scope, user?.id]);

  return {
    canEdit,
    scope,
    grantableScope,
    canEditMember,
    isLoading: isSuperAdminLoading,
  };
}
