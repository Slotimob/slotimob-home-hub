import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  /** Permission string in "module.action" format, e.g. "assets.delete" */
  permission: string;
  children: ReactNode;
  /** Optional fallback to render when denied (default: nothing) */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the user's granular permissions.
 * Owners always pass. Members need the specific permission set to true.
 * 
 * Usage: <PermissionGate permission="financial.create">...</PermissionGate>
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) return null;

  const [module, action] = permission.split('.');
  if (!module || !action) return null;

  if (hasPermission(module, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
