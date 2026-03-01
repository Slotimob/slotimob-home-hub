import { useState } from 'react';
import { Check, Briefcase, Rocket, Building2, Zap, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
  colorClass: string;
  bgClass: string;
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
      'Contatos ilimitados',
    ],
    notIncluded: [
      'Automações de WhatsApp',
      'Inteligência Artificial',
      'Documentos e Relatórios',
      'Gestão de Ativos',
    ],
    cta: 'Começar Grátis',
    popular: false,
    bestValue: false,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  },
  {
    id: 'essencial',
    name: 'Essencial',
    icon: Briefcase,
    description: 'Organize seus imóveis e comece a vender',
    units: 'Até 10 unidades',
    users: '1 usuário',
    features: [
      'Cadastro de imóveis',
      'CRM: Pipeline e Contatos',
      'Financeiro: Geral e Lançamentos',
      'Contatos ilimitados',
    ],
    notIncluded: [
      'Chat IA',
      'Documentos',
      'Relatórios',
      'Integrações',
      'Gestão de Ativos',
    ],
    cta: 'Começar com Essencial',
    popular: false,
    bestValue: false,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500',
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Rocket,
    description: 'Gestão completa para crescer com controle',
    units: 'Até 50 unidades',
    users: '1 usuário',
    features: [
      'Tudo do Essencial',
      'Chat IA (250 Créditos/mês)',
      'Contratos ilimitados',
      'Relatórios e DRE completos',
      'Gestão de ativos e reajustes',
      'Pipeline personalizável',
      'Todas as integrações',
      'Suporte prioritário',
    ],
    notIncluded: [
      'Gestão de Equipe',
    ],
    cta: 'Escolha Recomendada',
    popular: true,
    bestValue: false,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500',
  },
  {
    id: 'business',
    name: 'Business',
    icon: Building2,
    description: 'Escale sua imobiliária com equipe e auditoria',
    units: 'Até 80 unidades',
    users: '3 usuários inclusos',
    features: [
      'Tudo do Pro',
      'Chat IA (750 Créditos/mês)',
      'Gestão de equipe com permissões',
      'Roleta de leads automática',
      'Split de comissões',
      'Expansão sob demanda',
    ],
    cta: 'Garantir Vaga',
    popular: false,
    bestValue: true,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500',
  },
];

const formatPrice = (value: number) => value.toFixed(2).replace('.', ',');

export function PricingSection() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  

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
    if (isEA) return p.price_early_adopter;
    return isAnnual ? p.price_annual : p.price_original;
  };

  const getAlternativePrice = (planId: PlanId): string | null => {
    const p = pricing?.[planId];
    if (!p || planId === 'start') return null;

    const isEA = getEarlyAdopterAvailable(planId);
    if (isEA) return null; // Early adopter price is fixed
    if (!isAnnual && p.price_annual > 0) {
      return `ou R$ ${formatPrice(p.price_annual)}/mês no anual`;
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
      if (!session) {
        navigate(`/auth?redirect=checkout&plan=${planId}`);
        return;
      }

      // Navigate to embedded checkout page
      const cycle = isAnnual ? 'annual' : 'monthly';
      navigate(`/checkout?plan=${planId}&cycle=${cycle}`);
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Planos para cada momento
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
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
            {isAnnual && (
              <Badge variant="secondary" className="text-green-600 bg-green-500/10 border-green-500/20">
                Economize até 34%
              </Badge>
            )}
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loadingPlan === plan.id;
            const isStart = plan.id === 'start';
            const isEarlyAdopter = getEarlyAdopterAvailable(plan.id);
            const displayPrice = getDisplayPrice(plan.id);
            const altPrice = getAlternativePrice(plan.id);
            const remaining = getRemainingSlots(plan.id);
            
            return (
              <Card 
                key={plan.id} 
                className={cn(
                  'relative flex flex-col',
                  plan.popular 
                    ? 'border-blue-500 shadow-xl scale-105 z-10' 
                    : plan.bestValue 
                    ? 'border-purple-500/50 shadow-lg'
                    : 'border-border/50'
                )}
              >
                {isStart && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4">
                    🎁 TESTE O PRO POR 14 DIAS GRÁTIS
                  </Badge>
                )}
                {plan.popular && (
                   <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4">
                     <Zap className="h-3 w-3 mr-1" />
                     Recomendado
                   </Badge>
                )}
                {plan.bestValue && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white px-4">
                    ✨ Melhor Valor
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className={cn('mx-auto mb-2', plan.colorClass)}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  {/* Pricing */}
                  <div className="text-center mb-4">
                    {isStart ? (
                      <>
                        <div className="flex items-baseline justify-center">
                          <span className="text-4xl font-bold text-foreground">Grátis</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">para sempre · sem cartão de crédito</p>
                      </>
                    ) : (
                      <>
                        {altPrice && (
                          <div className="text-xs text-muted-foreground mb-1">{altPrice}</div>
                        )}
                        <div className="flex items-baseline justify-center">
                          <span className="text-4xl font-bold text-foreground">
                            R$ {formatPrice(displayPrice)}
                          </span>
                          <span className="text-muted-foreground">
                            /mês{isEarlyAdopter ? ' para sempre' : ''}
                          </span>
                        </div>
                        {isEarlyAdopter && pricing?.[plan.id] && (
                          <div className="text-xs text-muted-foreground mt-1 line-through">
                            De R$ {formatPrice(pricing[plan.id].price_original)}/mês
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="flex gap-2 justify-center mb-4">
                    <Badge variant="outline" className="text-xs">{plan.units}</Badge>
                    <Badge variant="outline" className="text-xs">{plan.users}</Badge>
                  </div>

                  {/* Start plan: trial highlight */}
                  {isStart && (
                    <div className="mb-6 rounded-lg p-4 border-2 border-dashed border-primary/50 bg-primary/5">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">14 DIAS DE PRO</span>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Experimente todo o poder do Plano PRO. Após o período, você decide: evolui ou continua no Start.
                      </p>
                    </div>
                  )}

                  {/* Early Adopter Section — only for paid plans with available slots */}
                  {!isStart && isEarlyAdopter && (
                    <div className="mb-6">
                      <div className={cn(
                        'rounded-lg p-4 border-2 border-dashed',
                        plan.id === 'essencial' ? 'border-emerald-500/50 bg-emerald-500/5' :
                        plan.id === 'pro' ? 'border-blue-500/50 bg-blue-500/5' :
                        'border-purple-500/50 bg-purple-500/5'
                      )}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Zap className={cn('h-4 w-4', plan.colorClass)} />
                          <span className={cn('text-sm font-semibold', plan.colorClass)}>
                            EARLY ADOPTER
                          </span>
                        </div>
                        {remaining !== null && remaining > 0 && (
                          <p className={cn(
                            'text-xs text-center mb-2 font-medium',
                            remaining <= 10 ? 'text-red-500' : remaining <= 25 ? 'text-amber-500' : 'text-muted-foreground'
                          )}>
                            {remaining <= 10
                              ? `🔥 Últimas ${remaining} vagas com esta condição especial!`
                              : `Apenas ${remaining} vagas restantes com esta condição especial`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <Check className={cn('h-5 w-5 shrink-0 mt-0.5', plan.colorClass)} />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                    {plan.notIncluded?.map((feature, featureIndex) => (
                      <li key={`not-${featureIndex}`} className="flex items-start gap-2 opacity-40">
                        <X className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    variant={plan.popular ? 'default' : 'outline'}
                    className={cn(
                      'w-full',
                      plan.id === 'start' && 'border-primary text-primary hover:bg-primary hover:text-primary-foreground',
                      plan.id === 'essencial' && 'border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white',
                      plan.id === 'pro' && 'bg-blue-500 hover:bg-blue-600 text-white',
                      plan.id === 'business' && 'border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white'
                    )}
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? 'Carregando...' : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Guarantee */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            ✨ Preço de Early Adopter é <strong>vitalício</strong> enquanto sua assinatura estiver ativa
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            14 dias grátis em todos os planos. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>
  );
}
