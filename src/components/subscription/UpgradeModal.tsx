import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Rocket, Building2, Zap, Clock } from 'lucide-react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';
import { Link } from 'react-router-dom';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan?: 'essencial' | 'pro' | 'business';
  feature?: string;
}

const planBenefits = {
  essencial: [
    'Até 10 unidades',
    'CRM básico com Pipeline',
    'Financeiro: Visão Geral e Lançamentos',
    'Contatos ilimitados',
  ],
  pro: [
    'Até 50 unidades',
    'CRM completo com histórico',
    'Relatórios completos',
    'Documentos ilimitados',
    'Chat IA',
    'Gestão de ativos completa',
    'Todas as integrações',
  ],
  business: [
    'Tudo do plano Pro',
    'Até 80 unidades (+ add-ons)',
    '3 usuários inclusos',
    'Gestão de Equipe (RBAC)',
    'Usuários adicionais disponíveis',
  ],
};

export const UpgradeModal = ({ open, onOpenChange, targetPlan = 'essencial', feature }: UpgradeModalProps) => {
  const { plan: currentPlan } = useSubscriptionLimits();
  const { slots } = useEarlyAdopterCount();

  const earlyAdopterSlots = slots[targetPlan];
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

  const config = planConfig[targetPlan];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <DialogTitle>Upgrade para {config.name}</DialogTitle>
          </div>
          {feature && (
            <DialogDescription>
              Esta funcionalidade requer o plano {config.name}.
            </DialogDescription>
          )}
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
                Economize R$ {config.priceOriginal - (hasEarlyAdopterSlots ? config.priceEarlyAdopter : config.priceAnchor)}/mês
                {hasEarlyAdopterSlots ? ' para sempre!' : ''}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">O que você desbloqueia:</h4>
            <ul className="space-y-2">
              {planBenefits[targetPlan].map((benefit, index) => (
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
              <Link to={`/checkout?plan=${targetPlan}&cycle=annual&mode=immediate`} onClick={() => onOpenChange(false)}>
                <Zap className="h-4 w-4 mr-2" />
                Fazer Upgrade
              </Link>
            </Button>
          </div>

          {currentPlan === 'free' && targetPlan === 'essencial' && (
            <p className="text-xs text-center text-muted-foreground">
              O Essencial desbloqueia 10 unidades. Para gestão completa, veja o{' '}
              <Link to="/checkout?plan=pro&cycle=annual&mode=immediate" className="text-blue-500 hover:underline" onClick={() => onOpenChange(false)}>Plano Pro a partir de R$ 79/mês</Link>
            </p>
          )}
          {currentPlan === 'essencial' && targetPlan === 'business' && (
            <p className="text-xs text-center text-muted-foreground">
              Também disponível: <Link to="/checkout?plan=pro&cycle=annual&mode=immediate" className="text-blue-500 hover:underline">Plano Pro a partir de R$ 79/mês</Link>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
