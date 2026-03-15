import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, GripVertical, Building2, DollarSign, TrendingUp, Share2, Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { UNIT_STATUS_STYLES, ALL_UNIT_STATUSES } from '@/utils/uiConstants';
import { generatePropertyPDF, buildPDFDataFromUnit } from '@/utils/propertyPdfGenerator';
import { usePermissions } from '@/hooks/usePermissions';

type UnitStatus = Database['public']['Enums']['unit_status'];

interface Unit {
  id: string;
  property_id: string | null;
  unit_number: string;
  status: UnitStatus;
  price: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  iptu: number | null;
  condo_fee: number | null;
  cover_image_url: string | null;
  created_at: string;
  // New fields for asset intelligence
  intent_type?: string | null;
  is_managed?: boolean | null;
  is_occupied?: boolean | null;
  market_value?: number | null;
  rent_price?: number | null;
  is_standalone?: boolean | null;
  property?: {
    id: string;
    name: string;
    commission_rate?: number | null;
  };
}

interface Property {
  id: string;
  name: string;
  commission_rate?: number | null;
}

interface UnitsKanbanViewProps {
  units: Unit[];
  isAllUnitsView: boolean;
  properties?: Property[];
  onUnitClick: (unit: Unit) => void;
  onShareClick?: (unit: Unit) => void;
  onSuccess: () => void;
}
const ALL_STATUSES: UnitStatus[] = ['available', 'reserved', 'rented', 'sold'];

// Sortable Unit Card Component
const SortableUnitCard = ({
  unit,
  isAllUnitsView,
  onClick,
  onShare,
  onGeneratePDF,
  onCopyLink,
  stageColor
}: {
  unit: Unit;
  isAllUnitsView: boolean;
  onClick: () => void;
  onShare?: () => void;
  onGeneratePDF: () => void;
  onCopyLink: () => void;
  stageColor: string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: unit.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  // Convert hex color to RGB for glow effect
  const getGlowStyle = () => {
    const hex = stageColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return {
      '--card-glow-rgb': `${r}, ${g}, ${b}`
    } as React.CSSProperties;
  };
  return <div ref={setNodeRef} style={style} className={`${isDragging ? 'opacity-50' : ''}`}>
      <Card className={cn("cursor-pointer overflow-hidden transition-all group", "shadow-[0_0_10px_-2px_rgba(var(--card-glow-rgb),0.25)] hover:shadow-[0_0_15px_-2px_rgba(var(--card-glow-rgb),0.4)]")} style={getGlowStyle()} onClick={onClick}>
        <div className="flex items-start gap-2 p-3">
          <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" onClick={e => e.stopPropagation()}>
            <GripVertical className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Image Thumbnail with Share Button Overlay */}
            <div className="relative h-20 mb-2 rounded-md overflow-hidden bg-muted">
              {unit.cover_image_url ? <img src={unit.cover_image_url} alt={`Unidade ${unit.unit_number}`} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <Home className="h-6 w-6 text-muted-foreground/50" />
                </div>}
              
              {/* Share button overlay - appears on hover */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-6 w-6 shadow-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink(); }}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onGeneratePDF(); }}>
                      <Download className="mr-2 h-4 w-4" />
                      Gerar PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Unit Info */}
            <div className="space-y-1">
              <p className="font-medium text-sm truncate">Unidade {unit.unit_number}</p>
              {isAllUnitsView && unit.property && <p className="text-xs text-muted-foreground truncate">
                  {unit.property.name}
                </p>}
              {unit.price && <p className="text-xs font-semibold text-primary">
                  R$ {unit.price.toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}
                </p>}
              <div className="flex gap-2 text-xs text-muted-foreground">
                {unit.bedrooms !== null && <span>{unit.bedrooms}q</span>}
                {unit.area && <span>{unit.area}m²</span>}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>;
};

// Kanban Column Component
const KanbanColumn = ({
  status,
  units,
  isAllUnitsView,
  onUnitClick,
  onShareClick,
  onGeneratePDF,
  onCopyLink,
  getCommissionRate
}: {
  status: UnitStatus;
  units: Unit[];
  isAllUnitsView: boolean;
  onUnitClick: (unit: Unit) => void;
  onShareClick?: (unit: Unit) => void;
  onGeneratePDF: (unit: Unit) => void;
  onCopyLink: (unit: Unit) => void;
  getCommissionRate: (propertyId: string | null) => number;
}) => {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: status
  });
  const unitIds = useMemo(() => units.map(u => u.id), [units]);
  const color = UNIT_STATUS_STYLES[status];

  // Calculate totals with per-property commission rates
  const {
    totalValue,
    estimatedCommission
  } = useMemo(() => {
    let total = 0;
    let commission = 0;
    units.forEach(unit => {
      const price = unit.price || 0;
      total += price;
      const rate = getCommissionRate(unit.property_id);
      commission += price * rate;
    });
    return {
      totalValue: total,
      estimatedCommission: commission
    };
  }, [units, getCommissionRate]);
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
      '--stage-glow-rgb': color.rgb
    } as React.CSSProperties;
  };
  return <div ref={setNodeRef} className="flex-shrink-0 w-80 snap-start">
      <Card className={cn("h-full transition-shadow", isOver && 'ring-2 ring-primary', "shadow-[0_0_15px_-3px_rgba(var(--stage-glow-rgb),0.3)] hover:shadow-[0_0_20px_-2px_rgba(var(--stage-glow-rgb),0.4)]")} style={getGlowStyle()}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                backgroundColor: color.hex
              }} />
                <span className="truncate">{UNIT_STATUS_STYLES[status].label}</span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {units.length}
                </span>
              </div>
            </div>
            
            {/* Value Counters */}
            <div className="space-y-1 mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                <DollarSign className="h-3 w-3" />
                <span>{formatCurrency(totalValue)}</span>
                <span className="opacity-70">valor total</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                <TrendingUp className="h-3 w-3" />
                <span>{formatCurrency(estimatedCommission)}</span>
                <span className="opacity-70">comissão est.</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
          <SortableContext items={unitIds} strategy={verticalListSortingStrategy}>
            {units.map(unit => <SortableUnitCard 
              key={unit.id} 
              unit={unit} 
              isAllUnitsView={isAllUnitsView} 
              onClick={() => onUnitClick(unit)} 
              onShare={onShareClick ? () => onShareClick(unit) : undefined}
              onGeneratePDF={() => onGeneratePDF(unit)}
              onCopyLink={() => onCopyLink(unit)}
              stageColor={color.hex} 
            />)}
          </SortableContext>
          {units.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma unidade
            </p>}
        </CardContent>
      </Card>
    </div>;
};

// Drag Overlay Card
const DragOverlayCard = ({
  unit,
  isAllUnitsView
}: {
  unit: Unit;
  isAllUnitsView: boolean;
}) => {
  const color = UNIT_STATUS_STYLES[unit.status];
  const getGlowStyle = () => {
    return {
      '--card-glow-rgb': color.rgb
    } as React.CSSProperties;
  };
  return <Card className={cn("cursor-grabbing overflow-hidden shadow-xl", "shadow-[0_0_20px_-2px_rgba(var(--card-glow-rgb),0.5)]")} style={getGlowStyle()}>
      <div className="flex items-start gap-2 p-3">
        <div className="mt-1 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="relative h-20 mb-2 rounded-md overflow-hidden bg-muted">
            {unit.cover_image_url ? <img src={unit.cover_image_url} alt={`Unidade ${unit.unit_number}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <Home className="h-6 w-6 text-muted-foreground/50" />
              </div>}
          </div>

          <div className="space-y-1">
            <p className="font-medium text-sm truncate">Unidade {unit.unit_number}</p>
            {isAllUnitsView && unit.property && <p className="text-xs text-muted-foreground truncate">
                {unit.property.name}
              </p>}
            {unit.price && <p className="text-xs font-semibold text-primary">
                R$ {unit.price.toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
              </p>}
          </div>
        </div>
      </div>
    </Card>;
};
export const UnitsKanbanView = ({
  units,
  isAllUnitsView,
  properties = [],
  onUnitClick,
  onShareClick,
  onSuccess
}: UnitsKanbanViewProps) => {
  const {
    toast
  } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor));

  // Handle copy link
  const handleCopyLink = (unit: Unit) => {
    const link = `${window.location.origin}/unidade/${unit.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'O link da unidade foi copiado para a área de transferência.',
    });
  };

  // Handle generate PDF
  const handleGeneratePDF = async (unit: Unit) => {
    try {
      toast({
        title: 'Gerando PDF...',
        description: 'Aguarde enquanto criamos a apresentação.',
      });
      
      // Fetch parent property data if exists
      let parentProperty = null;
      if (unit.property_id) {
        const { data } = await supabase
          .from('properties')
          .select('*')
          .eq('id', unit.property_id)
          .single();
        parentProperty = data;
      }
      
      const pdfData = buildPDFDataFromUnit(unit, parentProperty);
      generatePropertyPDF(pdfData);
      
      toast({
        title: 'PDF gerado com sucesso!',
        description: 'O arquivo foi baixado automaticamente.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter units by selected property
  const filteredUnits = useMemo(() => {
    if (selectedPropertyId === 'all') return units;
    return units.filter(unit => unit.property_id === selectedPropertyId);
  }, [units, selectedPropertyId]);

  // Build a map of property commission rates
  const propertyRates = useMemo(() => {
    const rates: Record<string, number> = {};
    properties.forEach(p => {
      rates[p.id] = (p.commission_rate ?? 5) / 100; // Convert percentage to decimal
    });
    return rates;
  }, [properties]);

  // Function to get commission rate for a property
  const getCommissionRate = (propertyId: string | null): number => {
    if (!propertyId) return 0.05;
    return propertyRates[propertyId] ?? 0.05; // Default 5%
  };

  // Group units by status
  const unitsByStatus = useMemo(() => {
    const grouped: Record<UnitStatus, Unit[]> = {
      available: [],
      reserved: [],
      rented: [],
      sold: []
    };
    filteredUnits.forEach(unit => {
      grouped[unit.status].push(unit);
    });
    return grouped;
  }, [filteredUnits]);
  const activeUnit = useMemo(() => filteredUnits.find(u => u.id === activeId) || null, [filteredUnits, activeId]);
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveId(null);
    if (!over) return;
    const activeUnit = filteredUnits.find(u => u.id === active.id);
    if (!activeUnit) return;

    // Determine target status from the drop target
    let targetStatus: UnitStatus | null = null;

    // Check if dropped over a unit
    const overUnit = filteredUnits.find(u => u.id === over.id);
    if (overUnit) {
      targetStatus = overUnit.status;
    } else {
      // Check if dropped over a column (over.id might be the status)
      if (ALL_UNIT_STATUSES.includes(over.id as UnitStatus)) {
        targetStatus = over.id as UnitStatus;
      }
    }
    if (!targetStatus || targetStatus === activeUnit.status) return;
    try {
      const {
        error
      } = await supabase.from('units').update({
        status: targetStatus
      }).eq('id', activeUnit.id);
      if (error) throw error;
      toast({
        title: 'Status atualizado!',
        description: `Unidade ${activeUnit.unit_number} movida para "${UNIT_STATUS_STYLES[targetStatus].label}".`
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  return <div className="space-y-4">
      {/* Property Filter */}
      {isAllUnitsView && properties.length > 0 && <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filtrar por empreendimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os empreendimentos</SelectItem>
              {properties.map(property => <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
          {selectedPropertyId !== 'all' && <span className="text-sm text-muted-foreground">
              {filteredUnits.length} unidades
            </span>}
        </div>}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pt-2 pb-4 pipeline-scrollbar snap-x snap-mandatory md:snap-none">
          {ALL_UNIT_STATUSES.map(status => <KanbanColumn 
            key={status} 
            status={status} 
            units={unitsByStatus[status]} 
            isAllUnitsView={isAllUnitsView} 
            onUnitClick={onUnitClick} 
            onShareClick={onShareClick}
            onGeneratePDF={handleGeneratePDF}
            onCopyLink={handleCopyLink}
            getCommissionRate={getCommissionRate} 
          />)}
        </div>

        <DragOverlay>
          {activeUnit && <DragOverlayCard unit={activeUnit} isAllUnitsView={isAllUnitsView} />}
        </DragOverlay>
      </DndContext>
    </div>;
};