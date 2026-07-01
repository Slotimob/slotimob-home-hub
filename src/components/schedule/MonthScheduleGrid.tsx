import { useMemo } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ACTIVITY_TYPES_ALL } from './ActivityPalette';

export type MonthEventKind = 'visit' | 'activity' | 'negotiation';

export interface MonthEvent {
  id: string;
  date: Date;
  time: string;
  title: string;
  color: string; // tailwind bg-* class for the dot
  kind: MonthEventKind;
  raw: any;
}

interface MonthScheduleGridProps {
  currentMonth: Date;
  selectedDate: Date;
  visits: any[];
  activities: any[];
  negotiationItems: any[];
  onDayClick: (date: Date) => void;
  onVisitClick?: (visit: any) => void;
  onActivityClick?: (activity: any) => void;
  onNegotiationClick?: (item: any) => void;
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function MonthScheduleGrid({
  currentMonth,
  selectedDate,
  visits,
  activities,
  negotiationItems,
  onDayClick,
  onVisitClick,
  onActivityClick,
  onNegotiationClick,
}: MonthScheduleGridProps) {
  const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, MonthEvent[]>();
    const push = (d: Date, ev: MonthEvent) => {
      const key = format(d, 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    };

    visits?.forEach((v) => {
      const d = new Date(v.scheduled_at);
      push(d, {
        id: `visit-${v.id}`,
        date: d,
        time: format(d, 'HH:mm'),
        title: v.leads?.name ?? 'Visita',
        color: 'bg-orange-500',
        kind: 'visit',
        raw: v,
      });
    });

    activities?.forEach((a) => {
      const d = new Date(a.scheduled_at);
      const info = ACTIVITY_TYPES_ALL.find((t) => t.id === a.activity_type);
      push(d, {
        id: `act-${a.id}`,
        date: d,
        time: format(d, 'HH:mm'),
        title: a.title ?? info?.label ?? 'Atividade',
        color: info?.color ?? 'bg-muted-foreground',
        kind: 'activity',
        raw: a,
      });
    });

    negotiationItems?.forEach((n) => {
      const d = new Date(n.scheduled_at);
      push(d, {
        id: `neg-${n.id ?? n.scheduled_at}`,
        date: d,
        time: format(d, 'HH:mm'),
        title: n.title ?? 'Negociação',
        color: 'bg-primary',
        kind: 'negotiation',
        raw: n,
      });
    });

    // sort each day's events by time
    map.forEach((arr) => arr.sort((a, b) => a.date.getTime() - b.date.getTime()));
    return map;
  }, [visits, activities, negotiationItems]);

  const handleChipClick = (e: React.MouseEvent, ev: MonthEvent) => {
    e.stopPropagation();
    if (ev.kind === 'visit') onVisitClick?.(ev.raw);
    else if (ev.kind === 'activity') onActivityClick?.(ev.raw);
    else onNegotiationClick?.(ev.raw);
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/50 border-b">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-2 text-xs font-semibold text-center text-muted-foreground uppercase">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) ?? [];
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          const inMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              type="button"
              key={key}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[96px] border-r border-b last:border-r-0 p-1.5 text-left flex flex-col gap-1 transition-colors hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring',
                !inMonth && 'bg-muted/20 text-muted-foreground/60',
                isSelected && 'ring-2 ring-primary ring-inset z-10'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-medium inline-flex items-center justify-center rounded-full w-6 h-6',
                    isToday && 'bg-primary text-primary-foreground font-bold'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visible.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => handleChipClick(e, ev)}
                    className="flex items-center gap-1 text-[10px] leading-tight rounded px-1 py-0.5 hover:bg-accent cursor-pointer truncate"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', ev.color)} />
                    <span className="tabular-nums text-muted-foreground shrink-0">{ev.time}</span>
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="text-[10px] text-muted-foreground pl-1">+{overflow}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleLegend() {
  return (
    <div className="bg-card rounded-lg border p-3 space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground">Legenda</h4>
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>Visita</span>
        </div>
        {ACTIVITY_TYPES_ALL.filter((a) => a.id !== 'visita').map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full', a.color)} />
            <span>{a.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span>Negociações</span>
        </div>
      </div>
    </div>
  );
}
