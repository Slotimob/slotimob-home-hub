import { useState } from 'react';
import type { DateRange as RDPRange } from 'react-day-picker';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DashboardDateFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function DashboardDateFilter({
  dateRange,
  onDateRangeChange,
  onRefresh,
  isRefreshing = false,
}: DashboardDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<RDPRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });

  const displayLabel =
    dateRange.from && dateRange.to
      ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
      : `${format(startOfMonth(new Date()), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`;

  const handleSelect = (range: RDPRange | undefined) => {
    setPendingRange(range);
    if (range?.from && range?.to) {
      onDateRangeChange({ from: range.from, to: range.to });
      setOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-9 justify-start text-left font-normal',
              !dateRange.from && 'text-muted-foreground'
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            {displayLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={pendingRange}
            onSelect={handleSelect}
            initialFocus
            numberOfMonths={2}
            locale={ptBR}
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      </Button>
    </div>
  );
}
