import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useSuperAdminAccess = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        console.log('[SuperAdmin] No user, setting false');
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('[SuperAdmin] Checking role for user:', user.id);
        const { data, error } = await supabase.rpc('is_super_admin', {
          p_user_id: user.id,
        });

        console.log('[SuperAdmin] RPC result:', { data, error });

        if (error) {
          console.error('Error checking super_admin role:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data === true);
        }
      } catch (e) {
        console.error('[SuperAdmin] Exception:', e);
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [user]);

  return { isSuperAdmin, isLoading };
};
