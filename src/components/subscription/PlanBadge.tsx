import { Badge } from '@/components/ui/badge';
import { Briefcase, Rocket, Building2 } from 'lucide-react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { cn } from '@/lib/utils';

interface PlanBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export const PlanBadge = ({ className, showLabel = true }: PlanBadgeProps) => {
  const { plan, isEarlyAdopter, isLoading } = useSubscriptionLimits();

  if (isLoading) return null;

  const planConfig: Record<string, { label: string; icon: typeof Briefcase; className: string }> = {
    essencial: {
      label: isEarlyAdopter ? 'Essencial (EA)' : 'Essencial',
      icon: Briefcase,
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    pro: {
      label: isEarlyAdopter ? 'Pro (EA)' : 'Pro',
      icon: Rocket,
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    business: {
      label: isEarlyAdopter ? 'Business (EA)' : 'Business',
      icon: Building2,
      className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
  };

  const config = planConfig[plan] || planConfig.essencial;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className="h-3 w-3 mr-1" />
      {showLabel && config.label}
    </Badge>
  );
};
