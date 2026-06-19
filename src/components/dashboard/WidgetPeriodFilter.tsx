import { useState, useMemo } from 'react';
import { startOfDay, endOfDay, startOf courseOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { Button } from '@/components/ui/button';

export type WidgetPeriod = 'today' | 'this_month' | 'last_month' | 'next_month';

interface UseWidgetPeriodReturn {
  period: WidgetPeriod;
  setPeriod: (period: WidgetPeriod) => void;
  dateRange: { from: Date; to: Date };
}

export function useWidgetPeriod(defaultPeriod: WidgetPeriod = 'this_month'): UseWidgetPeriodReturn {
  const [period, setPeriod] = useState<WidgetPeriod>(defaultPeriod);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'this_month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'last_month': {
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      }
      case 'next_month': {
        const nextMonth = addMonths(now, 1);
        return { from: startOfMonth(nextMonth), to: endOfMonth(nextMonth) };
      }
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  }, [period]);

  return { period, setPeriod, dateRange };
}

interface WidgetPeriodFilterProps {
  period: WidgetPeriod;
  onChange: (period: WidgetPeriod) => void;
}

const PERIOD_OPTIONS: { value: WidgetPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'this_month', label: 'Este Mês' },
  { value: 'last_month', label: 'Mês Pass.' },
  { value: 'next_month', label: 'Próx. Mês' },
];

export function WidgetPeriodFilter({ period, onChange }: WidgetPeriodFilterProps) {
  return (
    <div className="flex items-center gap-1">
      {PERIOD_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant="ghost"
          size="sm"
          onClick={() => onChange(option.value)}
          className={`h-6 px-2 text-[10px] ${
            period === option.value
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground'
          }`}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
