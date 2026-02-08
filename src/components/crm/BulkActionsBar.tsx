import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Stage {
  id: string;
  label: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  stages: Stage[];
  onMove: (targetStage: string) => void;
  onCancel: () => void;
}

export const BulkActionsBar = ({
  selectedCount,
  stages,
  onMove,
  onCancel,
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-card border rounded-lg shadow-lg p-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {selectedCount} deal{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Select onValueChange={onMove}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mover para..." />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
      </div>
    </div>
  );
};
