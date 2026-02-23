import { useAuthContext } from './useAuth';

export const useSuperAdminAccess = () => {
  const { isSuperAdmin, isAuthReady } = useAuthContext();

  return {
    isSuperAdmin,
    // Only report "not loading" when auth is fully ready
    isLoading: !isAuthReady,
  };
};
