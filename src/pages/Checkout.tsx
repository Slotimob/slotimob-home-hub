import { useState, useEffect, useMemo, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2,
  Check,
  Zap,
  Rocket,
  Building2,
  Shield,
  User,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { usePlanPricing } from '@/hooks/usePlanPricing';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';
import { cn } from '@/lib/utils';
import { useCepSearch } from '@/hooks/useCepSearch';

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

interface PlanCardData {
  id: AnyPlan;
  name: string;
  icon: typeof Rocket;
  tagline: string;
  popular: boolean;
  isFree: boolean;
}

const ADDONS = [
  { id: 'units_50', label: '+50 unidades', price: 39.9 },
  { id: 'user_1', label: '+1 usuário', price: 49.9 },
  { id: 'ai_sm', label: 'Créditos IA (S)', price: 24.9 },
  { id: 'ai_md', label: 'Créditos IA (M)', price: 39.9 },
  { id: 'ai_lg', label: 'Créditos IA (G)', price: 89.9 },
];

// ============================================================================
// Google icon
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

// ============================================================================
// Main Checkout
// ============================================================================

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const initialPlan = (searchParams.get('plan') as AnyPlan) || 'pro';
  const initialAnnual = searchParams.get('cycle') === 'annual';

  const [selectedPlan, setSelectedPlan] = useState<AnyPlan>(
    ['start', 'pro', 'business'].includes(initialPlan) ? initialPlan : 'pro'
  );
  const [isAnnual, setIsAnnual] = useState<boolean>(initialAnnual);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Account form (when not logged in)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Fiscal data
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const { cepData, isSearching: cepSearching, cepError, searchCep } = useCepSearch();

  // Checkout
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: pricing, isLoading: pricingLoading } = usePlanPricing();
  const { slots } = useEarlyAdopterCount();

  // URL sync
  useEffect(() => {
    const cycle = isAnnual ? 'annual' : 'monthly';
    setSearchParams({ plan: selectedPlan, cycle }, { replace: true });
  }, [selectedPlan, isAnnual, setSearchParams]);

  // Reset addons + annual when switching to start
  useEffect(() => {
    if (selectedPlan === 'start') {
      setSelectedAddons([]);
      setIsAnnual(false);
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (cepData) {
      setStreet(cepData.logradouro || '');
      setNeighborhood(cepData.bairro || '');
      setCity(cepData.localidade || '');
      setUf(cepData.uf || '');
    }
  }, [cepData]);

  const allPlans: PlanCardData[] = useMemo(
    () => [
      {
        id: 'start',
        name: 'Start',
        icon: Zap,
        tagline: 'Para começar',
        popular: false,
        isFree: true,
      },
      ...plansMeta.map((p) => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        tagline: p.tagline,
        popular: p.popular,
        isFree: false,
      })),
    ],
    []
  );

  const isEarlyAdopterAvailable = (planId: PaidPlan): boolean => {
    const slotData = slots[planId];
    return !!slotData && slotData.remaining > 0;
  };

  const getDisplayPrice = (planId: PaidPlan): number => {
    const p = pricing?.[planId];
    if (!p) return 0;
    if (isEarlyAdopterAvailable(planId)) {
      return isAnnual ? p.price_annual_early_adopter || p.price_early_adopter : p.price_early_adopter;
    }
    return isAnnual ? p.price_annual : p.price_original;
  };

  const planPrice = selectedPlan === 'start' ? 0 : getDisplayPrice(selectedPlan as PaidPlan);
  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const a = ADDONS.find((x) => x.id === id);
    return sum + (a?.price ?? 0);
  }, 0);
  const totalPrice = planPrice + addonsTotal;

  const planNameSelected = allPlans.find((p) => p.id === selectedPlan)?.name ?? '';

  const toggleAddon = (id: string) => {
    setSelectedAddons((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleGoogleSignIn = async () => {
    const cycle = isAnnual ? 'annual' : 'monthly';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/checkout?plan=${selectedPlan}&cycle=${cycle}`,
      },
    });
  };

  const handleCheckout = async (e?: FormEvent) => {
    e?.preventDefault();
    setCheckoutError(null);
    setAuthError(null);

    // 1. Sign up if not logged in
    if (!user) {
      if (!name || !email || !password) {
        setAuthError('Preencha todos os campos');
        return;
      }
      setIsCheckingOut(true);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (signUpError) {
        setAuthError(signUpError.message);
        setIsCheckingOut(false);
        return;
      }
      if (signUpData.user && !signUpData.session) {
        toast.info('Verifique seu email para continuar');
        setIsCheckingOut(false);
        return;
      }
      toast.success('Conta criada! Bem-vindo ao Slotimob 🎉');
    }

    // 2. Start plan = no charge
    if (selectedPlan === 'start') {
      setIsCheckingOut(false);
      navigate('/dashboard');
      return;
    }

    // 3. Paid: call create-checkout-session
    setIsCheckingOut(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          product_type: 'subscription',
          plan_id: selectedPlan,
          billing_cycle: isAnnual ? 'annual' : 'monthly',
        },
      });

      if (fnError || !data?.url) {
        const msg = data?.error || fnError?.message || 'Erro ao iniciar checkout. Tente novamente.';
        setCheckoutError(msg);
        toast.error(msg);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.';
      setCheckoutError(msg);
      toast.error(msg);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const ctaDisabled =
    isCheckingOut || (!user && (!name || !email || !password));

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-primary font-bold text-lg">
            Slotimob
          </Link>
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← Voltar ao site
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Pagamento seguro via Asaas</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 lg:py-12 flex-1">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 items-start">
          {/* LEFT — Order summary */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-8 space-y-6">
            <h2 className="font-semibold text-foreground">Resumo do pedido</h2>

            {/* Plan selector */}
            <div className="space-y-2">
              {allPlans.map((plan) => {
                const selected = plan.id === selectedPlan;
                const isPaid = !plan.isFree;
                const paidId = plan.id as PaidPlan;
                const earlyAdopter = isPaid && isEarlyAdopterAvailable(paidId);
                const price = isPaid ? getDisplayPrice(paidId) : 0;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                      selected
                        ? 'border-accent bg-accent/5 ring-1 ring-accent'
                        : 'border-border bg-card hover:border-accent/40'
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                        selected ? 'border-accent bg-accent' : 'border-border'
                      )}
                    >
                      {selected && <Check className="h-3 w-3 text-accent-foreground" />}
                    </div>
                    <plan.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">{plan.name}</span>
                        {plan.popular && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-accent text-accent-foreground">
                            Popular
                          </Badge>
                        )}
                        {earlyAdopter && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent border-accent/20">
                            Early
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{plan.tagline}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">
                      {plan.isFree ? (
                        'Grátis'
                      ) : pricingLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        `R$ ${formatPrice(price)}`
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Billing toggle */}
            {selectedPlan !== 'start' && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">Cobrança</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAnnual(false)}
                    className={cn(
                      'text-sm',
                      !isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Mensal
                  </button>
                  <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                  <button
                    type="button"
                    onClick={() => setIsAnnual(true)}
                    className={cn(
                      'text-sm',
                      isAnnual ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    Anual
                  </button>
                  {isAnnual && (
                    <Badge variant="secondary" className="text-xs bg-accent/10 text-accent border-accent/20">
                      -34%
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Addons */}
            {selectedPlan !== 'start' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Adicionais
                </p>
                {ADDONS.map((addon) => {
                  const selected = selectedAddons.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={cn(
                        'flex items-center justify-between w-full rounded-lg border px-3 py-2.5 text-sm transition-all',
                        selected
                          ? 'border-accent bg-accent/5 text-foreground'
                          : 'border-border text-muted-foreground hover:border-accent/30'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-4 w-4 rounded border-2 flex items-center justify-center',
                            selected ? 'border-accent bg-accent' : 'border-border'
                          )}
                        >
                          {selected && <Check className="h-2.5 w-2.5 text-accent-foreground" />}
                        </div>
                        <span>{addon.label}</span>
                      </div>
                      <span className="font-medium">+R$ {formatPrice(addon.price)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Price summary */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plano {planNameSelected}</span>
                <span>
                  {selectedPlan === 'start' ? 'Grátis' : `R$ ${formatPrice(planPrice)}`}
                </span>
              </div>
              {selectedAddons.map((id) => {
                const addon = ADDONS.find((a) => a.id === id);
                if (!addon) return null;
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{addon.label}</span>
                    <span>+R$ {formatPrice(addon.price)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-border">
                <span>Total</span>
                <span>
                  {selectedPlan === 'start'
                    ? 'Grátis'
                    : `R$ ${formatPrice(totalPrice)}/mês`}
                </span>
              </div>
              {isAnnual && selectedPlan !== 'start' && (
                <p className="text-xs text-muted-foreground text-right">
                  Cobrado R$ {formatPrice(totalPrice * 12)}/ano
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              🔒 7 dias grátis · sem cartão · cancele quando quiser
            </p>
          </div>

          {/* RIGHT — Account + Payment + CTA */}
          <div className="space-y-6">
            {/* Account */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-foreground">Seus dados</h3>

              {user ? (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">Conta ativa</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-xs text-muted-foreground shrink-0"
                  >
                    Não sou eu
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 h-11"
                    onClick={handleGoogleSignIn}
                  >
                    <GoogleIcon />
                    Continuar com Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">ou com email</span>
                    </div>
                  </div>

                  <div className="space-y-3">
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
                      placeholder="Senha (mín. 6 caracteres)"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {authError && <p className="text-destructive text-sm">{authError}</p>}

                  <p className="text-xs text-muted-foreground text-center">
                    Já tem conta?{' '}
                    <Link
                      to="/auth?redirect=/checkout"
                      className="text-accent hover:underline font-medium"
                    >
                      Entrar
                    </Link>
                  </p>
                </>
              )}
            </div>

            {/* Payment methods info */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Formas de pagamento aceitas
              </p>
              <div className="grid grid-cols-3 gap-2">
                {['Boleto', 'PIX', 'Cartão'].map((m) => (
                  <div
                    key={m}
                    className="flex items-center justify-center rounded-lg border border-border bg-muted/30 py-3"
                  >
                    <span className="text-xs text-muted-foreground font-medium">{m}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Você escolhe a forma na próxima tela (Asaas)
              </p>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              {checkoutError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm text-destructive text-center">{checkoutError}</p>
                </div>
              )}

              <Button
                size="lg"
                className="w-full text-base h-14 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => handleCheckout()}
                disabled={ctaDisabled}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Preparando...
                  </>
                ) : selectedPlan === 'start' ? (
                  'Começar grátis →'
                ) : (
                  'Assinar agora →'
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Você será redirecionado para o ambiente seguro do Asaas</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t bg-card py-4 mt-8">
        <p className="text-center text-xs text-muted-foreground">
          © Slotimob · Pagamento processado pelo Asaas
        </p>
      </footer>
    </div>
  );
}
