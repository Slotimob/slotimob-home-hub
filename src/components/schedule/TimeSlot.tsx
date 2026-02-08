import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DraggableActivity } from './DraggableActivity';

interface TimeSlotProps {
  hour: number;
  date: Date;
  activities: any[];
  hourHeight?: number;
  onActivityClick?: (activity: any) => void;
  onActivityResize?: (activityId: string, newDuration: number) => void;
}

export function TimeSlot({ hour, date, activities, hourHeight = 60, onActivityClick, onActivityResize }: TimeSlotProps) {
  const slotId = `slot-${format(date, 'yyyy-MM-dd')}-${hour}`;
  
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
      style={{ minHeight: hourHeight }}
      className={cn(
        'border-b border-border p-1 transition-colors relative',
        isOver && 'bg-primary/10 ring-2 ring-primary ring-inset'
      )}
    >
      <div className="flex flex-col gap-1">
        {slotActivities.map((activity) => (
          onActivityResize ? (
            <DraggableActivity
              key={activity.id}
              activity={activity}
              hourHeight={hourHeight}
              onResize={onActivityResize}
              onClick={onActivityClick}
            />
          ) : (
            <div
              key={activity.id}
              onClick={() => onActivityClick?.(activity)}
              className={cn(
                'text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-80 transition-opacity',
                getActivityColor(activity.activity_type)
              )}
            >
              <div className="font-medium truncate max-w-[150px]">{activity.title}</div>
              <div className="text-[10px] opacity-70">
                {format(new Date(activity.scheduled_at), 'HH:mm', { locale: ptBR })}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

function getActivityColor(type: string) {
  switch (type) {
    case 'ligar': return 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300';
    case 'email': return 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300';
    case 'reuniao': return 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300';
    case 'tarefa': return 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300';
    case 'mensagem': return 'bg-pink-500/20 border-pink-500 text-pink-700 dark:text-pink-300';
    case 'visita': return 'bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300';
    default: return 'bg-muted border-border';
  }
}
