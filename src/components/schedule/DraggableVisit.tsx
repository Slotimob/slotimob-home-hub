import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GripVertical, MapPin } from 'lucide-react';

export interface VisitLike {
  id: string;
  scheduled_at: string;
  duration_minutes?: number | null;
  status?: string | null;
  lead_confirmed?: boolean | null;
  leads?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  units?: { unit_number?: string | null; price?: number | null; area?: number | null } | null;
  properties?: { name?: string | null; address?: string | null } | null;
}

interface DraggableVisitProps {
  visit: VisitLike;
  hourHeight: number;
  onClick?: (visit: VisitLike) => void;
}

const MIN_DURATION = 15;

export function DraggableVisit({ visit, hourHeight, onClick }: DraggableVisitProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `visit-${visit.id}`,
    data: {
      type: 'existing-visit',
      visitId: visit.id,
      visit,
    },
  });

  const duration = visit.duration_minutes || 60;
  const height = (duration / 60) * hourHeight;

  const scheduledTime = new Date(visit.scheduled_at);
  const endTime = new Date(scheduledTime.getTime() + duration * 60000);

  const propertyLabel = visit.properties?.name
    ? `${visit.properties.name}${visit.units?.unit_number ? ` — Un. ${visit.units.unit_number}` : ''}`
    : visit.units?.unit_number
      ? `Un. ${visit.units.unit_number}`
      : 'Imóvel';

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        height,
        minHeight: (MIN_DURATION / 60) * hourHeight,
      }
    : {
        height,
        minHeight: (MIN_DURATION / 60) * hourHeight,
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick?.(visit);
        }
      }}
      className={cn(
        'relative text-xs px-2 py-1 rounded border cursor-pointer transition-all overflow-hidden',
        'hover:shadow-md bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300',
        isDragging && 'opacity-50 z-50 shadow-xl'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 h-full w-5 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-3 w-3 opacity-40" />
      </div>

      <div className="ml-4">
        <div className="flex items-center gap-1 font-medium truncate">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{visit.leads?.name || 'Visita'}</span>
        </div>
        <div className="text-[10px] opacity-70">
          {format(scheduledTime, 'HH:mm', { locale: ptBR })} - {format(endTime, 'HH:mm', { locale: ptBR })}
        </div>
        <div className="text-[10px] opacity-70 truncate">{propertyLabel}</div>
      </div>
    </div>
  );
}
