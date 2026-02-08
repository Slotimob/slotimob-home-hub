import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DealCard } from '@/components/DealCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DollarSign, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Deal } from '@/pages/Pipeline';

interface TaskCounts {
  [dealId: string]: {
    pending: number;
    overdue: number;
  };
}

interface StageHistoryEntry {
  deal_id: string;
  to_stage: string;
  changed_at: string;
}

export interface StageConfig {
  id: string;
  name: string;
  color?: string;
  isCustom?: boolean;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  color?: string;
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
  taskCounts?: TaskCounts;
  selectionMode?: boolean;
  selectedDeals?: Set<string>;
  onSelectionChange?: (dealId: string, selected: boolean) => void;
  onSelectAll?: (dealIds: string[], selected: boolean) => void;
  onToggleSelectionMode?: () => void;
  isCustomStage?: boolean;
  onEditStage?: () => void;
  onDeleteStage?: () => void;
  stageHistory?: StageHistoryEntry[];
}

export const KanbanColumn = ({
  id,
  title,
  color = '#6366f1',
  deals,
  onDealClick,
  taskCounts = {},
  selectionMode = false,
  selectedDeals = new Set(),
  onSelectionChange,
  onSelectAll,
  onToggleSelectionMode,
  isCustomStage = false,
  onEditStage,
  onDeleteStage,
  stageHistory = [],
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Calculate total value for this column
  const totalValue = deals.reduce((sum, deal) => sum + (deal.estimated_value || 0), 0);

  // Check if all deals in this column are selected
  const allSelected = deals.length > 0 && deals.every((deal) => selectedDeals.has(deal.id));
  const someSelected = deals.some((deal) => selectedDeals.has(deal.id));

  const handleSelectAll = (checked: boolean) => {
    if (onSelectAll) {
      const dealIds = deals.map((deal) => deal.id);
      onSelectAll(dealIds, checked);
    }
  };

  // Get time in stage for a deal
  const getTimeInStage = (dealId: string, currentStage: string): string | null => {
    // Find the most recent entry where deal moved TO this stage
    const entry = stageHistory.find(
      (h) => h.deal_id === dealId && h.to_stage === currentStage
    );
    return entry?.changed_at || null;
  };

  // Convert hex color to glow style
  const getGlowStyle = () => {
    if (!color) return {};
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { '--stage-glow-rgb': `${r}, ${g}, ${b}` } as React.CSSProperties;
  };

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-72 sm:w-80 snap-start">
      <Card 
        className={cn(
          "h-full transition-shadow",
          isOver && 'ring-2 ring-primary',
          "shadow-[0_0_15px_-3px_rgba(var(--stage-glow-rgb),0.3)] hover:shadow-[0_0_20px_-2px_rgba(var(--stage-glow-rgb),0.4)]"
        )}
        style={getGlowStyle()}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">{title}</span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {deals.length}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Selection checkbox for column */}
                {deals.length > 0 && (
                  <Checkbox
                    checked={selectionMode && allSelected}
                    onCheckedChange={(checked) => {
                      if (!selectionMode && onToggleSelectionMode) {
                        onToggleSelectionMode();
                      }
                      if (checked || selectionMode) {
                        handleSelectAll(!!checked);
                      }
                    }}
                    className={cn(
                      "transition-opacity",
                      !selectionMode && "opacity-40 hover:opacity-100",
                      someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''
                    )}
                    title={selectionMode ? "Selecionar todos" : "Clique para ativar seleção"}
                  />
                )}
                
                {/* Stage options menu */}
                {isCustomStage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditStage?.()}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar estágio
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDeleteStage?.()} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir estágio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {totalValue > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground font-normal">
                <DollarSign className="h-3 w-3" />
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent data-card-scroll className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto overscroll-contain">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick?.(deal)}
              pendingTasksCount={taskCounts[deal.id]?.pending || 0}
              overdueTasksCount={taskCounts[deal.id]?.overdue || 0}
              selectionMode={selectionMode}
              isSelected={selectedDeals.has(deal.id)}
              onSelectionChange={(selected) => onSelectionChange?.(deal.id, selected)}
              stageColor={color}
              timeInStage={getTimeInStage(deal.id, id)}
              leadOrigin={deal.lead.origin}
              unitStatus={deal.unit?.status}
            />
          ))}
          {deals.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum deal nesta etapa
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};