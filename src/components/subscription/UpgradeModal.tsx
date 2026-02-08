import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Zap, Clock } from 'lucide-react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';
import { Link } from 'react-router-dom';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan?: 'ouro' | 'diamante';
  feature?: string;
}

const planBenefits = {
  ouro: [
    'Até 50 ativos',
    'Contatos ilimitados',
    'CRM completo com histórico',
    'Fluxo de caixa completo',
    'Relatórios semanais e mensais',
    'Pipeline personalizável',
    '2 portais imobiliários',
  ],
  diamante: [
    'Ativos ilimitados',
    'Tudo do plano Ouro',
    'DRE e gestão de categorias',
    'Edição de layout de documentos',
    'Todos os portais imobiliários',
    'Integração WhatsApp',
    'Gestão de Equipe completa',
  ],
};

export const UpgradeModal = ({ open, onOpenChange, targetPlan = 'ouro', feature }: UpgradeModalProps) => {
  const { plan: currentPlan } = useSubscriptionLimits();
  const { slots } = useEarlyAdopterCount();

  const earlyAdopterSlots = targetPlan === 'ouro' ? slots.ouro : slots.diamante;
  const hasEarlyAdopterSlots = earlyAdopterSlots && earlyAdopterSlots.remaining > 0;

  const planConfig = {
    ouro: {
      name: 'Ouro',
      icon: Crown,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500',
      borderColor: 'border-amber-500',
      priceOriginal: 147,
      priceAnchor: 97,
      priceEarlyAdopter: 79,
    },
    diamante: {
      name: 'Diamante',
      icon: Sparkles,
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
          {/* Pricing */}
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
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-2">
                <Clock className="h-4 w-4" />
                <span>
                  Apenas <strong>{earlyAdopterSlots.remaining}</strong> vagas restantes com preço promocional!
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="line-through">R$ {config.priceOriginal}</span>
              {!hasEarlyAdopterSlots && (
                <>
                  <span>→</span>
                  <span className="text-green-600">Economize R$ {config.priceOriginal - config.priceAnchor}/mês</span>
                </>
              )}
              {hasEarlyAdopterSlots && (
                <>
                  <span>→</span>
                  <span className="text-green-600">Economize R$ {config.priceOriginal - config.priceEarlyAdopter}/mês para sempre!</span>
                </>
              )}
            </div>
          </div>

          {/* Benefits */}
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

          {/* CTA */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Agora não
            </Button>
            <Button asChild className={`flex-1 ${config.bgColor} hover:opacity-90`}>
              <Link to="/#pricing" onClick={() => onOpenChange(false)}>
                <Zap className="h-4 w-4 mr-2" />
                Fazer Upgrade
              </Link>
            </Button>
          </div>

          {currentPlan === 'free' && targetPlan === 'diamante' && (
            <p className="text-xs text-center text-muted-foreground">
              Também disponível: <Link to="/#pricing" className="text-amber-500 hover:underline">Plano Ouro a partir de R$ 79/mês</Link>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
