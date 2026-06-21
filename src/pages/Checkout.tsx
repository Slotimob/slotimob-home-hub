import { useState, useEffect, useMemo, createContext, useContext, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2,
  Check,
  Zap,
  Rocket,
  Building2,
  Shield,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { usePlanPricing } from '@/hooks/usePlanPricing';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Meta
// ============================================================================

type PaidPlan = 'pro' | 'business';
type AnyPlan = 'start' | PaidPlan;

interface PlanMeta {
  id: PaidPlan;
  name: string;
  icon: typeof Rocket;
  tagline: string;
  features: string[];
  units: string;
  users: string;
  popular: boolean;
}

const plansMeta: PlanMeta[] = [
  {
    id: 'pro',
    name: 'Pro',
    icon: Rocket,
    tagline: 'Gestão completa com IA',
    units: '50 unidades',
    users: '1 usuário',
    features: ['CRM Pipeline', 'Chat IA', 'Contratos ilimitados', 'Relatórios e DRE', 'WhatsApp integrado'],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    icon: Building2,
    tagline: 'Escale com equipe',
    units: '150 unidades',
    users: '4 usuários',
    features: ['Tudo do Pro', 'Gestão de equipe', 'Roleta de leads', 'Split de comissões'],
    popular: false,
  },
];

const formatPrice = (value: number) => value.toFixed(2).replace('.', ',');

// ============================================================================
// Checkout Context
// ============================================================================

interface CheckoutContextValue {
  step: number;
  setStep: (n: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (n: number) => void;
  selectedPlan: AnyPlan;
  setSelectedPlan: (p: AnyPlan) => void;
  isAnnual: boolean;
  setIsAnnual: (v: boolean) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

function useCheckoutCtx() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckoutCtx must be used inside CheckoutContext');
  return ctx;
}

// ============================================================================
// Stepper
// ============================================================================

const STEPS = [
  { n: 1, label: 'Conta' },
  { n: 2, label: 'Plano' },
  { n: 3, label: 'Pagamento' },
  { n: 4, label: 'Addons' },
  { n: 5, label: 'Confirmar' },
];

function CheckoutStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center">
        {STEPS.map((s, idx) => {
          const done = s.n < currentStep;
          const active = s.n === currentStep;
          const isLast = idx === STEPS.length - 1;
          return (
            <div key={s.n} className="flex-1 flex items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors border-2',
                    done && 'bg-accent border-accent text-accent-foreground',
                    active && 'bg-primary border-primary text-primary-foreground',
                    !done && !active && 'bg-card border-border text-muted-foreground'
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : s.n}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    active ? 'text-foreground' : 'text-muted-foreground',
                    !active && 'hidden sm:block'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 -mt-5 transition-colors',
                    done ? 'bg-accent' : 'bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Step 1 — Account
// ============================================================================

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function StepAccount() {
  const { nextStep, goToStep, selectedPlan, isAnnual } = useCheckoutCtx();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-skip if logged in or returning from OAuth
  useEffect(() => {
    if (authLoading) return;
    const stepParam = searchParams.get('step');
    if (user) {
      goToStep(stepParam ? Number(stepParam) : 2);
    }
  }, [user, authLoading, searchParams, goToStep]);

  const handleGoogleSignIn = async () => {
    const cycle = isAnnual ? 'annual' : 'monthly';
    const planParam = selectedPlan === 'start' ? 'pro' : selectedPlan;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/checkout?plan=${planParam}&cycle=${cycle}&step=2`,
      },
    });
  };

  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/checkout`,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    toast.success('Conta criada! Bem-vindo ao Slotimob 🎉');
    nextStep();
  };

  if (authLoading || user) {
    return (
      <div className="max-w-md mx-auto py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-foreground">Crie sua conta grátis</h2>
        <p className="text-sm text-muted-foreground mt-1">7 dias de PRO grátis · sem cartão</p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogleSignIn}
      >
        <GoogleIcon />
        Continuar com Google
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-muted/30 px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <form onSubmit={handleEmailSignUp} className="space-y-3">
        <Input
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Senha (mín. 8 caracteres)"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Confirmar senha"
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Criar conta e continuar →'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Já tem conta?{' '}
        <Link to="/auth?redirect=/checkout" className="text-accent hover:underline font-medium">
          Entrar
        </Link>
      </p>
    </div>
  );
}

// ============================================================================
// Step 2 — Plan
// ============================================================================

interface PlanCardData {
  id: AnyPlan;
  name: string;
  icon: typeof Rocket;
  tagline: string;
  units: string;
  users: string;
  features: string[];
  popular: boolean;
  isFree: boolean;
}

function StepPlan() {
  const {
    nextStep,
    prevStep,
    goToStep,
    selectedPlan,
    setSelectedPlan,
    isAnnual,
    setIsAnnual,
  } = useCheckoutCtx();

  const { data: pricing, isLoading: pricingLoading } = usePlanPricing();
  const { slots } = useEarlyAdopterCount();

  const allPlans: PlanCardData[] = useMemo(
    () => [
      {
        id: 'start',
        name: 'Start',
        icon: Zap,
        tagline: 'Comece gratuitamente',
        units: '5 unidades',
        users: '1 usuário',
        features: ['Contratos básicos', 'Relatórios simples', 'Suporte por email'],
        popular: false,
        isFree: true,
      },
      ...plansMeta.map((p) => ({ ...p, isFree: false })),
    ],
    []
  );

  const getEarlyAdopterAvailable = (planId: PaidPlan): boolean => {
    const slotData = slots[planId];
    return !!slotData && slotData.remaining > 0;
  };

  const anyEarlyAdopter =
    getEarlyAdopterAvailable('pro') || getEarlyAdopterAvailable('business');

  const getDisplayPrice = (planId: PaidPlan): number => {
    const p = pricing?.[planId];
    if (!p) return 0;
    if (getEarlyAdopterAvailable(planId)) return p.price_early_adopter;
    return isAnnual ? p.price_annual : p.price_original;
  };

  const getOriginalPrice = (planId: PaidPlan): number | null => {
    const p = pricing?.[planId];
    if (!p) return null;
    if (getEarlyAdopterAvailable(planId)) return p.price_original;
    if (isAnnual && p.price_original > p.price_annual) return p.price_original;
    return null;
  };

  const handleSelect = (plan: PlanCardData) => {
    setSelectedPlan(plan.id);
    if (plan.id === 'start') {
      goToStep(4);
    } else {
      nextStep();
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={prevStep} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground">Escolha seu plano</h2>
        <p className="text-muted-foreground mt-2">
          Você pode mudar de plano a qualquer momento
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 mb-8">
        <Label
          className={cn(
            'text-sm cursor-pointer',
            !isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}
        >
          Mensal
        </Label>
        <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
        <Label
          className={cn(
            'text-sm cursor-pointer',
            isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}
        >
          Anual
        </Label>
        {isAnnual && (
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 text-xs">
            Economize até 34%
          </Badge>
        )}
      </div>

      {anyEarlyAdopter && (
        <div className="flex justify-center mb-6">
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <Sparkles className="h-3 w-3 mr-1" />
            Preço Early Adopter disponível
          </Badge>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {allPlans.map((plan) => {
          const selected = plan.id === selectedPlan;
          const isPaid = !plan.isFree;
          const paidId = plan.id as PaidPlan;
          const earlyAdopter = isPaid && getEarlyAdopterAvailable(paidId);
          const displayPrice = isPaid ? getDisplayPrice(paidId) : 0;
          const originalPrice = isPaid ? getOriginalPrice(paidId) : null;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl border bg-card p-6 transition-all duration-200 flex flex-col',
                selected
                  ? 'ring-2 ring-accent shadow-lg scale-[1.02] border-accent'
                  : plan.popular
                  ? 'ring-2 ring-accent/40 border-accent/40'
                  : 'border-border'
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                  MAIS POPULAR
                </Badge>
              )}

              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <plan.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                </div>
              </div>

              <div className="mb-5">
                {plan.isFree ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">Grátis</span>
                  </div>
                ) : pricingLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
                    {earlyAdopter && (
                      <Badge className="mt-2 bg-accent/10 text-accent border-accent/20 text-[10px]">
                        <Zap className="h-3 w-3 mr-1" />
                        Early Adopter
                      </Badge>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <Badge variant="outline" className="text-xs">{plan.units}</Badge>
                <Badge variant="outline" className="text-xs">{plan.users}</Badge>
              </div>

              <div className="space-y-2 mb-6 flex-1">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
                    <span className="text-sm text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handleSelect(plan)}
                className="w-full"
                variant={plan.popular || selected ? 'default' : 'outline'}
              >
                {plan.isFree ? 'Começar grátis' : 'Selecionar'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Step 3-5 — Placeholders
// ============================================================================

function StepPayment() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 text-center text-muted-foreground">
      Pagamento — em breve (Etapa 8)
    </div>
  );
}

function StepAddons() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 text-center text-muted-foreground">
      Addons — em breve (Etapa 8)
    </div>
  );
}

function StepConfirm() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 text-center text-muted-foreground">
      Confirmação — em breve (Etapa 8)
    </div>
  );
}

// ============================================================================
// Orchestrator
// ============================================================================

export default function CheckoutPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPlan = searchParams.get('plan') as AnyPlan | null;
  const rawStep = Number(searchParams.get('step'));
  const initialPlan: AnyPlan =
    rawPlan && ['start', 'pro', 'business'].includes(rawPlan) ? rawPlan : 'pro';

  const [step, setStep] = useState<number>(
    rawStep >= 1 && rawStep <= 5 ? rawStep : 1
  );
  const [selectedPlan, setSelectedPlan] = useState<AnyPlan>(initialPlan);
  const [isAnnual, setIsAnnual] = useState(searchParams.get('cycle') !== 'monthly');

  // Sync URL
  useEffect(() => {
    const cycle = isAnnual ? 'annual' : 'monthly';
    const planParam = selectedPlan === 'start' ? 'start' : selectedPlan;
    setSearchParams({ plan: planParam, cycle, step: String(step) }, { replace: true });
  }, [selectedPlan, isAnnual, step, setSearchParams]);

  const nextStep = () => setStep((s) => Math.min(5, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));
  const goToStep = (n: number) => setStep(Math.max(1, Math.min(5, n)));

  const ctxValue: CheckoutContextValue = {
    step,
    setStep,
    nextStep,
    prevStep,
    goToStep,
    selectedPlan,
    setSelectedPlan,
    isAnnual,
    setIsAnnual,
  };

  return (
    <CheckoutContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <span className="text-primary font-bold text-lg">Slotimob</span>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Pagamento seguro via Asaas</span>
            </div>
          </div>
        </header>

        <CheckoutStepper currentStep={step} />

        <main className="flex-1">
          {step === 1 && <StepAccount />}
          {step === 2 && <StepPlan />}
          {step === 3 && <StepPayment />}
          {step === 4 && <StepAddons />}
          {step === 5 && <StepConfirm />}
        </main>

        <footer className="border-t bg-card py-4">
          <p className="text-center text-xs text-muted-foreground">
            © Slotimob · Pagamento processado pelo Asaas
          </p>
        </footer>
      </div>
    </CheckoutContext.Provider>
  );
}
