import { useState } from 'react';
import { Check, Crown, Sparkles, User, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { EarlyAdopterCounter } from './EarlyAdopterCounter';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const plans = [
  {
    id: 'free' as const,
    name: 'Free',
    icon: User,
    priceOriginal: 0,
    priceAnchor: 0,
    priceEarlyAdopter: 0,
    period: '/mês',
    description: 'Para começar a organizar seus imóveis',
    features: [
      'Até 3 imóveis ativos',
      'Até 15 contatos',
      'CRM básico (Visão por Status)',
      'Registro de vendas/comissões',
      'Relatórios dos últimos 6 meses',
      '1 modelo de documento/mês',
      'Integração Google Agenda',
    ],
    cta: 'Começar Grátis',
    variant: 'outline' as const,
    popular: false,
    hasEarlyAdopter: false,
    colorClass: 'text-muted-foreground',
    bgClass: '',
  },
  {
    id: 'ouro' as const,
    name: 'Ouro',
    icon: Crown,
    priceOriginal: 147,
    priceAnchor: 97,
    priceEarlyAdopter: 79,
    period: '/mês',
    description: 'Para corretores que querem crescer',
    features: [
      'Até 50 imóveis ativos',
      'Contatos ilimitados',
      'CRM completo + histórico',
      'Fluxo de caixa completo',
      'Contas a pagar/receber',
      'Relatórios completos',
      'Pipeline personalizável',
      'Documentos ilimitados',
      'Integrações de assinatura',
      '2 portais imobiliários',
    ],
    cta: 'Garantir Vaga',
    variant: 'default' as const,
    popular: true,
    hasEarlyAdopter: true,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500',
  },
  {
    id: 'diamante' as const,
    name: 'Diamante',
    icon: Sparkles,
    priceOriginal: 297,
    priceAnchor: 197,
    priceEarlyAdopter: 179,
    period: '/mês',
    description: 'Para imobiliárias e equipes',
    features: [
      'Tudo do plano Ouro',
      'Imóveis ilimitados',
      'Gestão de ativos completa',
      'DRE e edição de categorias',
      'Edição de layout de docs',
      'Todos os portais',
      'Integração WhatsApp',
      'Gestão de Equipe completa',
      'Roleta de leads automática',
      'Split de comissões',
    ],
    cta: 'Garantir Vaga',
    variant: 'outline' as const,
    popular: false,
    hasEarlyAdopter: true,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500',
  },
];

export function PricingSection() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: 'free' | 'ouro' | 'diamante') => {
    // Free plan - just go to auth
    if (planId === 'free') {
      navigate('/auth');
      return;
    }

    setLoadingPlan(planId);

    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in - redirect to auth with plan parameter
        navigate(`/auth?plan=${planId}`);
        return;
      }

      // User is authenticated - create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan_id: planId }
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error('Erro ao iniciar checkout. Tente novamente.');
        return;
      }

      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
      } else {
        toast.error('Erro ao obter URL de checkout.');
      }
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
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Planos para cada momento
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece grátis e escale conforme seu negócio cresce. Sem surpresas, sem letras miúdas.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loadingPlan === plan.id;
            
            return (
              <Card 
                key={plan.id} 
                className={cn(
                  'relative flex flex-col',
                  plan.popular 
                    ? 'border-amber-500 shadow-xl scale-105 z-10' 
                    : 'border-border/50'
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4">
                    <Zap className="h-3 w-3 mr-1" />
                    Mais Popular
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
                  <div className="text-center mb-6">
                    {plan.priceOriginal > 0 && (
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-sm text-muted-foreground line-through">
                          R$ {plan.priceOriginal}
                        </span>
                        <span className="text-xs text-green-600 font-medium">
                          -{Math.round(((plan.priceOriginal - plan.priceAnchor) / plan.priceOriginal) * 100)}%
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-foreground">
                        R$ {plan.priceAnchor}
                      </span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>

                  {/* Early Adopter Section */}
                  {plan.hasEarlyAdopter && (plan.id === 'ouro' || plan.id === 'diamante') && (
                    <div className="mb-6">
                      <div className={cn(
                        'rounded-lg p-4 border-2 border-dashed',
                        plan.id === 'ouro' ? 'border-amber-500/50 bg-amber-500/5' : 'border-purple-500/50 bg-purple-500/5'
                      )}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Zap className={cn('h-4 w-4', plan.colorClass)} />
                          <span className={cn('text-sm font-semibold', plan.colorClass)}>
                            EARLY ADOPTER
                          </span>
                        </div>
                        <div className="text-center mb-3">
                          <span className={cn('text-2xl font-bold', plan.colorClass)}>
                            R$ {plan.priceEarlyAdopter}
                          </span>
                          <span className="text-muted-foreground text-sm">/mês para sempre</span>
                        </div>
                        <EarlyAdopterCounter planId={plan.id} />
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
                  </ul>
                </CardContent>
                
                <CardFooter>
                  {plan.id === 'free' ? (
                    <Button 
                      asChild 
                      variant={plan.variant}
                      className="w-full"
                    >
                      <Link to="/auth">
                        {plan.cta}
                      </Link>
                    </Button>
                  ) : (
                    <Button 
                      variant={plan.variant}
                      className={cn(
                        'w-full',
                        plan.id === 'ouro' && 'bg-amber-500 hover:bg-amber-600 text-white',
                        plan.id === 'diamante' && 'border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white'
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
                  )}
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
            Cancele quando quiser. Sem compromisso de permanência.
          </p>
        </div>
      </div>
    </section>
  );
}
