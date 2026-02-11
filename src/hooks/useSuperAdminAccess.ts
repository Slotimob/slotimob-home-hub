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
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_super_admin', {
          p_user_id: user.id,
        });

        if (error) {
          console.error('Error checking super_admin role:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data === true);
        }
      } catch {
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [user]);

  return { isSuperAdmin, isLoading };
};
