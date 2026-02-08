import { useDroppable } from '@dnd-kit/core';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DraggableActivity } from './DraggableActivity';
import { WeekNavigation } from './WeekNavigation';
import { Briefcase, CheckSquare, Target } from 'lucide-react';
import type { NegotiationScheduleItem } from '@/hooks/useNegotiationScheduleItems';

interface WeekScheduleGridProps {
  selectedDate: Date;
  activities: any[];
  negotiationItems?: NegotiationScheduleItem[];
  onActivityClick?: (activity: any) => void;
  onActivityResize: (activityId: string, newDuration: number) => void;
  onDateChange?: (date: Date) => void;
  onNegotiationItemClick?: (item: NegotiationScheduleItem) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00
const HOUR_HEIGHT = 60;

interface WeekSlotProps {
  hour: number;
  date: Date;
  activities: any[];
  negotiationItems: NegotiationScheduleItem[];
  onActivityClick?: (activity: any) => void;
  onActivityResize: (activityId: string, newDuration: number) => void;
  onNegotiationItemClick?: (item: NegotiationScheduleItem) => void;
}

function WeekSlot({ 
  hour, 
  date, 
  activities, 
  negotiationItems,
  onActivityClick, 
  onActivityResize,
  onNegotiationItemClick 
}: WeekSlotProps) {
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

  const slotNegotiationItems = negotiationItems.filter((item) => {
    const itemDate = new Date(item.scheduled_at);
    return isSameDay(itemDate, date) && itemDate.getHours() === hour;
  });

  const getTypeIcon = (type: string) => {
    if (type === 'task') return CheckSquare;
    if (type === 'expected_close') return Target;
    return Briefcase;
  };

  return (
    <div
      ref={setNodeRef}
      style={{ height: HOUR_HEIGHT }}
      className={cn(
        'border-r border-b border-border p-0.5 transition-colors overflow-visible relative',
        isOver && 'bg-primary/10 ring-2 ring-primary ring-inset'
      )}
    >
      {/* Regular activities */}
      {slotActivities.map((activity) => (
        <DraggableActivity
          key={activity.id}
          activity={activity}
          hourHeight={HOUR_HEIGHT}
          onResize={onActivityResize}
          onClick={onActivityClick}
        />
      ))}

      {/* Negotiation items */}
      {slotNegotiationItems.map((item) => {
        const Icon = getTypeIcon(item.type);
        return (
          <div
            key={item.id}
            onClick={() => onNegotiationItemClick?.(item)}
            className={cn(
              'text-[10px] px-1 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-opacity mb-0.5',
              'bg-primary/10 border-primary/30 text-primary',
              item.is_completed && 'opacity-50'
            )}
          >
            <div className="flex items-center gap-0.5 truncate">
              <Icon className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{item.title}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WeekScheduleGrid({ 
  selectedDate, 
  activities, 
  negotiationItems = [],
  onActivityClick, 
  onActivityResize, 
  onDateChange,
  onNegotiationItemClick 
}: WeekScheduleGridProps) {
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
                  negotiationItems={negotiationItems}
                  onActivityClick={onActivityClick}
                  onActivityResize={onActivityResize}
                  onNegotiationItemClick={onNegotiationItemClick}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
