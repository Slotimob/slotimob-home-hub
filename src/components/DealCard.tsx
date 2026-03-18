import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Phone, 
  Mail, 
  DollarSign, 
  GripVertical, 
  AlertTriangle, 
  CheckSquare, 
  Clock, 
  MapPin, 
  Flame, 
  Thermometer, 
  Snowflake, 
  Home,
  Hourglass,
  MessageCircle,
  AlertCircle
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

// Map origin keys to display labels and icons
const originLabels: Record<string, { label: string; icon?: string }> = {
  'website': { label: 'Site' },
  'facebook': { label: 'Facebook' },
  'instagram': { label: 'Instagram' },
  'google_ads': { label: 'Google Ads' },
  'meta_ads': { label: 'Meta Ads' },
  'portal': { label: 'Portal' },
  'zap': { label: 'ZAP' },
  'olx': { label: 'OLX' },
  'vivareal': { label: 'VivaReal' },
  'imovelweb': { label: 'ImovelWeb' },
  'referral': { label: 'Indicação' },
  'indicacao': { label: 'Indicação' },
  'phone': { label: 'Telefone' },
  'whatsapp': { label: 'WhatsApp' },
  'walk_in': { label: 'Presencial' },
  'event': { label: 'Evento' },
  'other': { label: 'Outro' },
};

const getOriginLabel = (origin: string | null | undefined): string | null => {
  if (!origin) return null;
  return originLabels[origin.toLowerCase()]?.label || origin;
};

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
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleCheckboxChange = (checked: boolean) => {
    onSelectionChange?.(checked);
  };

  // Handle WhatsApp click
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deal.lead.phone) {
      const phone = deal.lead.phone.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
  };

  // Convert hex color to glow class or use inline style
  const getGlowStyle = () => {
    if (!stageColor) return {};
    const hex = stageColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { '--card-glow-rgb': `${r}, ${g}, ${b}` } as React.CSSProperties;
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
      const daysInStage = differenceInDays(new Date(), new Date(timeInStage));
      return daysInStage >= 3;
    } catch {
      return false;
    }
  };

  const timeLabel = getTimeInStageLabel();
  const originLabel = getOriginLabel(leadOrigin);
  const isRotting = isLeadRotting();
  
  // Check if deal has no pending tasks (needs attention)
  const hasNoTasks = pendingTasksCount === 0 && overdueTasksCount === 0;

  // Check if unit is no longer available
  const isUnitUnavailable = unitStatus && (unitStatus === 'sold' || unitStatus === 'rented');

  // Get temperature config
  const temperature = (deal as any).temperature as 'hot' | 'warm' | 'cold' | undefined;
  const tempConfig = temperature ? temperatureConfig[temperature] : null;
  const TempIcon = tempConfig?.icon;

  // Check if unit is standalone
  const isStandalone = deal.unit && !(deal.property?.name);

  return (
    <Card
      data-deal-card
      ref={setNodeRef}
      style={{ ...style }}
      className={cn(
        "transition-all shadow-sm hover:shadow-md bg-card border",
        isDragging && 'opacity-50 rotate-2',
        overdueTasksCount > 0 && 'border-destructive/50',
        hasNoTasks && deal.stage !== 'won' && deal.stage !== 'lost' && 'border-amber-500/50',
        isRotting && 'border-amber-500 border-2',
        isUnitUnavailable && 'border-red-500/50 bg-red-500/5',
        isSelected && 'ring-2 ring-primary bg-primary/5',
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Unit Unavailable Warning */}
        {isUnitUnavailable && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs font-medium">Atenção: Imóvel não disponível</span>
          </div>
        )}

        {/* Drag handle and clickable area */}
        <div className="flex items-start gap-2">
          {/* Selection checkbox or Drag handle */}
          {selectionMode ? (
            <div className="flex-shrink-0 mt-0.5 p-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={handleCheckboxChange}
              />
            </div>
          ) : (
            <div
              data-dnd-handle
              {...listeners}
              {...attributes}
              className="cursor-move flex-shrink-0 mt-0.5 p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          
          {/* Clickable content */}
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={selectionMode ? () => onSelectionChange?.(!isSelected) : onClick}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base text-foreground truncate">{deal.lead?.name || 'Contato não atribuído'}</h4>
                {/* Property/Unit info */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {isStandalone ? (
                    <Home className="h-3 w-3" />
                  ) : (
                    <Building2 className="h-3 w-3" />
                  )}
                  <span className="truncate">
                    {deal.unit?.unit_number || deal.property?.name || 'Sem imóvel'}
                  </span>
                </div>
              </div>
              {/* Badges container - stacked vertically */}
              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                {/* Lead Rotting Indicator - Priority badge */}
                {isRotting && (
                  <Badge className="text-xs gap-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 whitespace-nowrap">
                    <Hourglass className="h-3 w-3" />
                    Parado
                  </Badge>
                )}
                {/* Temperature Badge - Only show if not rotting */}
                {tempConfig && TempIcon && !isRotting && (
                  <Badge className={`text-xs gap-1 whitespace-nowrap ${tempConfig.className}`}>
                    <TempIcon className="h-3 w-3" />
                    {tempConfig.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Value - Prominent display with larger font */}
        {deal.estimated_value && (
          <div 
            className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer"
            onClick={selectionMode ? () => onSelectionChange?.(!isSelected) : onClick}
          >
            <DollarSign className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-lg font-bold text-foreground">
              R$ {deal.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        )}

        {/* Time in stage - Shown separately below */}
        {timeLabel && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs gap-1 font-normal ${isRotting ? 'border-amber-500 text-amber-600' : ''}`}>
              {isRotting ? <Hourglass className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {timeLabel}
            </Badge>
            {originLabel && (
              <Badge variant="secondary" className="text-xs gap-1 font-normal">
                <MapPin className="h-3 w-3" />
                {originLabel}
              </Badge>
            )}
          </div>
        )}

        {/* Origin only (if no time label) */}
        {!timeLabel && originLabel && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs gap-1 font-normal">
              <MapPin className="h-3 w-3" />
              {originLabel}
            </Badge>
          </div>
        )}

        {/* Rest of content - clickable */}
        <div className="cursor-pointer space-y-2" onClick={selectionMode ? () => onSelectionChange?.(!isSelected) : onClick}>
          {/* Contact info with WhatsApp button */}
          <div className="space-y-1">
            {deal.lead.phone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span className="truncate">{deal.lead.phone}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                  onClick={handleWhatsAppClick}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
            {deal.lead.email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{deal.lead.email}</span>
              </div>
            )}
          </div>

          {/* Task indicators */}
          {(pendingTasksCount > 0 || overdueTasksCount > 0) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {overdueTasksCount > 0 && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overdueTasksCount} atrasada{overdueTasksCount > 1 ? 's' : ''}
                </Badge>
              )}
              {pendingTasksCount > 0 && overdueTasksCount === 0 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {pendingTasksCount} tarefa{pendingTasksCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}

          {/* No task alert - Amber warning */}
          {hasNoTasks && deal.stage !== 'won' && deal.stage !== 'lost' && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Badge className="text-xs gap-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <AlertTriangle className="h-3 w-3" />
                Sem próxima ação
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
