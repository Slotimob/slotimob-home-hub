import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type CockpitRole = 'super_admin' | 'admin' | 'support' | 'moderator' | null;

export const useCockpitAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [cockpitRole, setCockpitRole] = useState<CockpitRole>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setIsChecking(true);
      return;
    }

    if (!user) {
      setCockpitRole(null);
      setIsChecking(false);
      return;
    }

    const check = async () => {
      setIsChecking(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking cockpit roles:', error);
          setCockpitRole(null);
        } else {
          const roles = (data || []).map((r) => r.role as string);
          // Priority: super_admin > admin > support > moderator
          if (roles.includes('super_admin')) setCockpitRole('super_admin');
          else if (roles.includes('admin')) setCockpitRole('admin');
          else if (roles.includes('support')) setCockpitRole('support');
          else if (roles.includes('moderator')) setCockpitRole('moderator');
          else setCockpitRole(null);
        }
      } catch {
        setCockpitRole(null);
      } finally {
        setIsChecking(false);
      }
    };

    check();
  }, [user, authLoading]);

  const isSuperAdmin = cockpitRole === 'super_admin';
  const isAdmin = cockpitRole === 'super_admin' || cockpitRole === 'admin';
  const isSupport = cockpitRole === 'super_admin' || cockpitRole === 'admin' || cockpitRole === 'support';
  const isModerator = cockpitRole === 'super_admin' || cockpitRole === 'admin' || cockpitRole === 'moderator';
  const hasCockpitAccess = cockpitRole !== null && cockpitRole !== 'moderator';

  return {
    cockpitRole,
    isSuperAdmin,
    isAdmin,
    isSupport,
    isModerator,
    hasCockpitAccess,
    isLoading: authLoading || isChecking,
  };
};
