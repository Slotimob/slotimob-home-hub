import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, GripVertical, DollarSign, MapPin, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { UNIT_STATUS_STYLES, ALL_UNIT_STATUSES } from '@/utils/uiConstants';

type UnitStatus = Database['public']['Enums']['unit_status'];

interface RealEstateUnit {
  id: string;
  unit_number: string;
  property_type: string | null;
  condition: string | null;
  price: number | null;
  rent_price: number | null;
  area: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  furnished: string | null;
  solar_orientation: string | null;
  status: UnitStatus;
  cover_image_url: string | null;
  is_standalone: boolean;
  is_financeable: boolean | null;
  owner_id: string | null;
  property_id: string | null;
  condo_fee: number | null;
  iptu: number | null;
  description: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  created_at: string;
  tags: string[] | null;
  is_managed?: boolean;
  owner?: {
    name: string;
  } | null;
}

interface RealEstateKanbanViewProps {
  units: RealEstateUnit[];
  onUnitClick: (unit: RealEstateUnit) => void;
  onSuccess: () => void;
}

// Sortable Unit Card Component
const SortableUnitCard = ({
  unit,
  onClick,
  stageColor,
}: {
  unit: RealEstateUnit;
  onClick: () => void;
  stageColor: string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: unit.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Convert hex color to RGB for glow effect
  const getGlowStyle = () => {
    const hex = stageColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return {
      '--card-glow-rgb': `${r}, ${g}, ${b}`,
    } as React.CSSProperties;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <Card
        className={cn(
          'cursor-pointer overflow-hidden transition-all',
          'shadow-[0_0_10px_-2px_rgba(var(--card-glow-rgb),0.25)] hover:shadow-[0_0_15px_-2px_rgba(var(--card-glow-rgb),0.4)]'
        )}
        style={getGlowStyle()}
        onClick={onClick}
      >
        <div className="flex items-start gap-2 p-3">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Image Thumbnail */}
            <div className="relative h-20 mb-2 rounded-md overflow-hidden bg-muted">
              {unit.cover_image_url ? (
                <img
                  src={unit.cover_image_url}
                  alt={unit.unit_number}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <Home className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Unit Info */}
            <div className="space-y-1">
              <p className="font-medium text-sm truncate">{unit.unit_number}</p>

              {/* Price */}
              {unit.price && (
                <p className="text-xs font-semibold text-primary">
                  {formatCurrency(unit.price)}
                </p>
              )}

              {/* Location */}
              {(unit.neighborhood || unit.city) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {unit.neighborhood || unit.city}
                  </span>
                </div>
              )}

              {/* Area and Bedrooms */}
              <div className="flex gap-2 text-xs text-muted-foreground">
                {unit.area && (
                  <div className="flex items-center gap-1">
                    <Square className="h-3 w-3" />
                    <span>{unit.area}m²</span>
                  </div>
                )}
                {unit.bedrooms !== null && <span>{unit.bedrooms}q</span>}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Kanban Column Component
const KanbanColumn = ({
  status,
  units,
  onUnitClick,
}: {
  status: UnitStatus;
  units: RealEstateUnit[];
  onUnitClick: (unit: RealEstateUnit) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const unitIds = useMemo(() => units.map((u) => u.id), [units]);
  const color = UNIT_STATUS_STYLES[status];

  // Calculate totals
  const totalValue = useMemo(() => {
    return units.reduce((acc, unit) => acc + (unit.price || 0), 0);
  }, [units]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  // Glow style for the column
  const getGlowStyle = () => {
    return {
      '--stage-glow-rgb': color.rgb,
    } as React.CSSProperties;
  };

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-80 snap-start">
      <Card
        className={cn(
          'h-full transition-shadow',
          isOver && 'ring-2 ring-primary',
          'shadow-[0_0_15px_-3px_rgba(var(--stage-glow-rgb),0.3)] hover:shadow-[0_0_20px_-2px_rgba(var(--stage-glow-rgb),0.4)]'
        )}
        style={getGlowStyle()}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="truncate">{color.label}</span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {units.length}
                </span>
              </div>
            </div>

            {/* Value Counter */}
            {totalValue > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground font-normal">
                <DollarSign className="h-3 w-3" />
                <span>{formatCurrency(totalValue)}</span>
                <span className="opacity-70">valor total</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
          <SortableContext
            items={unitIds}
            strategy={verticalListSortingStrategy}
          >
            {units.map((unit) => (
              <SortableUnitCard
                key={unit.id}
                unit={unit}
                onClick={() => onUnitClick(unit)}
                stageColor={color.hex}
              />
            ))}
          </SortableContext>
          {units.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum imóvel
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Drag Overlay Card
const DragOverlayCard = ({ unit }: { unit: RealEstateUnit }) => {
  const color = UNIT_STATUS_STYLES[unit.status];

  const getGlowStyle = () => {
    return {
      '--card-glow-rgb': color.rgb,
    } as React.CSSProperties;
  };

  return (
    <Card
      className={cn(
        'cursor-grabbing overflow-hidden shadow-xl w-72',
        'shadow-[0_0_20px_-2px_rgba(var(--card-glow-rgb),0.5)]'
      )}
      style={getGlowStyle()}
    >
      <div className="flex items-start gap-2 p-3">
        <div className="mt-1 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative h-20 mb-2 rounded-md overflow-hidden bg-muted">
            {unit.cover_image_url ? (
              <img
                src={unit.cover_image_url}
                alt={unit.unit_number}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <Home className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="font-medium text-sm truncate">{unit.unit_number}</p>
            {unit.price && (
              <p className="text-xs font-semibold text-primary">
                R$ {unit.price.toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export const RealEstateKanbanView = ({
  units,
  onUnitClick,
  onSuccess,
}: RealEstateKanbanViewProps) => {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group units by status
  const unitsByStatus = useMemo(() => {
    const grouped: Record<UnitStatus, RealEstateUnit[]> = {
      available: [],
      reserved: [],
      rented: [],
      sold: [],
    };
    units.forEach((unit) => {
      grouped[unit.status].push(unit);
    });
    return grouped;
  }, [units]);

  const activeUnit = useMemo(
    () => units.find((u) => u.id === activeId) || null,
    [units, activeId]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedUnit = units.find((u) => u.id === active.id);
    if (!draggedUnit) return;

    // Determine target status from the drop target
    let targetStatus: UnitStatus | null = null;

    // Check if dropped over a unit
    const overUnit = units.find((u) => u.id === over.id);
    if (overUnit) {
      targetStatus = overUnit.status;
    } else {
      // Check if dropped over a column (over.id might be the status)
      if (ALL_UNIT_STATUSES.includes(over.id as UnitStatus)) {
        targetStatus = over.id as UnitStatus;
      }
    }

    if (!targetStatus || targetStatus === draggedUnit.status) return;

    try {
      const { error } = await supabase
        .from('units')
        .update({ status: targetStatus })
        .eq('id', draggedUnit.id);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: `"${draggedUnit.unit_number}" movido para "${UNIT_STATUS_STYLES[targetStatus].label}".`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pt-2 pb-4 pipeline-scrollbar snap-x snap-mandatory md:snap-none">
          {ALL_UNIT_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              units={unitsByStatus[status]}
              onUnitClick={onUnitClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeUnit && <DragOverlayCard unit={activeUnit} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
