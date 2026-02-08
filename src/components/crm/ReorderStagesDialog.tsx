import { useState, useEffect, forwardRef } from 'react';
import { GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface Stage {
  id: string;
  name: string;
  color: string;
  isCustom: boolean;
  isWonStage?: boolean;
  isLostStage?: boolean;
}

interface ReorderStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  onSave: (orderedStageIds: string[]) => Promise<void>;
}

interface SortableStageItemProps {
  stage: Stage;
}

const SortableStageItem = forwardRef<HTMLDivElement, SortableStageItemProps>(({ stage }, forwardedRef) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Merge refs
  const mergedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  return (
    <div
      ref={mergedRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-card border rounded-lg",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color }}
      />
      
      <span className="font-medium flex-1">{stage.name}</span>
      
      {!stage.isCustom && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          Padrão
        </span>
      )}
      
      {stage.isWonStage && (
        <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
          Ganho
        </span>
      )}
      
      {stage.isLostStage && (
        <span className="text-xs text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
          Perdido
        </span>
      )}
    </div>
  );
});

SortableStageItem.displayName = 'SortableStageItem';

export const ReorderStagesDialog = ({
  open,
  onOpenChange,
  stages,
  onSave,
}: ReorderStagesDialogProps) => {
  const [orderedStages, setOrderedStages] = useState<Stage[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      setOrderedStages([...stages]);
    }
  }, [open, stages]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedStages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const orderedIds = orderedStages.map((s) => s.id);
      await onSave(orderedIds);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving stage order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setOrderedStages([...stages]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Reordenar Estágios</DialogTitle>
          <DialogDescription>
            Arraste os estágios para reorganizar a ordem de exibição no pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedStages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {orderedStages.map((stage) => (
                  <SortableStageItem key={stage.id} stage={stage} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleReset} disabled={isSaving}>
            Restaurar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Ordem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
