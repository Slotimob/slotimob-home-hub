import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LandingPage from './LandingPage';

/**
 * Index page — renders the Landing immediately (no auth blocking).
 * Authenticated users are silently redirected to /dashboard via a
 * lightweight session check (no role loading, no heavy queries).
 */
export default function Index() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session?.user) {
        // Handle post-OAuth checkout redirect
        const checkoutPlan = searchParams.get('checkout_plan');

        if (checkoutPlan && ['essencial', 'pro', 'business'].includes(checkoutPlan)) {
          try {
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
              body: { plan_id: checkoutPlan }
            });

            if (!error && data?.url) {
              window.location.href = data.url;
            } else if (error) {
              console.error('Post-OAuth checkout error:', error);
              toast.error('Erro ao iniciar checkout. Tente novamente na página de planos.');
            }
          } catch (err) {
            console.error('Post-OAuth checkout error:', err);
          }

          navigate('/dashboard', { replace: true });
          return;
        }

        // Normal redirect for authenticated users
        navigate('/dashboard', { replace: true });
        return;
      }

      // No session — show landing
      setChecked(true);
    };

    check();
    return () => { cancelled = true; };
  }, [navigate, searchParams]);

  // Render landing immediately — the redirect happens in background
  // Only show a brief blank if we haven't confirmed no-session yet
  if (!checked) {
    return <LandingPage />;
  }

  return <LandingPage />;
}
