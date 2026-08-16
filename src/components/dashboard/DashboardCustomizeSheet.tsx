import { Settings2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DashboardWidgetPreferences, PipelineStageConfig } from '@/hooks/useDashboardPreferences';
import { PipelineStageSelector } from './PipelineStageSelector';

interface DashboardCustomizeSheetProps {
  widgets: DashboardWidgetPreferences;
  pipelineStages: PipelineStageConfig[];
  onToggleWidget: (widget: keyof DashboardWidgetPreferences) => void;
  onTogglePipelineStage: (stageId: string) => void;
  onReset: () => void;
  enabledStagesCount: number;
  maxStages: number;
}

// Ordem espelha a ordem de exibição dos blocos no Dashboard
const WIDGET_LABELS: Record<keyof DashboardWidgetPreferences, { label: string; description: string }> = {
  assets: { label: '1. Contagem de Ativos', description: 'Unidades e imóveis avulsos por status' },
  financial: { label: '4. Financeiro', description: 'Receitas, despesas e fluxo de caixa do período' },
  appointments: { label: '3. Compromissos', description: 'Próximos compromissos da agenda' },
  delinquency: { label: '3. Inadimplência', description: 'Aging de cobranças em atraso' },
  afazeres: { label: '5. Afazeres (resumo)', description: 'Resumo de pendências de gestão' },
  pipeline: { label: '5. Pipeline (CRM)', description: 'Métricas de funil de vendas' },
};

// Ordem de renderização dos toggles na lista
const WIDGET_ORDER: Array<keyof DashboardWidgetPreferences> = [
  'assets',
  'appointments',
  'delinquency',
  'financial',
  'afazeres',
  'pipeline',
];
export function DashboardCustomizeSheet({
  widgets,
  pipelineStages,
  onToggleWidget,
  onTogglePipelineStage,
  onReset,
  enabledStagesCount,
  maxStages,
}: DashboardCustomizeSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm h-9">
          <Settings2 className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Personalizar Dashboard</span>
          <span className="sm:hidden">Personalizar</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Personalizar Dashboard</SheetTitle>
          <SheetDescription>
            Escolha quais blocos deseja visualizar no seu dashboard.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Widget Toggles */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Blocos Visíveis</h4>
            <p className="text-xs text-muted-foreground">
              Os números indicam a posição do bloco no dashboard.
            </p>
            {WIDGET_ORDER.map((key) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`widget-${key}`} className="text-sm font-medium">
                    {WIDGET_LABELS[key].label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {WIDGET_LABELS[key].description}
                  </p>
                </div>
                <Switch
                  id={`widget-${key}`}
                  checked={widgets[key]}
                  onCheckedChange={() => onToggleWidget(key)}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Pipeline Stages Selector */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Métricas do Pipeline</h4>
            <p className="text-xs text-muted-foreground">
              Selecione até {maxStages} etapas para exibir como Big Numbers.
            </p>
            
            <PipelineStageSelector
              stages={pipelineStages}
              onToggleStage={onTogglePipelineStage}
              enabledCount={enabledStagesCount}
              maxStages={maxStages}
            />
          </div>

          <Separator />

          {/* Reset Button */}
          <Button variant="outline" onClick={onReset} className="w-full gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
