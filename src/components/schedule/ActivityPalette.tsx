import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Phone, Mail, Users, CheckSquare, MessageCircle, MapPin, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityType {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const ACTIVITY_TYPES: ActivityType[] = [
  { id: 'ligar', label: 'Ligar', icon: Phone, color: 'bg-blue-500' },
  { id: 'email', label: 'Email', icon: Mail, color: 'bg-purple-500' },
  { id: 'reuniao', label: 'Reunião', icon: Users, color: 'bg-green-500' },
  { id: 'tarefa', label: 'Tarefa', icon: CheckSquare, color: 'bg-yellow-500' },
  { id: 'mensagem', label: 'Mensagem', icon: MessageCircle, color: 'bg-pink-500' },
  { id: 'visita', label: 'Visita', icon: MapPin, color: 'bg-orange-500' },
];

interface DraggableActivityProps {
  activity: ActivityType;
}

function DraggableActivity({ activity }: DraggableActivityProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${activity.id}`,
    data: {
      type: 'palette',
      activityType: activity.id,
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const Icon = activity.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex flex-col items-center justify-center p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all',
        'border border-border bg-card hover:bg-muted',
        isDragging && 'opacity-50 scale-95 shadow-lg z-50'
      )}
    >
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white', activity.color)}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-medium mt-2">{activity.label}</span>
    </div>
  );
}

export function ActivityPalette() {
  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="font-semibold text-sm mb-3">Arraste para agendar</h3>
      <div className="grid grid-cols-3 gap-2">
        {ACTIVITY_TYPES.map((activity) => (
          <DraggableActivity key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
