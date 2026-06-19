import { useEffect, useState } from 'react';
import type { DateRange as RDPRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type DatePreset = '7d' | '15d' | '30d' | '90d' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DashboardDateFilterProps {
  dateRange: DateRange;
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const PRESET_LABELS: Record<DatePreset, string> = {
  '7d': 'Últimos 7 dias',
  '15d': 'Últimos 15 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  'custom': 'Período Personalizado',
};

export function DashboardDateFilter({
  dateRange,
  preset,
  onPresetChange,
  onDateRangeChange,
  onRefresh,
  isRefreshing = false,
}: DashboardDateFilterProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<RDPRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });

  // Sync local pending state when dateRange changes externally (e.g., preset switch)
  useEffect(() => {
    setPendingRange({ from: dateRange.from, to: dateRange.to });
  }, [dateRange.from, dateRange.to]);

  const handlePresetChange = (value: DatePreset) => {
    if (value === 'custom') {
      setCustomOpen(true);
      onPresetChange(value);
    } else {
      const now = new Date();
      const days = value === '7d' ? 7 : value === '15d' ? 15 : value === '30d' ? 30 : 90;
      onDateRangeChange({
        from: subDays(now, days),
        to: now,
      });
      onPresetChange(value);
    }
  };

  const getDisplayLabel = () => {
    if (preset === 'custom' && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}`;
    }
    return PRESET_LABELS[preset];
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <Select value={preset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue>{getDisplayLabel()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{PRESET_LABELS['7d']}</SelectItem>
            <SelectItem value="15d">{PRESET_LABELS['15d']}</SelectItem>
            <SelectItem value="30d">{PRESET_LABELS['30d']}</SelectItem>
            <SelectItem value="90d">{PRESET_LABELS['90d']}</SelectItem>
            <SelectItem value="custom">{PRESET_LABELS['custom']}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {preset === 'custom' && (
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              {dateRange.from && dateRange.to ? (
                `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
              ) : (
                "Selecionar período"
              )}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to });
                  setCustomOpen(false);
                } else if (range?.from) {
                  onDateRangeChange({ from: range.from, to: range.from });
                }
              }}
              initialFocus
              numberOfMonths={2}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
      </Button>
    </div>
  );
}
