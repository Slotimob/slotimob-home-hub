import { useDroppable } from '@dnd-kit/core';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DraggableActivity } from './DraggableActivity';
import { WeekNavigation } from './WeekNavigation';

interface WeekScheduleGridProps {
  selectedDate: Date;
  activities: any[];
  onActivityClick?: (activity: any) => void;
  onActivityResize: (activityId: string, newDuration: number) => void;
  onDateChange?: (date: Date) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00
const HOUR_HEIGHT = 60;

interface WeekSlotProps {
  hour: number;
  date: Date;
  activities: any[];
  onActivityClick?: (activity: any) => void;
  onActivityResize: (activityId: string, newDuration: number) => void;
}

function WeekSlot({ hour, date, activities, onActivityClick, onActivityResize }: WeekSlotProps) {
  const slotId = `week-slot-${format(date, 'yyyy-MM-dd')}-${hour}`;
  
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: {
      hour,
      date,
    },
  });

  const slotActivities = activities.filter((activity) => {
    const activityDate = new Date(activity.scheduled_at);
    return isSameDay(activityDate, date) && activityDate.getHours() === hour;
  });

  return (
    <div
      ref={setNodeRef}
      style={{ height: HOUR_HEIGHT }}
      className={cn(
        'border-r border-b border-border p-0.5 transition-colors overflow-visible relative',
        isOver && 'bg-primary/10 ring-2 ring-primary ring-inset'
      )}
    >
      {slotActivities.map((activity) => (
        <DraggableActivity
          key={activity.id}
          activity={activity}
          hourHeight={HOUR_HEIGHT}
          onResize={onActivityResize}
          onClick={onActivityClick}
        />
      ))}
    </div>
  );
}

export function WeekScheduleGrid({ selectedDate, activities, onActivityClick, onActivityResize, onDateChange }: WeekScheduleGridProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-2">
      {onDateChange && (
        <WeekNavigation selectedDate={selectedDate} onDateChange={onDateChange} />
      )}
      
      <div className="bg-card rounded-lg border overflow-hidden">
        {/* Header with day names */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-muted border-b">
          <div className="p-2 text-xs font-medium text-muted-foreground text-center border-r">
            Hora
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'p-2 text-center border-r last:border-r-0',
                isSameDay(day, selectedDate) && 'bg-primary/10'
              )}
            >
              <div className="text-xs font-medium text-muted-foreground">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={cn(
                'text-sm font-bold',
                isSameDay(day, new Date()) && 'text-primary'
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="overflow-auto max-h-[600px]">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)]">
              <div className="bg-muted/50 px-2 py-2 text-xs text-muted-foreground font-medium text-right border-r border-b flex items-start justify-end">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((day) => (
                <WeekSlot
                  key={`${day.toISOString()}-${hour}`}
                  hour={hour}
                  date={day}
                  activities={activities}
                  onActivityClick={onActivityClick}
                  onActivityResize={onActivityResize}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
