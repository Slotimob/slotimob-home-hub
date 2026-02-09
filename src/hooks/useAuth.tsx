import { useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isRefreshing = useRef(false);
  const hasUser = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        hasUser.current = !!currentSession?.user;
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      hasUser.current = !!currentSession?.user;
      setLoading(false);
    });

    // Proactively refresh when user returns to tab
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible' || isRefreshing.current) return;

      // Only attempt refresh if user was previously logged in
      if (!hasUser.current) return;

      isRefreshing.current = true;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          // Try refreshing once
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            console.warn('Session expired, redirecting to auth');
            setUser(null);
            setSession(null);
            hasUser.current = false;
            navigate('/auth');
          }
        }
      } catch (e) {
        console.error('Error checking session:', e);
      } finally {
        isRefreshing.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [navigate]);

  const signOut = async () => {
    hasUser.current = false;
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return { user, session, loading, signOut };
};
