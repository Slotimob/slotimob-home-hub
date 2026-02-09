import { useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleSessionRefresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        // Refresh failed — sign out to avoid stale JWT errors
        console.warn('Session refresh failed, signing out:', error?.message);
        setUser(null);
        setSession(null);
        navigate('/auth');
      }
    } catch (e) {
      console.error('Unexpected error refreshing session:', e);
    }
  }, [navigate]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // If token refresh failed, try manual refresh
        if (event === 'TOKEN_REFRESHED' && !session) {
          handleSessionRefresh();
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Proactively refresh when user returns to tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error?.message?.includes('expired') || (!session && user)) {
            handleSessionRefresh();
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [handleSessionRefresh, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return { user, session, loading, signOut };
};
