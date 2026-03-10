import { useEffect, useState, useRef, useCallback, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

// ── Types ──
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True only after user + roles have been fully resolved */
  isAuthReady: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  userRole: 'owner' | 'agent';
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthReady: false,
  isSuperAdmin: false,
  isAdmin: false,
  userRole: 'owner',
  signOut: async () => {},
});

// ── Provider ──
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Role states
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'agent'>('owner');
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const isRefreshing = useRef(false);
  const hasUser = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const navigateRef = useRef<((path: string) => void) | null>(null);

  // Stable updater
  const updateAuthState = useCallback((newSession: Session | null) => {
    const newUserId = newSession?.user?.id ?? null;
    const changed = newUserId !== currentUserIdRef.current;

    if (changed) {
      currentUserIdRef.current = newUserId;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      hasUser.current = !!newSession?.user;
      // Reset roles when user changes
      if (!newSession?.user) {
        setIsSuperAdmin(false);
        setIsAdmin(false);
        setUserRole('owner');
        setRolesLoaded(true); // No user = roles are "loaded" (nothing to load)
      } else {
        setRolesLoaded(false); // Will load roles
      }
    } else if (newSession) {
      setSession(prev => {
        if (prev?.access_token !== newSession.access_token) {
          return newSession;
        }
        return prev;
      });
    }

    setLoading(false);
  }, []);

  // Load roles when user is set
  useEffect(() => {
    if (loading) return;

    if (!user) {
      setRolesLoaded(true);
      return;
    }

    let cancelled = false;

    const loadRoles = async () => {
      try {
        // Try to refresh session first to avoid JWT errors
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.warn('Failed to refresh session during role check:', refreshError.message);
          }
        }

        // Fetch roles in parallel
        const [superAdminResult, adminResult, agentResult, memberResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'super_admin')
            .maybeSingle(),
          supabase
            .rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase
            .rpc('has_role', { _user_id: user.id, _role: 'agent' as any }),
          // Also check if user is an organization member (multi-tenant)
          supabase
            .from('organization_members')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        setIsSuperAdmin(!!superAdminResult.data);
        setIsAdmin(adminResult.data === true);
        // User is an 'agent' if they have the role OR are an org member
        setUserRole((agentResult.data === true || !!memberResult.data) ? 'agent' : 'owner');
      } catch (err) {
        console.error('Error loading roles:', err);
        // On error, default to safe values
        if (!cancelled) {
          setIsSuperAdmin(false);
          setIsAdmin(false);
          setUserRole('owner');
        }
      } finally {
        if (!cancelled) {
          setRolesLoaded(true);
        }
      }
    };

    loadRoles();
    return () => { cancelled = true; };
  }, [user?.id, loading]);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (event === 'SIGNED_OUT') {
          currentUserIdRef.current = null;
          setSession(null);
          setUser(null);
          hasUser.current = false;
          setIsSuperAdmin(false);
          setIsAdmin(false);
          setUserRole('owner');
          setRolesLoaded(true);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          if (currentSession) {
            setSession(currentSession);
          }
          return;
        }

        // Handle invited user flow: PASSWORD_RECOVERY means user clicked invite link
        if (event === 'PASSWORD_RECOVERY') {
          updateAuthState(currentSession);
          navigateRef.current?.('/reset-password');
          return;
        }

        updateAuthState(currentSession);
      }
    );

    // Check existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      updateAuthState(currentSession);
    });

    // Proactive refresh on tab visibility
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
            navigateRef.current?.('/auth');
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
  }, [updateAuthState]);

  const signOut = useCallback(async () => {
    hasUser.current = false;
    currentUserIdRef.current = null;
    await supabase.auth.signOut();
    navigateRef.current?.('/auth');
  }, []);

  const isAuthReady = !loading && rolesLoaded;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAuthReady,
      isSuperAdmin,
      isAdmin,
      userRole,
      signOut,
    }}>
      <NavigateInjector navigateRef={navigateRef} />
      {children}
    </AuthContext.Provider>
  );
};

/** Injects navigate into the ref so the provider can redirect without being inside Router children at init */
function NavigateInjector({ navigateRef }: { navigateRef: React.MutableRefObject<((path: string) => void) | null> }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate, navigateRef]);
  return null;
}

// ── Hooks ──

/** Primary hook — returns full auth context including isAuthReady */
export const useAuth = (): Pick<AuthContextType, 'user' | 'session' | 'loading' | 'signOut' | 'isAuthReady'> => {
  const ctx = useContext(AuthContext);
  return {
    user: ctx.user,
    session: ctx.session,
    loading: ctx.loading,
    signOut: ctx.signOut,
    isAuthReady: ctx.isAuthReady,
  };
};

/** Returns full context including roles — for components that need everything */
export const useAuthContext = () => useContext(AuthContext);
