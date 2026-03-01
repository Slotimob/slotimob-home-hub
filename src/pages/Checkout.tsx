import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('plan') || 'pro';
  const billingCycle = searchParams.get('cycle') || 'annual';
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { plan_id: planId, billing_cycle: billingCycle },
    });

    if (error || !data) {
      const msg = 'Erro ao iniciar checkout. Tente novamente.';
      setError(msg);
      toast.error(msg);
      throw new Error(msg);
    }

    // If user already has this plan, redirect to portal
    if (data.type === 'portal' && data.url) {
      window.location.href = data.url;
      throw new Error('Redirecting to portal');
    }

    return data.clientSecret as string;
  }, [planId, billingCycle]);

  const planNames: Record<string, string> = {
    essencial: 'Essencial',
    pro: 'Pro',
    business: 'Business',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">
              Assinar Plano {planNames[planId] || planId}
            </h1>
            <p className="text-sm text-muted-foreground">
              Pagamento seguro processado pelo Stripe
            </p>
          </div>
        </div>
      </div>

      {/* Checkout container */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {error ? (
          <div className="text-center py-16">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => navigate('/#pricing')} variant="outline">
              Voltar aos planos
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout className="stripe-embedded-checkout" />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
