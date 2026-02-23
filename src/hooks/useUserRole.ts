import { useAuthContext } from './useAuth';

export type UserRole = 'owner' | 'agent';

export interface UserRoleInfo {
  role: UserRole;
  isOwner: boolean;
  isAgent: boolean;
  isLoading: boolean;
}

export const useUserRole = (): UserRoleInfo => {
  const { userRole, isAuthReady } = useAuthContext();

  return {
    role: userRole,
    isOwner: userRole === 'owner',
    isAgent: userRole === 'agent',
    isLoading: !isAuthReady,
  };
};
