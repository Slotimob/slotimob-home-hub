import type { Permissions } from '@/hooks/usePermissions';

export interface PermissionViolation {
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete';
  reason: 'out_of_scope' | 'cannot_delegate_admin';
}

const ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

export function validatePermissionChange(args: {
  oldPermissions: Permissions;
  newPermissions: Permissions;
  grantableScope: Permissions;
}): { valid: boolean; violations: PermissionViolation[] } {
  const { oldPermissions, newPermissions, grantableScope } = args;
  const violations: PermissionViolation[] = [];

  // Collect all modules present in either old or new
  const allModules = new Set([
    ...Object.keys(oldPermissions),
    ...Object.keys(newPermissions),
  ]);

  for (const module of allModules) {
    for (const action of ACTIONS) {
      const oldVal = oldPermissions[module]?.[action] === true;
      const newVal = newPermissions[module]?.[action] === true;

      if (oldVal !== newVal) {
        // manage_team_permissions changes by delegate = always a violation
        if (module === 'manage_team_permissions') {
          violations.push({ module, action, reason: 'cannot_delegate_admin' });
          continue;
        }

        // Check if the change is within grantable scope
        if (grantableScope[module]?.[action] !== true) {
          violations.push({ module, action, reason: 'out_of_scope' });
        }
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
