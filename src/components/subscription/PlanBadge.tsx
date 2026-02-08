import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, User } from 'lucide-react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { cn } from '@/lib/utils';

interface PlanBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export const PlanBadge = ({ className, showLabel = true }: PlanBadgeProps) => {
  const { plan, isEarlyAdopter, isLoading } = useSubscriptionLimits();

  if (isLoading) {
    return null;
  }

  const planConfig = {
    free: {
      label: 'Free',
      icon: User,
      className: 'bg-muted text-muted-foreground',
    },
    ouro: {
      label: isEarlyAdopter ? 'Ouro (Early Adopter)' : 'Ouro',
      icon: Crown,
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    diamante: {
      label: isEarlyAdopter ? 'Diamante (Early Adopter)' : 'Diamante',
      icon: Sparkles,
      className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
  };

  const config = planConfig[plan];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className="h-3 w-3 mr-1" />
      {showLabel && config.label}
    </Badge>
  );
};
