import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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

    // Check if user signed up via Google and is missing fiscal data
    const provider = user.app_metadata?.provider;
    if (provider === 'google') {
      const checkProfile = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('cpf, cnpj, person_type')
            .eq('id', user.id)
            .maybeSingle();
          if (data && !data.cpf && !data.cnpj) {
            navigate('/auth?complete_profile=true', { replace: true });
          }
        } catch {
          // fail open
        } finally {
          setProfileChecked(true);
        }
      };
      checkProfile();
    } else {
      setProfileChecked(true);
    }
  }, [isAuthReady, user, navigate]);

  if (!isAuthReady || !profileChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">
          Carregando suas configurações e seu Plano...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
