import { useEffect, useState } from 'react';
import { TimeSlot } from './TimeSlot';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NegotiationScheduleItem } from '@/hooks/useNegotiationScheduleItems';
import type { VisitLike } from './DraggableVisit';

interface DayScheduleGridProps {
  date: Date;
  activities: any[];
  visits?: VisitLike[];
  negotiationItems?: NegotiationScheduleItem[];
  onActivityClick?: (activity: any) => void;
  onActivityResize?: (activityId: string, newDuration: number) => void;
  onNegotiationItemClick?: (item: NegotiationScheduleItem) => void;
  onVisitClick?: (visit: VisitLike) => void;
}

const START_HOUR = 7;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
const HOUR_HEIGHT = 60;

export function DayScheduleGrid({
  date,
  activities,
  visits = [],
  negotiationItems = [],
  onActivityClick,
  onActivityResize,
  onNegotiationItemClick,
  onVisitClick,
}: DayScheduleGridProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const isToday = isSameDay(date, now);
  const offsetMin = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  const showNow = isToday && offsetMin >= 0 && offsetMin <= (END_HOUR - START_HOUR + 1) * 60;
  const nowTop = 40 /* header height approx */ + offsetMin;

  return (
    <div className="bg-card rounded-lg border overflow-hidden relative">
      <div className="bg-muted px-4 py-2 font-semibold text-center border-b">
        {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </div>
      <div className="divide-y divide-border relative">
        {showNow && (
          <div
            className="absolute left-16 right-0 z-20 pointer-events-none"
            style={{ top: `${offsetMin}px` }}
          >
            <div className="relative flex items-center">
              <div className="absolute -left-2 w-3 h-3 rounded-full bg-red-500 shadow" />
              <div className="w-full border-t-2 border-red-500" />
              <span className="absolute -top-2 right-1 text-[10px] font-semibold text-red-500 bg-card px-1">
                agora
              </span>
            </div>
          </div>
        )}
        {HOURS.map((hour) => (
          <div key={hour} className="flex">
            <div className="w-16 flex-shrink-0 bg-muted/50 px-2 py-2 text-xs text-muted-foreground font-medium text-right">
              {hour.toString().padStart(2, '0')}:00
            </div>
            <div className="flex-1">
              <TimeSlot
                hour={hour}
                date={date}
                activities={activities}
                visits={visits}
                negotiationItems={negotiationItems}
                hourHeight={HOUR_HEIGHT}
                onActivityClick={onActivityClick}
                onActivityResize={onActivityResize}
                onNegotiationItemClick={onNegotiationItemClick}
                onVisitClick={onVisitClick}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
