import { useState, useRef, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GripHorizontal, GripVertical } from 'lucide-react';

interface DraggableActivityProps {
  activity: {
    id: string;
    title: string;
    activity_type: string;
    scheduled_at: string;
    duration_minutes: number | null;
    leads?: { name: string; phone: string } | null;
  };
  hourHeight: number;
  onResize: (activityId: string, newDuration: number) => void;
  onClick?: (activity: any) => void;
}

const MIN_DURATION = 15;

export function DraggableActivity({ activity, hourHeight, onResize, onClick }: DraggableActivityProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [tempHeight, setTempHeight] = useState<number | null>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `activity-${activity.id}`,
    data: {
      type: 'existing-activity',
      activityId: activity.id,
      activity,
    },
    disabled: isResizing,
  });

  const duration = activity.duration_minutes || 30;
  const baseHeight = (duration / 60) * hourHeight;
  const displayHeight = tempHeight ?? baseHeight;

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'ligar': return 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300';
      case 'email': return 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300';
      case 'reuniao': return 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300';
      case 'tarefa': return 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300';
      case 'mensagem': return 'bg-pink-500/20 border-pink-500 text-pink-700 dark:text-pink-300';
      case 'visita': return 'bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300';
      default: return 'bg-muted border-border';
    }
  };

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = displayHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startYRef.current;
      const newHeight = Math.max(
        (MIN_DURATION / 60) * hourHeight,
        startHeightRef.current + deltaY
      );
      setTempHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (tempHeight !== null) {
        const newDuration = Math.round((tempHeight / hourHeight) * 60 / 15) * 15;
        const clampedDuration = Math.max(MIN_DURATION, newDuration);
        onResize(activity.id, clampedDuration);
        setTempHeight(null);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [hourHeight, tempHeight, onResize, activity.id, displayHeight]);

  const handleResizeTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = displayHeight;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const deltaY = moveEvent.touches[0].clientY - startYRef.current;
      const newHeight = Math.max(
        (MIN_DURATION / 60) * hourHeight,
        startHeightRef.current + deltaY
      );
      setTempHeight(newHeight);
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);

      if (tempHeight !== null) {
        const newDuration = Math.round((tempHeight / hourHeight) * 60 / 15) * 15;
        const clampedDuration = Math.max(MIN_DURATION, newDuration);
        onResize(activity.id, clampedDuration);
        setTempHeight(null);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [hourHeight, tempHeight, onResize, activity.id, displayHeight]);

  const scheduledTime = new Date(activity.scheduled_at);
  const endTime = new Date(scheduledTime.getTime() + (tempHeight !== null 
    ? Math.round((tempHeight / hourHeight) * 60 / 15) * 15 * 60000 
    : duration * 60000));

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        height: displayHeight,
        minHeight: (MIN_DURATION / 60) * hourHeight,
      }
    : {
        height: displayHeight,
        minHeight: (MIN_DURATION / 60) * hourHeight,
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        if (!isResizing && !isDragging) {
          e.stopPropagation();
          onClick?.(activity);
        }
      }}
      className={cn(
        'relative text-xs px-2 py-1 rounded border cursor-pointer transition-all overflow-hidden',
        'hover:shadow-md',
        getActivityColor(activity.activity_type),
        isResizing && 'ring-2 ring-primary shadow-lg z-10',
        isDragging && 'opacity-50 z-50 shadow-xl'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 h-full w-5 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-3 w-3 opacity-40" />
      </div>
      
      <div className="ml-4">
        <div className="font-medium truncate">{activity.title}</div>
        <div className="text-[10px] opacity-70">
          {format(scheduledTime, 'HH:mm', { locale: ptBR })} - {format(endTime, 'HH:mm', { locale: ptBR })}
        </div>
        {activity.leads?.name && (
          <div className="text-[10px] opacity-70 truncate">{activity.leads.name}</div>
        )}
      </div>
      
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        onTouchStart={handleResizeTouchStart}
        className={cn(
          'absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center',
          'cursor-ns-resize bg-gradient-to-t from-black/10 to-transparent',
          'hover:from-black/20 transition-colors',
          'touch-none'
        )}
      >
        <GripHorizontal className="h-3 w-3 opacity-50" />
      </div>
    </div>
  );
}
