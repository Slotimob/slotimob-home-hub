import { Zap, Clock, ArrowRight, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useWorkspace } from '@/hooks/useWorkspace';
import { describeTrialEnd } from '@/lib/trial';

export function TrialBanner() {
  const { isTrialActive, trialDaysRemaining, trialEndsAt, isLoading: trialLoading } = useTrialStatus();
  const { plan, isLoading: planLoading } = useSubscriptionLimits();
  const { isMember } = useWorkspace();

  if (trialLoading || planLoading) return null;

  // Members don't have their own trial - they use the Master's subscription
  if (isMember) return null;

  // Only show for free/trialing users
  if (plan !== 'free' && !isTrialActive) return null;

  if (isTrialActive) {
    const info = describeTrialEnd(trialEndsAt);
    const urgent = info?.isUrgent ?? false;

    const tone = urgent
      ? {
          wrapper: 'border-amber-500/30 bg-amber-500/5',
          icon: 'text-amber-600 dark:text-amber-400',
          button: 'border-amber-500/50 text-amber-600 hover:bg-amber-500/10',
        }
      : {
          wrapper: 'border-blue-500/30 bg-blue-500/5',
          icon: 'text-blue-600 dark:text-blue-400',
          button: 'border-blue-500/50 text-blue-600 hover:bg-blue-500/10',
        };

    return (
      <div className={`rounded-lg border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${tone.wrapper}`}>
        <div className={`flex items-center gap-2 ${tone.icon}`}>
          <PartyPopper className="h-5 w-5" />
          <span className="font-semibold text-sm">Teste grátis do Pro</span>
        </div>
        <div className="flex-1 min-w-0">
          {info ? (
            <p className="text-sm text-muted-foreground">
              Seu teste do Pro <strong className="text-foreground">{info.headline}</strong> ({info.countdown}).
              Depois, sua conta continua no plano Start, gratuito, e IA, Documentos e Relatórios ficam bloqueados.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você tem <strong className="text-foreground">{trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}</strong> de acesso Pro restando.
              Depois, sua conta continua no plano Start, gratuito, e IA, Documentos e Relatórios ficam bloqueados.
            </p>
          )}
        </div>
        <Button asChild size="sm" variant="outline" className={`shrink-0 ${tone.button}`}>
          <Link to="/checkout?plan=pro&cycle=annual&mode=immediate">
            <ArrowRight className="h-4 w-4 mr-1" />
            Assinar o Pro
          </Link>
        </Button>
      </div>
    );
  }

  // Trial expired - incentive to Essencial as entry point
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <Clock className="h-5 w-5" />
        <span className="font-semibold text-sm">Trial Expirado</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">
          Seu teste do Pro terminou. Assine para voltar a usar IA, Documentos, Relatórios e a gestão completa.
        </p>
      </div>
        <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
          <Link to="/planos">
            <Zap className="h-4 w-4 mr-1" />
            Ver planos
          </Link>
        </Button>
    </div>
  );
}
