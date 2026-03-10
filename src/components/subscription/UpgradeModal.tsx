import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Rocket, Building2, Zap, Clock } from 'lucide-react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan?: 'essencial' | 'pro' | 'business';
  feature?: string;
}

const planBenefits = {
  essencial: [
    'Até 15 unidades',
    'CRM básico com Pipeline',
    'Financeiro: Visão Geral e Lançamentos',
    'Contatos ilimitados',
  ],
  pro: [
    'Gestão completa de Ativos e Contratos',
    'Relatórios Avançados (Financeiro, CRM, Ativos)',
    'Conciliação Bancária e DRE',
    'Até 50 unidades',
    'Chat IA com 250 tokens',
    'Documentos ilimitados',
    'Todas as integrações',
  ],
  business: [
    'Tudo do plano Pro',
    'Gestão de Equipe (Múltiplos Usuários)',
    'Distribuição de Negociações',
    'Limite estendido para 150 Unidades',
    'WhatsApp liberado para múltiplos atendentes',
    '3 usuários inclusos + add-ons',
  ],
};

const planTitles = {
  essencial: 'Comece a profissionalizar sua operação ⚡',
  pro: 'Desbloqueie todo o seu potencial com o Plano PRO 🚀',
  business: 'Evolua para o Plano Business! 🏢',
};

const planDescriptions = {
  essencial: 'O Essencial é ideal para corretores individuais que querem organizar sua operação.',
  pro: 'Gestão completa de Ativos e Contratos, Relatórios Avançados, Conciliação Bancária e muito mais Tokens de IA.',
  business: 'Gestão de Equipe (Múltiplos Usuários), Distribuição de Negociações, Limite estendido para 150 Unidades e WhatsApp Liberado para múltiplos atendentes.',
};

export const UpgradeModal = ({ open, onOpenChange, targetPlan: targetPlanProp, feature }: UpgradeModalProps) => {
  const { plan: currentPlan } = useSubscriptionLimits();
  const { slots } = useEarlyAdopterCount();

  // Dynamic target: if user is PRO, suggest Business; otherwise suggest PRO
  const resolvedTarget = targetPlanProp 
    ? (currentPlan === 'pro' && targetPlanProp !== 'essencial' ? 'business' : targetPlanProp)
    : (currentPlan === 'pro' ? 'business' : 'pro');

  const earlyAdopterSlots = slots[resolvedTarget];
  const hasEarlyAdopterSlots = earlyAdopterSlots && earlyAdopterSlots.remaining > 0;

  const planConfig = {
    essencial: {
      name: 'Essencial',
      icon: Zap,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500',
      borderColor: 'border-emerald-500',
      priceOriginal: 39.90,
      priceAnchor: 29.90,
      priceEarlyAdopter: 19.90,
    },
    pro: {
      name: 'Pro',
      icon: Rocket,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-500',
      priceOriginal: 147,
      priceAnchor: 97,
      priceEarlyAdopter: 79,
    },
    business: {
      name: 'Business',
      icon: Building2,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500',
      borderColor: 'border-purple-500',
      priceOriginal: 297,
      priceAnchor: 197,
      priceEarlyAdopter: 179,
    },
  };

  const config = planConfig[resolvedTarget];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <DialogTitle className="text-lg">{planTitles[resolvedTarget]}</DialogTitle>
          </div>
          <DialogDescription>
            {feature
              ? `A funcionalidade "${feature}" requer o plano ${config.name}. ${planDescriptions[resolvedTarget]}`
              : planDescriptions[resolvedTarget]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`p-4 rounded-lg border-2 ${config.borderColor} bg-card`}>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">
                R$ {hasEarlyAdopterSlots ? config.priceEarlyAdopter : config.priceAnchor}
              </span>
              <span className="text-muted-foreground">/mês</span>
              {hasEarlyAdopterSlots && (
                <Badge variant="secondary" className="ml-2">
                  <Zap className="h-3 w-3 mr-1" />
                  Early Adopter
                </Badge>
              )}
            </div>
            
            {hasEarlyAdopterSlots && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-2">
                <Clock className="h-4 w-4" />
                <span>
                  Apenas <strong>{earlyAdopterSlots.remaining}</strong> vagas restantes!
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="line-through">R$ {config.priceOriginal}</span>
              <span>→</span>
              <span className="text-green-600">
                Economize R$ {(config.priceOriginal - (hasEarlyAdopterSlots ? config.priceEarlyAdopter : config.priceAnchor)).toFixed(2)}/mês
                {hasEarlyAdopterSlots ? ' para sempre!' : ''}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">O que você desbloqueia:</h4>
            <ul className="space-y-2">
              {planBenefits[resolvedTarget].map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className={`h-4 w-4 ${config.color} shrink-0 mt-0.5`} />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Agora não
            </Button>
            <Button asChild className={`flex-1 ${config.bgColor} hover:opacity-90`}>
              <Link to={`/checkout?plan=${resolvedTarget}&cycle=annual&mode=immediate`} onClick={() => onOpenChange(false)}>
                <Zap className="h-4 w-4 mr-2" />
                Fazer Upgrade Agora
              </Link>
            </Button>
          </div>

          {currentPlan === 'free' && resolvedTarget === 'pro' && (
            <p className="text-xs text-center text-muted-foreground">
              Para começar menor, veja o{' '}
              <Link to="/checkout?plan=essencial&cycle=annual&mode=immediate" className="text-emerald-500 hover:underline" onClick={() => onOpenChange(false)}>Plano Essencial a partir de R$ 19,90/mês</Link>
            </p>
          )}
          {currentPlan === 'pro' && resolvedTarget === 'business' && (
            <p className="text-xs text-center text-muted-foreground">
              O Business é ideal para imobiliárias e equipes que precisam de gestão colaborativa.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
