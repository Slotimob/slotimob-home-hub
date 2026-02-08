import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricChangeProps {
  current: number;
  previous: number;
  format?: 'number' | 'currency' | 'percentage';
  showPeriodFilter?: boolean;
}

export const MetricChange = ({ current, previous, format = 'number', showPeriodFilter = true }: MetricChangeProps) => {
  if (!showPeriodFilter) {
    return null;
  }

  const change = current - previous;
  const percentChange = previous > 0 ? ((change / previous) * 100) : (current > 0 ? 100 : 0);
  
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return `R$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      case 'percentage':
        return `${Math.abs(value).toFixed(1)}%`;
      default:
        return Math.abs(value).toString();
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-medium",
      isPositive && "text-green-600 dark:text-green-500",
      isNegative && "text-red-600 dark:text-red-500",
      isNeutral && "text-muted-foreground"
    )}>
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNegative && <TrendingDown className="h-3 w-3" />}
      {isNeutral && <Minus className="h-3 w-3" />}
      <span>
        {isPositive && '+'}
        {isNegative && '-'}
        {percentChange.toFixed(1)}%
      </span>
      <span className="text-muted-foreground">
        vs período anterior
      </span>
    </div>
  );
};
