import { useAuthContext } from './useAuth';

export const useAdminAccess = () => {
  const { isAdmin, isAuthReady } = useAuthContext();

  return {
    isAdmin,
    isLoading: !isAuthReady,
  };
};
