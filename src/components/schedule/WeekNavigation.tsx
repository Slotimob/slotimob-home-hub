import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeekNavigationProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function WeekNavigation({ selectedDate, onDateChange }: WeekNavigationProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

  const handlePreviousWeek = () => {
    onDateChange(subWeeks(selectedDate, 1));
  };

  const handleNextWeek = () => {
    onDateChange(addWeeks(selectedDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2 bg-muted/50 rounded-lg border">
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePreviousWeek}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Semana anterior</span>
      </Button>

      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {format(weekStart, "dd 'de' MMM", { locale: ptBR })} - {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToday}
          className="h-8 text-xs"
        >
          Hoje
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextWeek}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Próxima semana</span>
        </Button>
      </div>
    </div>
  );
}
