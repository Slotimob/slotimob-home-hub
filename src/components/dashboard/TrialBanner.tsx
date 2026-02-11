import { Zap, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';

export function TrialBanner() {
  const { isTrialActive, trialDaysRemaining, isLoading: trialLoading } = useTrialStatus();
  const { plan, isLoading: planLoading } = useSubscriptionLimits();

  if (trialLoading || planLoading) return null;

  // Only show for free users
  if (plan !== 'free') return null;

  if (isTrialActive) {
    return (
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Zap className="h-5 w-5" />
          <span className="font-semibold text-sm">Trial Pro Ativo</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">
            Você tem <strong className="text-foreground">{trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}</strong> de acesso Pro restando. 
            Aproveite IA, Documentos e Relatórios!
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="border-blue-500/50 text-blue-600 hover:bg-blue-500/10 shrink-0">
          <Link to="/#pricing">
            <ArrowRight className="h-4 w-4 mr-1" />
            Ver Planos
          </Link>
        </Button>
      </div>
    );
  }

  // Trial expired - show conversion CTA
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <Clock className="h-5 w-5" />
        <span className="font-semibold text-sm">Trial Expirado</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">
          Seu acesso Pro expirou. Faça upgrade a partir de <strong className="text-foreground">R$ 19,90/mês</strong> para desbloquear até 10 unidades.
        </p>
      </div>
      <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
        <Link to="/#pricing">
          <Zap className="h-4 w-4 mr-1" />
          Fazer Upgrade
        </Link>
      </Button>
    </div>
  );
}
