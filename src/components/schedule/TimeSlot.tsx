import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DraggableActivity } from './DraggableActivity';
import { DraggableVisit, type VisitLike } from './DraggableVisit';
import { Briefcase, CheckSquare, Target } from 'lucide-react';
import type { NegotiationScheduleItem } from '@/hooks/useNegotiationScheduleItems';

interface TimeSlotProps {
  hour: number;
  date: Date;
  activities: any[];
  visits?: VisitLike[];
  negotiationItems?: NegotiationScheduleItem[];
  hourHeight?: number;
  onActivityClick?: (activity: any) => void;
  onActivityResize?: (activityId: string, newDuration: number) => void;
  onNegotiationItemClick?: (item: NegotiationScheduleItem) => void;
  onVisitClick?: (visit: VisitLike) => void;
}

export function TimeSlot({ 
  hour, 
  date, 
  activities, 
  negotiationItems = [],
  hourHeight = 60, 
  onActivityClick, 
  onActivityResize,
  onNegotiationItemClick 
}: TimeSlotProps) {
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
      style={{ minHeight: hourHeight }}
      className={cn(
        'border-b border-border p-1 transition-colors relative',
        isOver && 'bg-primary/10 ring-2 ring-primary ring-inset'
      )}
    >
      <div className="flex flex-col gap-1">
        {/* Regular activities */}
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

        {/* Negotiation items (from Pipeline) */}
        {slotNegotiationItems.map((item) => {
          const Icon = getTypeIcon(item.type);
          return (
            <div
              key={item.id}
              onClick={() => onNegotiationItemClick?.(item)}
              className={cn(
                'text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-80 transition-opacity',
                'bg-primary/10 border-primary/30 text-primary',
                item.is_completed && 'opacity-50 line-through'
              )}
            >
              <div className="flex items-center gap-1">
                <Icon className="h-3 w-3 flex-shrink-0" />
                <span className="font-medium truncate">{item.title}</span>
              </div>
              <div className="text-[10px] opacity-70 flex items-center gap-1">
                <Briefcase className="h-2.5 w-2.5" />
                {item.deal_lead_name}
              </div>
            </div>
          );
        })}
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
