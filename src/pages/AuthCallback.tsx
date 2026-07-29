import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { MfaChallengeForm } from '@/components/security/MfaChallengeForm';

/**
 * Silent OAuth callback page.
 * When opened inside a popup (window.opener exists), it waits for the
 * Supabase auth session to be established from the URL hash/params,
 * then closes itself. The parent tab's onAuthStateChange listener
 * picks up the SIGNED_IN event via shared storage.
 *
 * If opened as a regular navigation (no opener), it redirects to /dashboard
 * — unless the account requires a second factor, in which case the TOTP
 * challenge is rendered before completing the redirect.
 */
const AuthCallback = () => {
  const [needsMfa, setNeedsMfa] = useState(false);

  useEffect(() => {
    const isPopup = !!window.opener;

    const requiresMfa = async (): Promise<boolean> => {
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        return aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel;
      } catch {
        return false;
      }
    };

    const handleSession = async () => {
      // Supabase client auto-parses the hash fragment and sets the session.
      // We just need to wait for it to complete.
      const { data: { session } } = await supabase.auth.getSession();

      if (isPopup) {
        // Session is set in shared storage; parent tab will detect it.
        window.close();
        return;
      }

      if (session && (await requiresMfa())) {
        setNeedsMfa(true);
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

  const handleCancel = async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth');
  };

  if (needsMfa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm rounded-lg border border-border p-6">
          <MfaChallengeForm
            title="Verificação em duas etapas"
            description="Digite o código de 6 dígitos do seu aplicativo autenticador."
            onSuccess={() => window.location.replace('/dashboard')}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Autenticando...</p>
    </div>
  );
};

export default AuthCallback;
