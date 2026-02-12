import { useEffect, useState, useRef, useCallback } from 'react';
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
  const currentUserIdRef = useRef<string | null>(null);

  // Stable updater that only triggers re-renders when user actually changes
  const updateAuthState = useCallback((newSession: Session | null) => {
    const newUserId = newSession?.user?.id ?? null;
    const changed = newUserId !== currentUserIdRef.current;

    if (changed) {
      currentUserIdRef.current = newUserId;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      hasUser.current = !!newSession?.user;
    } else if (newSession) {
      // Same user, silently update session ref without state update
      // This avoids re-renders when only the token changed
      setSession(prev => {
        // Only update if access_token actually changed (for hooks that depend on session)
        if (prev?.access_token !== newSession.access_token) {
          return newSession;
        }
        return prev;
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // For SIGNED_OUT, always update
        if (event === 'SIGNED_OUT') {
          currentUserIdRef.current = null;
          setSession(null);
          setUser(null);
          hasUser.current = false;
          setLoading(false);
          return;
        }

        // For token refresh, don't cause re-renders if same user
        if (event === 'TOKEN_REFRESHED') {
          // Silently update session reference without user state change
          if (currentSession) {
            setSession(currentSession);
          }
          return;
        }

        updateAuthState(currentSession);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      updateAuthState(currentSession);
    });

    // Proactively refresh when user returns to tab — but DON'T re-render
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible' || isRefreshing.current) return;
      if (!hasUser.current) return;

      isRefreshing.current = true;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            console.warn('Session expired, redirecting to auth');
            currentUserIdRef.current = null;
            setUser(null);
            setSession(null);
            hasUser.current = false;
            navigate('/auth');
          }
        }
        // If session is valid, onAuthStateChange will handle it
        // No need to manually set state here
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
  }, [navigate, updateAuthState]);

  const signOut = async () => {
    hasUser.current = false;
    currentUserIdRef.current = null;
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return { user, session, loading, signOut };
};
