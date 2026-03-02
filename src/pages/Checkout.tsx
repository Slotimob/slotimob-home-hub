import { useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, Check, Zap, Rocket, Building2, Briefcase, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { usePlanPricing } from '@/hooks/usePlanPricing';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';
import { cn } from '@/lib/utils';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

type PaidPlan = 'essencial' | 'pro' | 'business';

interface PlanMeta {
  id: PaidPlan;
  name: string;
  icon: typeof Briefcase;
  tagline: string;
  features: string[];
  units: string;
  users: string;
  popular: boolean;
}

const plansMeta: PlanMeta[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    icon: Briefcase,
    tagline: 'Organize e comece a vender',
    units: '10 unidades',
    users: '1 usuário',
    features: ['CRM Pipeline', 'Financeiro básico', 'Contatos ilimitados'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Rocket,
    tagline: 'Gestão completa com IA',
    units: '50 unidades',
    users: '1 usuário',
    features: ['Tudo do Essencial', 'Chat IA', 'Contratos ilimitados', 'Relatórios e DRE', 'Gestão de ativos'],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    icon: Building2,
    tagline: 'Escale com equipe',
    units: '80 unidades',
    users: '3 usuários',
    features: ['Tudo do Pro', 'Gestão de equipe', 'Roleta de leads', 'Split de comissões'],
    popular: false,
  },
];

const formatPrice = (value: number) => value.toFixed(2).replace('.', ',');

export default function CheckoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>(
    (searchParams.get('plan') as PaidPlan) || 'pro'
  );
  const [isAnnual, setIsAnnual] = useState(searchParams.get('cycle') !== 'monthly');
  const [error, setError] = useState<string | null>(null);

  // Key to force re-mount of EmbeddedCheckoutProvider when plan/cycle changes
  const [sessionKey, setSessionKey] = useState(0);

  const { data: pricing, isLoading: pricingLoading } = usePlanPricing();
  const { slots } = useEarlyAdopterCount();

  const currentMeta = useMemo(() => plansMeta.find(p => p.id === selectedPlan)!, [selectedPlan]);

  const getEarlyAdopterAvailable = (planId: PaidPlan): boolean => {
    const slotData = slots[planId];
    return !!slotData && slotData.remaining > 0;
  };

  const isEarlyAdopter = getEarlyAdopterAvailable(selectedPlan);

  const displayPrice = useMemo(() => {
    const p = pricing?.[selectedPlan];
    if (!p) return 0;
    if (isEarlyAdopter) return p.price_early_adopter;
    return isAnnual ? p.price_annual : p.price_original;
  }, [pricing, selectedPlan, isAnnual, isEarlyAdopter]);

  const originalPrice = useMemo(() => {
    const p = pricing?.[selectedPlan];
    if (!p) return null;
    if (isEarlyAdopter) return p.price_original;
    if (isAnnual && p.price_original > p.price_annual) return p.price_original;
    return null;
  }, [pricing, selectedPlan, isAnnual, isEarlyAdopter]);

  // Sync URL params
  useEffect(() => {
    const cycle = isAnnual ? 'annual' : 'monthly';
    const params: Record<string, string> = { plan: selectedPlan, cycle };
    if (searchParams.get('mode')) params.mode = searchParams.get('mode')!;
    setSearchParams(params, { replace: true });
  }, [selectedPlan, isAnnual, setSearchParams]);

  const handlePlanChange = (planId: PaidPlan) => {
    if (planId === selectedPlan) return;
    setSelectedPlan(planId);
    setError(null);
    setSessionKey(k => k + 1);
  };

  const handleCycleChange = (annual: boolean) => {
    if (annual === isAnnual) return;
    setIsAnnual(annual);
    setError(null);
    setSessionKey(k => k + 1);
  };

  const billingCycle = isAnnual ? 'annual' : 'monthly';
  const checkoutMode = searchParams.get('mode') === 'immediate' ? 'immediate' : 'trial';
  const isGuest = !authLoading && !user;

  const fetchClientSecret = useCallback(async () => {
    const body: Record<string, string> = {
      plan_id: selectedPlan,
      billing_cycle: billingCycle,
      mode: isGuest ? 'immediate' : checkoutMode, // Guests always get immediate (no trial)
    };

    // For guests, don't send auth header — the edge function handles it
    const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
      body,
    });

    if (fnError || !data) {
      console.error('[Checkout] Edge Function error:', { fnError, data, params: body });
      const msg = data?.error || fnError?.message || 'Erro ao iniciar checkout. Tente novamente.';
      setError(msg);
      toast.error(msg);
      throw new Error(msg);
    }

    if (!data.clientSecret && data.type !== 'portal') {
      console.error('[Checkout] Missing clientSecret in response:', data);
      const msg = 'Resposta inesperada do servidor. Tente novamente.';
      setError(msg);
      toast.error(msg);
      throw new Error(msg);
    }

    if (data.type === 'portal' && data.url) {
      window.location.href = data.url;
      throw new Error('Redirecting to portal');
    }

    return data.clientSecret as string;
  }, [selectedPlan, billingCycle, checkoutMode, isGuest]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(user ? -1 as any : '/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Finalizar assinatura</h1>
            <p className="text-sm text-muted-foreground">Pagamento seguro processado pelo Stripe</p>
          </div>
          <Shield className="h-5 w-5 text-muted-foreground hidden sm:block" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Plan Selector Tabs */}
        <div className="flex flex-col items-center gap-5 mb-8">
          <div className="flex items-center rounded-xl border border-border bg-card p-1.5 shadow-sm gap-1">
            {plansMeta.map((plan) => {
              const active = plan.id === selectedPlan;
              return (
                <button
                  key={plan.id}
                  onClick={() => handlePlanChange(plan.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <plan.icon className="h-4 w-4" />
                  {plan.name}
                  {plan.popular && (
                    <Badge variant="secondary" className={cn(
                      'text-[10px] px-1.5 py-0 h-4 leading-none',
                      active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-accent/15 text-accent'
                    )}>
                      <Zap className="h-2.5 w-2.5 mr-0.5" />
                      Popular
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Billing cycle switch */}
          <div className="flex items-center gap-3">
            <Label className={cn('text-sm transition-colors cursor-pointer', !isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              Mensal
            </Label>
            <Switch checked={isAnnual} onCheckedChange={handleCycleChange} />
            <Label className={cn('text-sm transition-colors cursor-pointer', isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              Anual
            </Label>
            {isAnnual && (
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 text-xs">
                Economize até 34%
              </Badge>
            )}
          </div>
        </div>

        {/* Main content: Summary + Stripe */}
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Order Summary - Left column */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm sticky top-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <currentMeta.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Plano {currentMeta.name}</h2>
                  <p className="text-xs text-muted-foreground">{currentMeta.tagline}</p>
                </div>
              </div>

              {/* Price */}
              <div className="rounded-lg bg-muted/50 p-4 mb-5">
                {pricingLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">
                        R$ {formatPrice(displayPrice)}
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                    {originalPrice && originalPrice > displayPrice && (
                      <p className="text-xs text-muted-foreground mt-1 line-through">
                        R$ {formatPrice(originalPrice)}/mês
                      </p>
                    )}
                    {isEarlyAdopter && (
                      <Badge className="mt-2 bg-accent/10 text-accent border-accent/20 text-[10px]">
                        <Zap className="h-3 w-3 mr-1" />
                        Preço Early Adopter — vitalício
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {isAnnual
                        ? `Cobrado R$ ${formatPrice(displayPrice * 12)}/ano`
                        : 'Cobrado mensalmente'}
                    </p>
                  </>
                )}
              </div>

              {/* Limits */}
              <div className="flex gap-2 mb-5">
                <Badge variant="outline" className="text-xs">{currentMeta.units}</Badge>
                <Badge variant="outline" className="text-xs">{currentMeta.users}</Badge>
              </div>

              {/* Features */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Incluso no plano</p>
                {currentMeta.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Trial / immediate note */}
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  {isGuest || checkoutMode === 'immediate'
                    ? '🔒 Assinatura ativada imediatamente após o pagamento'
                    : '✨ 14 dias grátis · Cancele quando quiser'}
                </p>
              </div>

              {/* Guest info */}
              {isGuest && (
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-xs text-foreground font-medium mb-1">Não tem conta ainda?</p>
                  <p className="text-xs text-muted-foreground">
                    Sua conta será criada automaticamente com o e-mail informado no pagamento. Você receberá as instruções de acesso por e-mail.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stripe Checkout - Right column */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {error ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => { setError(null); setSessionKey(k => k + 1); }} variant="outline">
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <EmbeddedCheckoutProvider
                  key={sessionKey}
                  stripe={stripePromise}
                  options={{ fetchClientSecret }}
                >
                  <EmbeddedCheckout className="stripe-embedded-checkout" />
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
