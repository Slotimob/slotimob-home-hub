import { useState, useRef } from 'react';
import { Check, Briefcase, Rocket, Building2, Layers, Zap, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
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
}

const plans: PlanDef[] = [
{
  id: 'start',
  name: 'Start',
  icon: Briefcase,
  description: 'Comece grátis e teste o Pro por 7 dias',
  features: [
  'Gestão de contatos simples',
  'Financeiro: entradas e saídas',
  'Contatos ilimitados'],

  notIncluded: [
  'WhatsApp integrado',
  'Chat IA',
  'Financeiro completo (DRE, OFX)',
  'Gestão de equipe'],

  cta: 'Começar Grátis',
  popular: false,
  bestValue: false
},
{
  id: 'essencial',
  name: 'Essencial',
  icon: Layers,
  description: 'Contrato, cobrança e financeiro para quem administra até 20 imóveis.',
  features: [
  'Gestão de ativos e contratos',
  'Financeiro completo (DRE, OFX, conciliação)',
  'Boleto e Pix para o inquilino',
  'WhatsApp integrado (1 instância)',
  'Chat IA (50 créditos/mês)',
  'CRM completo',
  'Contatos ilimitados'],

  notIncluded: [
  'Gestão de equipe'],

  cta: 'Assinar Essencial',
  popular: false,
  bestValue: false
},
{
  id: 'pro',
  name: 'Pro',
  icon: Rocket,
  description: 'Gestão completa para crescer com controle',
  features: [
  'Tudo do Essencial',
  'Chat IA (250 créditos/mês)',
  'Gestão de equipe com permissões',
  'Relatórios e DRE completos',
  'Pipeline personalizável',
  'Todas as integrações',
  'Suporte prioritário'],

  cta: 'Escolha Recomendada',
  popular: true,
  bestValue: false
},
{
  id: 'business',
  name: 'Business',
  icon: Building2,
  description: 'Escale sua imobiliária com equipe e auditoria',
  features: [
  'Tudo do Pro',
  'Chat IA (750 créditos/mês)',
  'WhatsApp com 3 instâncias',
  'Distribuição automática de leads do WhatsApp',
  'Automações exclusivas',
  'Integrações avançadas',
  'Expansão sob demanda'],

  cta: 'Contratar Business',
  popular: false,
  bestValue: true
}];


/* Mobile order: PRO first */
const mobilePlanOrder: PlanId[] = ['pro', 'essencial', 'start', 'business'];

const formatPrice = (value: number) => value.toFixed(2).replace('.', ',');

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function PricingSection() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: pricing } = usePlanPricing();

  const getDisplayPrice = (planId: PlanId): number => {
    const p = pricing?.[planId];
    if (!p) return 0;
    if (planId === 'start') return 0;
    // Divide annual total by 12 to show monthly equivalent
    return isAnnual ? p.price_annual / 12 : p.price_original;
  };

  const getAnnualTotal = (planId: PlanId): number | null => {
    const p = pricing?.[planId];
    if (!p || planId === 'start' || !isAnnual) return null;
    return p.price_annual;
  };

  const getOriginalPrice = (planId: PlanId): number | null => {
    const p = pricing?.[planId];
    if (!p || planId === 'start') return null;
    if (isAnnual) {
      const monthlyEquiv = p.price_annual / 12;
      if (p.price_original > monthlyEquiv) return p.price_original;
    }
    return null;
  };

  const getAlternativePrice = (planId: PlanId): string | null => {
    const p = pricing?.[planId];
    if (!p || planId === 'start') return null;
    if (!isAnnual && p.price_annual > 0) {
      return `ou ${formatCurrency(p.price_annual / 12)}/mês no anual`;
    }
    return null;
  };

  const handleCheckout = async (planId: PlanId) => {
    if (planId === 'start') {
      navigate('/checkout?plan=pro&trial=true');
      return;
    }
    setLoadingPlan(planId);
    try {
      const cycle = isAnnual ? 'annual' : 'monthly';
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
    const displayPrice = getDisplayPrice(plan.id);
    const annualTotal = getAnnualTotal(plan.id);
    const altPrice = getAlternativePrice(plan.id);
    const dbPlan = pricing?.[plan.id];
    const unitsLabel = dbPlan ? `Até ${dbPlan.assets_limit} imóveis` : '—';
    const usersCount = dbPlan?.users_limit ?? 1;
    const usersLabel =
      usersCount <= 1 ?
      '1 usuário' :
      `${usersCount} usuários (você + ${usersCount - 1} convidado${usersCount - 1 > 1 ? 's' : ''})`;

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
            🎁 TESTE O PRO POR 7 DIAS
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
                <p className="text-xs text-muted-foreground mt-1">sem cartão</p>
              </> :

            <>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-foreground">
                    {formatCurrency(displayPrice)}
                  </span>
                  <span className="text-muted-foreground ml-1">/mês</span>
                </div>
                {isAnnual ?
              <p className="text-xs text-muted-foreground mt-1">
                    <span className="line-through">{formatCurrency(pricing?.[plan.id]?.price_original || 0)}/mês no plano mensal</span>
                    {' · cobrado anualmente'}
                  </p> :

              <p className="text-xs text-muted-foreground mt-1">
                    {altPrice}
                  </p>
              }
              {annualTotal && (
                <p className="text-sm text-muted-foreground mt-1">
                  Faturado {formatCurrency(annualTotal)} anualmente
                </p>
              )}
              </>
            }
          </div>

          {/* Limits */}
          <div className="flex gap-2 justify-center mb-4 flex-wrap">
            <Badge variant="outline" className="text-xs">{unitsLabel}</Badge>
            <Badge variant="outline" className="text-xs">{usersLabel}</Badge>
          </div>

          {/* Start trial highlight */}
          {isStart &&
          <div className="mb-5 rounded-lg p-3 border border-dashed border-muted-foreground/30 bg-section">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">7 dias de Pro</span>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Experimente o Plano PRO. Após o período, você decide.
              </p>
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
              'border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors'
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
            Comece grátis no Start, com 7 dias de Pro para testar.
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
                Economize até 20% no anual
              </Badge>
            }
          </div>
        </div>

        {/* Desktop: 4 columns */}
        <div className="hidden lg:grid gap-5 lg:grid-cols-4 max-w-7xl mx-auto items-stretch">
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
            Comece grátis no Start, com 7 dias de Pro para testar. Cancele quando quiser.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Emissão de boletos e PIX de aluguel via subconta Asaas, instituição autorizada pelo Banco Central.
          </p>
        </div>
      </div>
    </section>);

}