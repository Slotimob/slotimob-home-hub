import { TimeSlot } from './TimeSlot';
import { format } from 'date-fns';
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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00
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
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="bg-muted px-4 py-2 font-semibold text-center border-b">
        {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </div>
      <div className="divide-y divide-border">
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
