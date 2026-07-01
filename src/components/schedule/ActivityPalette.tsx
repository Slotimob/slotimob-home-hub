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

// Paleta de arrastar: visita foi removida (agora só via botão "Agendar Visita").
export const ACTIVITY_TYPES: ActivityType[] = [
  { id: 'ligar', label: 'Ligar', icon: Phone, color: 'bg-blue-500' },
  { id: 'email', label: 'Email', icon: Mail, color: 'bg-purple-500' },
  { id: 'reuniao', label: 'Reunião', icon: Users, color: 'bg-green-500' },
  { id: 'tarefa', label: 'Tarefa', icon: CheckSquare, color: 'bg-yellow-500' },
  { id: 'mensagem', label: 'Mensagem', icon: MessageCircle, color: 'bg-pink-500' },
];

// Lista completa (inclui 'visita') para renderizar registros legados.
export const ACTIVITY_TYPES_ALL: ActivityType[] = [
  ...ACTIVITY_TYPES,
  { id: 'visita', label: 'Visita', icon: MapPin, color: 'bg-orange-500' },
];

interface DraggableActivityProps {
  activity: ActivityType;
  compact?: boolean;
}

function DraggableActivity({ activity, compact }: DraggableActivityProps) {
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
      title={activity.label}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg cursor-grab active:cursor-grabbing transition-all',
        'border border-border bg-card hover:bg-muted',
        compact ? 'p-1.5' : 'p-3',
        isDragging && 'opacity-50 scale-95 shadow-lg z-50'
      )}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center text-white',
          compact ? 'w-7 h-7' : 'w-10 h-10',
          activity.color
        )}
      >
        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
      </div>
      {!compact && <span className="text-xs font-medium mt-2">{activity.label}</span>}
      {compact && <span className="text-[10px] font-medium mt-1 leading-none">{activity.label}</span>}
    </div>
  );
}

interface ActivityPaletteProps {
  compact?: boolean;
}

export function ActivityPalette({ compact }: ActivityPaletteProps = {}) {
  return (
    <div className={cn('bg-card rounded-lg border', compact ? 'p-3' : 'p-4')}>
      <h3 className={cn('font-semibold mb-2', compact ? 'text-xs' : 'text-sm mb-3')}>Arraste para agendar</h3>
      <div className={cn('grid gap-2', compact ? 'grid-cols-5' : 'grid-cols-3')}>
        {ACTIVITY_TYPES.map((activity) => (
          <DraggableActivity key={activity.id} activity={activity} compact={compact} />
        ))}
      </div>
    </div>
  );
}

