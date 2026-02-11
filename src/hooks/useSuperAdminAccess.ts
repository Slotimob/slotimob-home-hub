import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useSuperAdminAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Don't check until auth is done loading
    if (authLoading) return;

    if (!user) {
      setIsSuperAdmin(false);
      setIsChecking(false);
      return;
    }

    const check = async () => {
      setIsChecking(true);
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
        setIsChecking(false);
      }
    };

    check();
  }, [user, authLoading]);

  // Still loading if auth is loading OR we're actively checking the role
  const isLoading = authLoading || isChecking || (!!user && !isSuperAdmin && isChecking !== false && !isChecking);
  
  return { isSuperAdmin, isLoading: authLoading || isChecking };
};
