import { useDraggable } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Building2, 
  Phone, 
  GripVertical, 
  AlertTriangle, 
  CheckSquare, 
  Clock, 
  Flame, 
  Thermometer, 
  Snowflake, 
  Home,
  Hourglass,
  MessageCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Deal } from '@/pages/Pipeline';
interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  onClick?: () => void;
  pendingTasksCount?: number;
  overdueTasksCount?: number;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  stageColor?: string;
  timeInStage?: string | null;
  leadOrigin?: string | null;
  unitStatus?: string | null;
}

// Temperature configuration
const temperatureConfig = {
  hot: {
    label: 'Quente',
    icon: Flame,
    className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  warm: {
    label: 'Morno',
    icon: Thermometer,
    className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  cold: {
    label: 'Frio',
    icon: Snowflake,
    className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
};

export const DealCard = ({
  deal,
  isDragging = false,
  onClick,
  pendingTasksCount = 0,
  overdueTasksCount = 0,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
  stageColor,
  timeInStage,
  leadOrigin,
  unitStatus,
}: DealCardProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: deal.id,
    disabled: selectionMode,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  // Handle WhatsApp click
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deal.lead.phone) {
      const phone = deal.lead.phone.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
  };

  // Calculate time in stage
  const getTimeInStageLabel = () => {
    if (!timeInStage) return null;
    try {
      return formatDistanceToNow(new Date(timeInStage), { addSuffix: false, locale: ptBR });
    } catch {
      return null;
    }
  };

  // Check if lead is "rotting" (3+ days in same stage)
  const isLeadRotting = (): boolean => {
    if (!timeInStage || deal.stage === 'won' || deal.stage === 'lost') return false;
    try {
      return differenceInDays(new Date(), new Date(timeInStage)) >= 3;
    } catch {
      return false;
    }
  };

  const timeLabel = getTimeInStageLabel();
  const isRotting = isLeadRotting();
  const hasNoTasks = pendingTasksCount === 0 && overdueTasksCount === 0;
  const isUnitUnavailable = unitStatus && (unitStatus === 'sold' || unitStatus === 'rented');

  // Temperature
  const temperature = (deal as any).temperature as 'hot' | 'warm' | 'cold' | undefined;
  const tempConfig = temperature ? temperatureConfig[temperature] : null;
  const TempIcon = tempConfig?.icon;

  const isStandalone = deal.unit && !deal.property?.name;

  return (
    <Card
      data-deal-card
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all shadow-sm hover:shadow-md border bg-card",
        isDragging && 'opacity-50 rotate-2',
        isRotting && 'border-amber-500/60',
        isUnitUnavailable && 'border-destructive/40 bg-destructive/5',
        overdueTasksCount > 0 && !isUnitUnavailable && 'border-destructive/40',
        isSelected && 'ring-2 ring-primary bg-primary/5',
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Unit Unavailable Warning - compact */}
        {isUnitUnavailable && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span className="font-medium">Imóvel não disponível</span>
          </div>
        )}

        {/* Header: drag handle + name + temp badge */}
        <div className="flex items-start gap-1.5">
          {selectionMode ? (
            <div className="flex-shrink-0 mt-0.5 p-0.5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectionChange?.(!!checked)}
              />
            </div>
          ) : (
            <div
              data-dnd-handle
              {...listeners}
              {...attributes}
              className="cursor-move flex-shrink-0 mt-0.5 p-0.5 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={selectionMode ? () => onSelectionChange?.(!isSelected) : onClick}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground truncate leading-tight">
                  {deal.lead?.name || 'Sem contato'}
                </h4>
                {/* Property - only if exists */}
                {(deal.unit?.unit_number || deal.property?.name) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    {isStandalone ? <Home className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                    <span className="truncate">{deal.unit?.unit_number || deal.property?.name}</span>
                  </div>
                )}
              </div>
              {/* Temperature or Rotting badge */}
              {isRotting ? (
                <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <Hourglass className="h-2.5 w-2.5" />
                  Parado
                </Badge>
              ) : tempConfig && TempIcon ? (
                <Badge variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 flex-shrink-0 ${tempConfig.className}`}>
                  <TempIcon className="h-2.5 w-2.5" />
                  {tempConfig.label}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {/* Value - compact prominent display */}
        {deal.estimated_value ? (
          <div 
            className="py-1.5 px-2.5 rounded-md bg-primary/8 cursor-pointer"
            onClick={selectionMode ? () => onSelectionChange?.(!isSelected) : onClick}
          >
            <span className="text-sm font-bold text-foreground">
              {deal.estimated_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        ) : null}

        {/* Meta row: time + phone */}
        <div 
          className="flex items-center justify-between gap-2 cursor-pointer"
          onClick={selectionMode ? () => onSelectionChange?.(!isSelected) : onClick}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {timeLabel && (
              <span className={cn(
                "text-[11px] flex items-center gap-1 text-muted-foreground",
                isRotting && "text-amber-600 dark:text-amber-400"
              )}>
                <Clock className="h-3 w-3" />
                {timeLabel}
              </span>
            )}
          </div>
          {deal.lead.phone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 flex-shrink-0"
              onClick={handleWhatsAppClick}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Task indicators - compact */}
        {(overdueTasksCount > 0 || pendingTasksCount > 0 || (hasNoTasks && deal.stage !== 'won' && deal.stage !== 'lost')) && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
            {overdueTasksCount > 0 && (
              <Badge variant="destructive" className="text-[10px] gap-0.5 px-1.5 py-0">
                <AlertTriangle className="h-2.5 w-2.5" />
                {overdueTasksCount} atrasada{overdueTasksCount > 1 ? 's' : ''}
              </Badge>
            )}
            {pendingTasksCount > 0 && overdueTasksCount === 0 && (
              <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                <CheckSquare className="h-2.5 w-2.5" />
                {pendingTasksCount}
              </Badge>
            )}
            {hasNoTasks && deal.stage !== 'won' && deal.stage !== 'lost' && (
              <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-2.5 w-2.5" />
                Sem ação
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};