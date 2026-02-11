import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useSuperAdminAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true); // Start true to prevent premature redirect

  useEffect(() => {
    if (authLoading) {
      setIsChecking(true);
      return;
    }

    if (!user) {
      setIsSuperAdmin(false);
      setIsChecking(false);
      return;
    }

    const check = async () => {
      setIsChecking(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .maybeSingle();

        if (error) {
          console.error('Error checking super_admin role:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(!!data);
        }
      } catch {
        setIsSuperAdmin(false);
      } finally {
        setIsChecking(false);
      }
    };

    check();
  }, [user, authLoading]);

  return { isSuperAdmin, isLoading: authLoading || isChecking };
};
