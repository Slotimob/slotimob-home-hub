import { Clock, Zap } from 'lucide-react';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';
import { cn } from '@/lib/utils';

interface EarlyAdopterCounterProps {
  planId: 'essencial' | 'pro' | 'business';
  className?: string;
}

export const EarlyAdopterCounter = ({ planId, className }: EarlyAdopterCounterProps) => {
  const { slots, isLoading } = useEarlyAdopterCount();
  
  const slotData = slots[planId];

  if (isLoading || !slotData || slotData.remaining <= 0) return null;

  const percentRemaining = (slotData.remaining / slotData.total) * 100;
  const isUrgent = percentRemaining <= 25;
  const isCritical = percentRemaining <= 10;

  return (
    <div className={cn(
      'rounded-lg p-3 text-center transition-all duration-300',
      isCritical ? 'bg-red-500/10 border border-red-500/30 animate-pulse' :
      isUrgent ? 'bg-amber-500/10 border border-amber-500/30' :
      'bg-secondary/50 border border-secondary',
      className
    )}>
      <div className="flex items-center justify-center gap-2 mb-1">
        {isCritical ? <Zap className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-amber-500" />}
        <span className={cn('text-xs font-semibold uppercase tracking-wide', isCritical ? 'text-red-500' : 'text-amber-500')}>
          Early Adopter
        </span>
      </div>
      <div className="flex items-baseline justify-center gap-1">
        <span className={cn('text-2xl font-bold tabular-nums', isCritical ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-foreground')}>
          {slotData.remaining}
        </span>
        <span className="text-sm text-muted-foreground">/{slotData.total}</span>
      </div>
      <p className={cn('text-xs', isCritical ? 'text-red-500' : 'text-muted-foreground')}>
        {isCritical ? 'Últimas vagas!' : 'vagas restantes'}
      </p>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', isCritical ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-secondary')}
          style={{ width: `${100 - percentRemaining}%` }} />
      </div>
    </div>
  );
};
