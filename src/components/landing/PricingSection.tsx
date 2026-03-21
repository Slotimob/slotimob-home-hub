import { useState, useRef } from 'react';
import { Check, Briefcase, Rocket, Building2, Zap, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';
import { usePlanPricing } from '@/hooks/usePlanPricing';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PlanId = 'start' | 'essencial' | 'pro' | 'business';

interface PlanDef {
  id: PlanId;
  name: string;
  icon: typeof Briefcase;
  description: string;
  features: string[];
  notIncluded?: string[];
  cta: string;
  popular: boolean;
  bestValue: boolean;
  units: string;
  users: string;
}

const plans: PlanDef[] = [
{
  id: 'start',
  name: 'Start',
  icon: Briefcase,
  description: 'Comece grátis e teste o PRO por 14 dias',
  units: 'Até 5 unidades',
  users: '1 usuário',
  features: [
  'Gestão de Contatos Simples',
  'Financeiro: Entradas e Saídas',
  'Contatos ilimitados'],

  notIncluded: [
  'Automações de WhatsApp',
  'Inteligência Artificial',
  'Documentos e Relatórios',
  'Gestão de Ativos'],

  cta: 'Começar Grátis',
  popular: false,
  bestValue: false
},
{
  id: 'pro',
  name: 'Pro',
  icon: Rocket,
  description: 'Gestão completa para crescer com controle',
  units: 'Até 50 unidades',
  users: '1 usuário',
  features: [
  'CRM Completo (Pipeline e Contatos)',
  'Chat IA (250 créditos/mês)',
  'Contratos ilimitados',
  'Relatórios e DRE completos',
  'Gestão de ativos e reajustes',
  'Pipeline personalizável',
  'Todas as integrações',
  'Suporte prioritário'],

  notIncluded: [
  'Gestão de Equipe'],

  cta: 'Escolha Recomendada',
  popular: true,
  bestValue: false
},
{
  id: 'business',
  name: 'Business',
  icon: Building2,
  description: 'Escale sua imobiliária com equipe e auditoria',
  units: 'Até 150 unidades',
  users: '4 usuários (1 Master + 3)',
  features: [
  'Tudo do Pro',
  'Chat IA (750 créditos/mês)',
  'Gestão de equipe com permissões',
  'Roleta de leads automática',
  'Split de comissões',
  'Automações Exclusivas',
  'Integrações Avançadas',
  'Expansão sob demanda'],

  cta: 'Garantir Vaga',
  popular: false,
  bestValue: true
}];


/* Mobile order: PRO first, then Start, Business */
const mobilePlanOrder: PlanId[] = ['pro', 'start', 'business'];

const formatPrice = (value: number) => value.toFixed(2).replace('.', ',');

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function PricingSection() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { slots } = useEarlyAdopterCount();
  const { data: pricing } = usePlanPricing();

  const getEarlyAdopterAvailable = (planId: PlanId): boolean => {
    if (planId === 'start') return false;
    const slotData = slots[planId as 'essencial' | 'pro' | 'business'];
    return !!slotData && slotData.remaining > 0;
  };

  const getRemainingSlots = (planId: PlanId): number | null => {
    if (planId === 'start') return null;
    const slotData = slots[planId as 'essencial' | 'pro' | 'business'];
    return slotData ? slotData.remaining : null;
  };

  const getDisplayPrice = (planId: PlanId): number => {
    const p = pricing?.[planId];
    if (!p) return 0;
    if (planId === 'start') return 0;
    const isEA = getEarlyAdopterAvailable(planId);
    if (isEA) {
      // EA annual prices are already stored as monthly equivalents
      return isAnnual ? p.price_annual_early_adopter : p.price_early_adopter;
    }
    // For regular prices, divide annual total by 12 to show monthly equivalent
    return isAnnual ? p.price_annual / 12 : p.price_original;
  };

  const getAnnualTotal = (planId: PlanId): number | null => {
    const p = pricing?.[planId];
    if (!p || planId === 'start' || !isAnnual) return null;
    const isEA = getEarlyAdopterAvailable(planId);
    if (isEA) {
      return p.price_annual_early_adopter * 12;
    }
    return p.price_annual;
  };

  const getOriginalPrice = (planId: PlanId): number | null => {
    const p = pricing?.[planId];
    if (!p || planId === 'start') return null;
    const isEA = getEarlyAdopterAvailable(planId);
    if (isEA) return p.price_original;
    if (isAnnual) {
      const monthlyEquiv = p.price_annual / 12;
      if (p.price_original > monthlyEquiv) return p.price_original;
    }
    return null;
  };

  const getAlternativePrice = (planId: PlanId): string | null => {
    const p = pricing?.[planId];
    if (!p || planId === 'start') return null;
    const isEA = getEarlyAdopterAvailable(planId);
    if (isEA) return null;
    if (!isAnnual && p.price_annual > 0) {
      return `ou ${formatCurrency(p.price_annual / 12)}/mês no anual`;
    }
    return null;
  };

  const handleCheckout = async (planId: PlanId) => {
    if (planId === 'start') {
      navigate('/auth?trial=pro');
      return;
    }
    setLoadingPlan(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const cycle = isAnnual ? 'annual' : 'monthly';
      if (!session) {
        navigate(`/auth?redirect=checkout&plan=${planId}&cycle=${cycle}`);
        return;
      }
      navigate(`/checkout?plan=${planId}&cycle=${cycle}`);
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const scrollMobile = (dir: number) => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.firstElementChild?.getBoundingClientRect().width ?? 300;
    scrollRef.current.scrollBy({ left: dir * (cardWidth + 16), behavior: 'smooth' });
  };

  const renderCard = (plan: PlanDef) => {
    const isLoading = loadingPlan === plan.id;
    const isStart = plan.id === 'start';
    const isPro = plan.id === 'pro';
    const isEarlyAdopter = getEarlyAdopterAvailable(plan.id);
    const displayPrice = getDisplayPrice(plan.id);
    const altPrice = getAlternativePrice(plan.id);
    const remaining = getRemainingSlots(plan.id);

    return (
      <Card
        key={plan.id}
        className={cn(
          'relative flex flex-col transition-all duration-300',
          isPro ?
          'border-accent shadow-xl lg:scale-105 z-10' :
          plan.bestValue ?
          'border-border/50 shadow-sm' :
          'border-border/50 shadow-sm',
          'hover:-translate-y-1 hover:shadow-lg'
        )}>
        
        {isStart &&
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted-foreground text-background px-4 whitespace-nowrap">
            🎁 TESTE O PRO POR 14 DIAS
          </Badge>
        }
        {isPro &&
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 whitespace-nowrap">
            <Zap className="h-3 w-3 mr-1" />
            Recomendado
          </Badge>
        }
        {plan.bestValue &&
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted-foreground/80 text-background px-4 whitespace-nowrap">
            ✨ Melhor Valor
          </Badge>
        }

        <CardHeader className="text-center pb-2">
          <div className={cn('mx-auto mb-2', isPro ? 'text-accent' : 'text-muted-foreground')}>
            <plan.icon className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {/* Price */}
          <div className="text-center mb-4">
            {isStart ?
            <>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-foreground">Grátis</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">para sempre · sem cartão</p>
              </> :

            <>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-foreground">
                    R$ {formatPrice(displayPrice)}
                  </span>
                  <span className="text-muted-foreground ml-1">/mês</span>
                </div>
                {isEarlyAdopter ?
              <p className="text-xs text-muted-foreground mt-1">
                    <span className="line-through">R$ {formatPrice(pricing?.[plan.id]?.price_original || 0)}/mês</span>
                    {' · '}
                    <span className="font-semibold text-accent">preço vitalício</span>
                  </p> :
              isAnnual ?
              <p className="text-xs text-muted-foreground mt-1">
                    <span className="line-through">R$ {formatPrice(pricing?.[plan.id]?.price_original || 0)}/mês</span>
                    {' · cobrado anualmente'}
                  </p> :

              <p className="text-xs text-muted-foreground mt-1">
                    ou R$ {formatPrice(pricing?.[plan.id]?.price_annual || 0)}/mês no anual
                  </p>
              }
              </>
            }
          </div>

          {/* Limits */}
          <div className="flex gap-2 justify-center mb-4">
            <Badge variant="outline" className="text-xs">{plan.units}</Badge>
            <Badge variant="outline" className="text-xs">{plan.users}</Badge>
          </div>

          {/* Start trial highlight */}
          {isStart &&
          <div className="mb-5 rounded-lg p-3 border border-dashed border-muted-foreground/30 bg-muted/50">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">14 dias de PRO</span>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Experimente o Plano PRO. Após o período, você decide.
              </p>
            </div>
          }

          {/* Early Adopter */}
          {!isStart && isEarlyAdopter &&
          <div className="mb-5">
              <div className={cn(
              'rounded-lg p-3 border border-dashed',
              isPro ? 'border-accent/50 bg-accent/5' : 'border-muted-foreground/30 bg-muted/50'
            )}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Zap className={cn('h-4 w-4', isPro ? 'text-accent' : 'text-muted-foreground')} />
                  <span className={cn('text-xs font-semibold uppercase', isPro ? 'text-accent' : 'text-muted-foreground')}>
                    Early Adopter
                  </span>
                </div>
                {remaining !== null && remaining > 0 &&
              <p className={cn(
                'text-xs text-center font-medium',
                remaining <= 10 ? 'text-destructive' : 'text-muted-foreground'
              )}>
                    {remaining <= 10 ?
                `🔥 Últimas ${remaining} vagas!` :
                `${remaining} vagas restantes`
                }
                  </p>
              }
              </div>
            </div>
          }

          {/* Features */}
          <ul className="space-y-2.5 flex-1">
            {plan.features.map((feature, i) =>
            <li key={i} className="flex items-start gap-2.5">
                <Check className={cn('h-4 w-4 shrink-0 mt-0.5', isPro ? 'text-accent' : 'text-muted-foreground')} />
                <span className="text-sm text-muted-foreground">{feature}</span>
              </li>
            )}
            {plan.notIncluded?.map((feature, i) =>
            <li key={`not-${i}`} className="flex items-start gap-2.5 opacity-40">
                <X className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground line-through">{feature}</span>
              </li>
            )}
          </ul>
        </CardContent>

        <CardFooter className="mt-auto">
          <Button
            variant={isPro ? 'default' : 'outline'}
            className={cn(
              'w-full',
              isPro ?
              'bg-accent hover:bg-accent/90 text-accent-foreground shadow-md' :
              'border-border text-foreground hover:bg-muted'
            )}
            onClick={() => handleCheckout(plan.id)}
            disabled={isLoading}>
            
            {isLoading ?
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
            isPro ?
            <Zap className="h-4 w-4 mr-2" /> :
            null}
            {isLoading ? 'Carregando...' : plan.cta}
          </Button>
        </CardFooter>
      </Card>);

  };

  return (
    <section id="pricing" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
            Planos
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" style={{ textWrap: 'balance' }}>
            Planos para cada momento
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" style={{ textWrap: 'balance' }}>
            Comece pequeno e escale conforme seu negócio cresce. Todos com 14 dias grátis.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Label htmlFor="billing-toggle" className={cn('text-sm transition-colors', !isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              Mensal
            </Label>
            <Switch id="billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
            <Label htmlFor="billing-toggle" className={cn('text-sm transition-colors', isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              Anual
            </Label>
             {isAnnual &&
            <Badge variant="secondary" className="text-accent bg-accent/10 border-accent/20">
                Economize até 27%
              </Badge>
            }
          </div>
        </div>

        {/* Desktop: 4 columns */}
        <div className="hidden lg:grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto items-stretch">
          {plans.map(renderCard)}
        </div>

        {/* Mobile/Tablet: Horizontal scroll, PRO first */}
        <div className="lg:hidden">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4">
            
            {mobilePlanOrder.map((id) => {
              const plan = plans.find((p) => p.id === id)!;
              return (
                <div key={plan.id} className="min-w-[280px] max-w-[320px] flex-shrink-0 snap-center">
                  {renderCard(plan)}
                </div>);

            })}
          </div>
          {/* Carousel controls */}
          <div className="flex justify-center gap-4 mt-4">
            <button onClick={() => scrollMobile(-1)} className="p-2 rounded-full border border-border hover:bg-muted transition-colors" aria-label="Anterior">
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <button onClick={() => scrollMobile(1)} className="p-2 rounded-full border border-border hover:bg-muted transition-colors" aria-label="Próximo">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Guarantee */}
        <div className="text-center mt-14">
          <p className="text-sm text-muted-foreground">
            ✨ Preço de Early Adopter é <strong>vitalício</strong> enquanto sua assinatura estiver ativa
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            14 dias grátis em todos os planos. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>);

}