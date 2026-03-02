import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Silent OAuth callback page.
 * When opened inside a popup (window.opener exists), it waits for the
 * Supabase auth session to be established from the URL hash/params,
 * then closes itself. The parent tab's onAuthStateChange listener
 * picks up the SIGNED_IN event via shared storage.
 *
 * If opened as a regular navigation (no opener), it redirects to /dashboard.
 */
const AuthCallback = () => {
  useEffect(() => {
    const isPopup = !!window.opener;

    const handleSession = async () => {
      // Supabase client auto-parses the hash fragment and sets the session.
      // We just need to wait for it to complete.
      const { data: { session } } = await supabase.auth.getSession();

      if (isPopup) {
        // Session is set in shared storage; parent tab will detect it.
        window.close();
        return;
      }

      // Fallback: if somehow opened as a full page, redirect.
      window.location.replace(session ? '/dashboard' : '/auth');
    };

    // Also listen for the auth event in case getSession resolves before the hash is parsed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && isPopup) {
        subscription.unsubscribe();
        window.close();
      }
    });

    handleSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Autenticando...</p>
    </div>
  );
};

export default AuthCallback;
