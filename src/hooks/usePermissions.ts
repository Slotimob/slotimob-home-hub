import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export const EMPTY_MODULE_PERMISSION: ModulePermission = {
  view: false,
  create: false,
  edit: false,
  delete: false,
};

export const FULL_MODULE_PERMISSION: ModulePermission = {
  view: true,
  create: true,
  edit: true,
  delete: true,
};

export interface Permissions {
  chat?: Partial<ModulePermission>;
  dashboard?: Partial<ModulePermission>;
  management?: Partial<ModulePermission>;
  properties?: Partial<ModulePermission>;
  units?: Partial<ModulePermission>;
  real_estate?: Partial<ModulePermission>;
  financial?: Partial<ModulePermission>;
  crm?: Partial<ModulePermission>;
  reports?: Partial<ModulePermission>;
  documents?: Partial<ModulePermission>;
  integrations?: Partial<ModulePermission>;
  [module: string]: Partial<ModulePermission> | undefined;
}

export const PERMISSION_MODULES_KEYS = [
  'chat',
  'dashboard',
  'management',
  'properties',
  'units',
  'real_estate',
  'financial',
  'crm',
  'reports',
  'documents',
  'integrations',
] as const;

export type PermissionModuleKey = (typeof PERMISSION_MODULES_KEYS)[number];

/** Safely resolve a module permission, defaulting missing fields to false */
export function resolveModulePermission(
  permissions: Permissions | null | undefined,
  module: string
): ModulePermission {
  const raw = permissions?.[module];
  if (!raw) return { ...EMPTY_MODULE_PERMISSION };
  return {
    view: raw.view === true,
    create: raw.create === true,
    edit: raw.edit === true,
    delete: raw.delete === true,
  };
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
    if (isOwner) return true;
    const resolved = resolveModulePermission(permissions, module);
    return (resolved as any)[action] === true;
  };

  const can = hasPermission;

  return { permissions, roleLabel, isOwner, isLoading, hasPermission, can };
};
