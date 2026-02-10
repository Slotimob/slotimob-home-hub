import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LandingPage from './LandingPage';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle post-OAuth checkout redirect
    const checkoutPlan = searchParams.get('checkout_plan');
    
    if (!loading && user && checkoutPlan && ['essencial', 'pro', 'business'].includes(checkoutPlan)) {
      // User came back from Google OAuth with pending checkout intent
      const handleCheckout = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: { plan_id: checkoutPlan }
          });

          if (error) {
            console.error('Post-OAuth checkout error:', error);
            toast.error('Erro ao iniciar checkout. Tente novamente na página de planos.');
            navigate('/dashboard', { replace: true });
            return;
          }

          if (data?.url) {
            window.open(data.url, '_blank');
          }
          navigate('/dashboard', { replace: true });
        } catch (err) {
          console.error('Post-OAuth checkout error:', err);
          navigate('/dashboard', { replace: true });
        }
      };

      handleCheckout();
      return;
    }
    
    // Normal redirect for authenticated users
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate, searchParams]);

  // Show loading or landing page for non-authenticated users
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return <LandingPage />;
}
