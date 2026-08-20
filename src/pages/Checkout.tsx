import { useState, useEffect, useMemo, useRef, useCallback, FormEvent } from 'react';
import { TurnstileWidget, type TurnstileWidgetHandle } from '@/components/auth/TurnstileWidget';
import { translateCaptchaError } from '@/lib/captchaErrors';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  AsaasFinancialSeal,
  AsaasTransparencyNote,
} from '@/components/asaas/AsaasFinancialSeal';
import {
  Loader2,
  Check,
  Zap,
  Rocket,
  Building2,
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { usePlanPricing } from '@/hooks/usePlanPricing';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';
import { trackStartTrial, trackSubscriptionPaid } from '@/components/TrackingProvider';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';
import { cn } from '@/lib/utils';
import { useCepSearch } from '@/hooks/useCepSearch';
import { translateAuthError } from '@/lib/authErrors';
import { validatePassword, PASSWORD_REQUIREMENTS_MESSAGE } from '@/lib/passwordSchema';

// ============================================================================
// Types & Meta
// ============================================================================

type PaidPlan = 'pro' | 'business';
type AnyPlan = 'start' | PaidPlan;

type PaymentResult =
  | { type: 'pix'; pix: { encodedImage: string; payload: string; expirationDate: string } }
  | { type: 'boleto'; boleto: { bankSlipUrl: string; barCode?: string | null; dueDate?: string } }
  | { type: 'redirect'; url: string }
  | null;

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
    features: ['Tudo do Pro', 'Gestão de equipe', 'Distribuição automática de leads do WhatsApp'],
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
  { id: 'extra-units-50', label: '+50 unidades', price: 39.9 },
  { id: 'extra-user', label: '+1 usuário', price: 49.9 },
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
  useForceLightTheme();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const initialPlan = (searchParams.get('plan') as AnyPlan) || 'pro';
  const initialAnnual = searchParams.get('cycle') === 'annual';

  const [selectedPlan, setSelectedPlan] = useState<AnyPlan>(
    ['start', 'pro', 'business'].includes(initialPlan) ? initialPlan : 'pro'
  );
  const [isAnnual, setIsAnnual] = useState<boolean>(initialAnnual);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});

  // Account form (when not logged in)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showCheckoutPassword, setShowCheckoutPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  }, []);
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
  const [fiscalDuplicateAccountError, setFiscalDuplicateAccountError] = useState(false);
  const [billingType, setBillingType] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  const [paymentResult, setPaymentResult] = useState<PaymentResult>(null);

  const { data: pricing, isLoading: pricingLoading } = usePlanPricing();
  const { slots } = useEarlyAdopterCount();

  // URL sync
  useEffect(() => {
    const cycle = isAnnual ? 'annual' : 'monthly';
    setSearchParams({ plan: selectedPlan, cycle }, { replace: true });
  }, [selectedPlan, isAnnual, setSearchParams]);

  // Reset addons + annual when switching plan
  useEffect(() => {
    if (selectedPlan === 'start') {
      setAddonQuantities({});
      setIsAnnual(false);
    } else if (selectedPlan === 'pro') {
      setAddonQuantities((prev) => {
        const copy = { ...prev };
        delete copy['extra-user'];
        return copy;
      });
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
    return true; // Sempre usa preço de Promoção de Lançamento
  };

  const getDisplayPrice = (planId: PaidPlan): number => {
    const p = pricing?.[planId];
    if (!p) return 0;
    if (isEarlyAdopterAvailable(planId)) {
      return isAnnual ? p.price_annual_early_adopter || p.price_early_adopter : p.price_early_adopter;
    }
    return isAnnual ? p.price_annual : p.price_original;
  };

  const availableAddons = useMemo(() => {
    if (selectedPlan === 'start') return [];
    if (selectedPlan === 'pro') return ADDONS.filter((a) => a.id === 'extra-units-50');
    return ADDONS;
  }, [selectedPlan]);

  const planPrice = selectedPlan === 'start' ? 0 : getDisplayPrice(selectedPlan as PaidPlan);
  const addonsTotal = Object.entries(addonQuantities).reduce((sum, [id, qty]) => {
    if (qty <= 0) return sum;
    const a = ADDONS.find((x) => x.id === id);
    return sum + (a?.price ?? 0) * qty;
  }, 0);
  const totalPrice = planPrice + addonsTotal;

  const planNameSelected = allPlans.find((p) => p.id === selectedPlan)?.name ?? '';

  const setAddonQty = (id: string, delta: number) => {
    setAddonQuantities((prev) => {
      const current = prev[id] ?? 0;
      const next = Math.max(0, Math.min(current + delta, 20));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
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

    let currentUserId = user?.id;

    // 1. Sign up if not logged in
    if (!user) {
      if (!name || !email || !password) {
        setAuthError('Preencha todos os campos');
        resetCaptcha();
        return;
      }
      const passwordError = validatePassword(password);
      if (passwordError) {
        setAuthError(passwordError);
        resetCaptcha();
        return;
      }
      if (!captchaToken) {
        setAuthError('Confirme que você não é um robô.');
        setIsCheckingOut(false);
        resetCaptcha();
        return;
      }
      setIsCheckingOut(true);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, captchaToken },
      });
      if (signUpError) {
        const captchaMessage = translateCaptchaError(signUpError);
        if (captchaMessage) {
          setAuthError(captchaMessage);
          toast.error('Verificação de segurança', { description: captchaMessage });
        } else {
          setAuthError(translateAuthError(signUpError.message));
        }
        setIsCheckingOut(false);
        resetCaptcha();
        return;
      }
      if (signUpData.user && !signUpData.session) {
        toast.info('Verifique seu email para continuar');
        setIsCheckingOut(false);
        resetCaptcha();
        return;
      }
      if (signUpData.user) {
        currentUserId = signUpData.user.id;
      }
      toast.success('Conta criada! Bem-vindo ao Slotimob 🎉');
      trackStartTrial(selectedPlan);
    }

    // ── Validação e salvamento de dados fiscais ─────────────────────────────
    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanCep = cep.replace(/\D/g, '');

    const failFiscal = (msg: string) => {
      setCheckoutError(msg);
      resetCaptcha();
    };

    if (!cleanCpfCnpj) {
      failFiscal('CPF ou CNPJ é obrigatório.');
      return;
    }
    if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
      failFiscal('CPF inválido (11 dígitos) ou CNPJ inválido (14 dígitos).');
      return;
    }
    if (!cleanPhone) {
      failFiscal('Telefone é obrigatório.');
      return;
    }
    if (!cleanCep || cleanCep.length !== 8) {
      failFiscal('CEP é obrigatório e deve ter 8 dígitos.');
      return;
    }
    if (!street.trim()) {
      failFiscal('Rua / Avenida é obrigatória.');
      return;
    }
    if (!number.trim()) {
      failFiscal('Número é obrigatório.');
      return;
    }
    if (!neighborhood.trim()) {
      failFiscal('Bairro é obrigatório.');
      return;
    }
    if (!city.trim()) {
      failFiscal('Cidade é obrigatória.');
      return;
    }
    if (!uf.trim() || uf.trim().length !== 2) {
      failFiscal('UF é obrigatória (2 letras).');
      return;
    }

    if (currentUserId) {
      setIsCheckingOut(true);

      const { data: fiscalData, error: fiscalFnError } = await supabase.functions.invoke('save-fiscal-data', {
        body: {
          cpf_cnpj: cleanCpfCnpj,
          phone: cleanPhone,
          cep: cleanCep,
          street: street.trim(),
          number: number.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          uf: uf.trim().toUpperCase(),
        },
      });

      if (fiscalFnError || fiscalData?.error) {
        const captchaMessage = translateCaptchaError(fiscalFnError) ?? translateCaptchaError(fiscalData?.error);
        const msg = captchaMessage || fiscalData?.error || 'Não foi possível salvar seus dados fiscais. Tente novamente.';
        setCheckoutError(msg);
        if (captchaMessage) {
          toast.error('Verificação de segurança', { description: captchaMessage });
        } else {
          toast.error(msg);
        }
        setIsCheckingOut(false);
        resetCaptcha();
        return;
      }
    }
    // ── fim do bloco fiscal ───────────────────────────────────────────────

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
          billing_type: billingType,
        },
      });

      if (fnError) {
        const msg = fnError?.message || 'Erro ao iniciar checkout. Tente novamente.';
        setCheckoutError(msg);
        toast.error(msg);
        resetCaptcha();
        return;
      }

      if (data?.error) {
        setCheckoutError(data.error);
        toast.error(data.error);
        resetCaptcha();
        return;
      }

      if (data?.type === 'redirect' && data?.url) {
        window.open(data.url, '_blank');
        setPaymentResult(data as PaymentResult);
        trackSubscriptionPaid(selectedPlan, billingType);
        // Após processar o resultado principal da subscription:
        if (Object.values(addonQuantities).some((q) => q > 0)) {
          for (const [addonId, qty] of Object.entries(addonQuantities)) {
            if (qty <= 0) continue;
            const { data: addonData } = await supabase.functions.invoke('create-checkout-session', {
              body: {
                product_type: 'addon',
                addon_id: addonId,
                quantity: qty,
                billing_type: billingType,
              },
            });
            if (addonData?.error) {
              console.warn('[addon] erro no add-on:', addonId, addonData.error);
            } else if (addonData?.url) {
              window.open(addonData.url, '_blank');
            }
          }
        }
      } else if (data?.type === 'pix' || data?.type === 'boleto') {
        setPaymentResult(data as PaymentResult);
        trackSubscriptionPaid(selectedPlan, billingType);
        // Após processar o resultado principal da subscription:
        if (Object.values(addonQuantities).some((q) => q > 0)) {
          for (const [addonId, qty] of Object.entries(addonQuantities)) {
            if (qty <= 0) continue;
            const { data: addonData } = await supabase.functions.invoke('create-checkout-session', {
              body: {
                product_type: 'addon',
                addon_id: addonId,
                quantity: qty,
                billing_type: billingType,
              },
            });
            if (addonData?.error) {
              console.warn('[addon] erro no add-on:', addonId, addonData.error);
            } else if (addonData?.url) {
              window.open(addonData.url, '_blank');
            }
          }
        }
        toast.success('Pagamento gerado! Siga as instruções abaixo.');
      } else if (data?.url) {
        // backwards compat
        window.open(data.url, '_blank');
      } else {
        setCheckoutError('Resposta inesperada do servidor.');
        toast.error('Resposta inesperada do servidor.');
        resetCaptcha();
      }
    } catch (err) {
      const captchaMessage = translateCaptchaError(err);
      const msg = captchaMessage || (err instanceof Error ? err.message : 'Erro inesperado.');
      setCheckoutError(msg);
      if (captchaMessage) {
        toast.error('Verificação de segurança', { description: captchaMessage });
      } else {
        toast.error(msg);
      }
      resetCaptcha();
    } finally {
      setIsCheckingOut(false);
    }
  };

  const ctaDisabled =
    isCheckingOut || (!user && (!name || !email || !password || !captchaToken));

  const maskCpfCnpj = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const maskPhone = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const maskCep = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 8);
    return digits.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
  };

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
            <AsaasFinancialSeal size="sm" className="hidden sm:inline-block" />
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
            {availableAddons.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Adicionais <span className="normal-case">(opcional)</span>
                </p>
                {availableAddons.map((addon) => {
                  const qty = addonQuantities[addon.id] ?? 0;
                  return (
                    <div
                      key={addon.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-all',
                        qty > 0
                          ? 'border-accent bg-accent/5 text-foreground'
                          : 'border-border text-muted-foreground'
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className={cn('font-medium', qty > 0 ? 'text-foreground' : '')}>{addon.label}</span>
                        <span className="text-xs text-muted-foreground">R$ {formatPrice(addon.price)}/pack/mês</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 && (
                          <span className="text-xs font-medium text-accent mr-1">
                            R$ {formatPrice(addon.price * qty)}/mês
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setAddonQty(addon.id, -1)}
                          disabled={qty === 0}
                          className={cn(
                            'h-7 w-7 rounded-md border flex items-center justify-center text-base font-bold transition-all',
                            qty > 0
                              ? 'border-accent text-accent hover:bg-accent/10'
                              : 'border-border text-muted-foreground opacity-40 cursor-not-allowed'
                          )}
                        >
                          −
                        </button>
                        <span className={cn('w-5 text-center text-sm font-semibold', qty > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddonQty(addon.id, +1)}
                          className="h-7 w-7 rounded-md border border-accent text-accent flex items-center justify-center text-base font-bold hover:bg-accent/10 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
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
              {Object.entries(addonQuantities).map(([id, qty]) => {
                if (qty <= 0) return null;
                const addon = ADDONS.find((a) => a.id === id);
                if (!addon) return null;
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{addon.label} ×{qty}</span>
                    <span>+R$ {formatPrice(addon.price * qty)}/mês</span>
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
                  {addonsTotal > 0
                    ? `Plano: R$ ${formatPrice(planPrice * 12)}/ano · Add-ons: R$ ${formatPrice(addonsTotal)}/mês`
                    : `Cobrado R$ ${formatPrice(planPrice * 12)}/ano`}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-foreground">
              <Lock className="h-5 w-5 text-accent" />
              <span>7 dias grátis · sem cartão · cancele quando quiser</span>
            </div>
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
                    <div className="relative">
                      <Input
                        type={showCheckoutPassword ? 'text' : 'password'}
                        placeholder="Senha (mín. 6 caracteres)"
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCheckoutPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showCheckoutPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
                    <TurnstileWidget ref={turnstileRef} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
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

            {/* Dados Fiscais */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-foreground">Dados fiscais</h3>
              <p className="text-xs text-muted-foreground">
                Todos os campos são obrigatórios para emissão de nota fiscal (NFS-e) e cobrança via Asaas.
              </p>

              <div className="space-y-3">
                <Input
                  placeholder="CPF ou CNPJ *"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
                  inputMode="numeric"
                />

                <Input
                  placeholder="Telefone / WhatsApp *"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  inputMode="tel"
                />

                <div className="relative">
                  <Input
                    placeholder="CEP *"
                    value={cep}
                    inputMode="numeric"
                    onChange={(e) => {
                      const masked = maskCep(e.target.value);
                      setCep(masked);
                      if (masked.replace(/\D/g, '').length === 8) {
                        searchCep(masked);
                      }
                    }}
                  />
                  {cepSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {cepError && <p className="text-xs text-destructive mt-1">{cepError}</p>}
                </div>

                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <Input
                    placeholder="Rua / Avenida *"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                  <Input
                    placeholder="Nº *"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </div>

                <Input
                  placeholder="Bairro *"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />

                <div className="grid grid-cols-[1fr_60px] gap-2">
                  <Input
                    placeholder="Cidade *"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <Input
                    placeholder="UF *"
                    value={uf}
                    maxLength={2}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>


            {selectedPlan !== 'start' && (
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-2">Forma de pagamento</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['PIX', 'BOLETO', 'CREDIT_CARD'] as const).map((type) => {
                    const labels: Record<typeof type, string> = {
                      PIX: 'PIX',
                      BOLETO: 'Boleto',
                      CREDIT_CARD: 'Cartão',
                    };
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setBillingType(type)}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                          billingType === type
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>
                <AsaasFinancialSeal size="sm" className="mt-3" />
              </div>
            )}

            {/* Resultado do pagamento (PIX / Boleto / Cartão) */}
            {paymentResult ? (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                {paymentResult.type === 'pix' && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <h3 className="font-semibold text-foreground">PIX gerado!</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Escaneie o QR code ou copie o código para pagar.
                    </p>
                    <div className="flex justify-center">
                      <img
                        src={`data:image/png;base64,${paymentResult.pix.encodedImage}`}
                        alt="QR Code PIX"
                        className="w-48 h-48 rounded-lg border border-border"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentResult.pix.payload);
                        toast.success('Código PIX copiado!');
                      }}
                    >
                      📋 Copiar código PIX (Copia e Cola)
                    </Button>
                    {paymentResult.pix.expirationDate && (
                      <p className="text-xs text-muted-foreground text-center">
                        Válido até{' '}
                        {new Date(paymentResult.pix.expirationDate).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
                      💡 Sua assinatura é ativada automaticamente após a confirmação do PIX (geralmente instantâneo).
                    </p>
                  </>
                )}

                {paymentResult.type === 'boleto' && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <h3 className="font-semibold text-foreground">Boleto gerado!</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Abra o PDF e efetue o pagamento até a data de vencimento.
                    </p>
                    <Button
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
                      onClick={() => window.open(paymentResult.boleto.bankSlipUrl, '_blank')}
                    >
                      Abrir boleto em PDF →
                    </Button>
                    {paymentResult.boleto.barCode && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          navigator.clipboard.writeText(paymentResult.boleto.barCode as string);
                          toast.success('Linha digitável copiada!');
                        }}
                      >
                        📋 Copiar linha digitável
                      </Button>
                    )}
                    {paymentResult.boleto.dueDate && (
                      <p className="text-xs text-muted-foreground text-center">
                        Vencimento:{' '}
                        {new Date(paymentResult.boleto.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
                      💡 Sua assinatura é ativada após a compensação do boleto (1 a 3 dias úteis).
                    </p>
                  </>
                )}

                {paymentResult.type === 'redirect' && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <h3 className="font-semibold text-foreground">Redirecionado para pagamento seguro</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Uma nova aba foi aberta com a página segura do Asaas. Se não abriu,{' '}
                      <a
                        href={paymentResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline"
                      >
                        clique aqui
                      </a>.
                    </p>
                    <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
                      💡 Sua assinatura é ativada após a confirmação do pagamento pelo cartão.
                    </p>
                  </>
                )}
                <div className="border-t pt-3">
                  <AsaasFinancialSeal size="sm" />
                </div>
              </div>
            ) : (
              /* CTA */
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
                      {billingType === 'PIX'
                        ? 'Gerando PIX...'
                        : billingType === 'BOLETO'
                        ? 'Gerando boleto...'
                        : 'Preparando...'}
                    </>
                  ) : selectedPlan === 'start' ? (
                    'Começar grátis →'
                  ) : (
                    'Assinar agora →'
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>
                    {billingType === 'CREDIT_CARD'
                      ? 'Você será redirecionado para o ambiente seguro do Asaas'
                      : billingType === 'BOLETO'
                      ? 'O boleto será gerado e exibido aqui'
                      : 'O QR code PIX será gerado e exibido aqui'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t bg-card py-4 mt-8">
        <div className="flex flex-col items-center gap-3">
          <AsaasFinancialSeal size="sm" />
          <AsaasTransparencyNote className="text-center max-w-2xl mx-auto" />
          <p className="text-center text-xs text-muted-foreground">
            © Slotimob
          </p>
        </div>
      </footer>
    </div>
  );
}
