import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { SlotiLogo } from '@/components/SlotiLogo';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthReady, user } = useAuthContext();
  const navigate = useNavigate();
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setProfileChecked(true);
      return;
    }

    let cancelled = false;

    const runChecks = async () => {
      // Block sessions still at aal1 when the user has a verified TOTP factor
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
          if (!cancelled) navigate('/auth', { replace: true });
          return;
        }
      } catch {
        // fail open
      }

      // Check if user signed up via Google and is missing fiscal data
      const provider = user.app_metadata?.provider;
      if (provider === 'google') {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('cpf, cnpj, person_type')
            .eq('id', user.id)
            .maybeSingle();
          if (data && !data.cpf && !data.cnpj && !cancelled) {
            navigate('/auth?complete_profile=true', { replace: true });
          }
        } catch {
          // fail open
        }
      }

      if (!cancelled) setProfileChecked(true);
    };

    void runChecks();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, user, navigate]);


  if (!isAuthReady || !profileChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <SlotiLogo size="lg" className="mb-2" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">
          Carregando suas configurações e seu Plano...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
