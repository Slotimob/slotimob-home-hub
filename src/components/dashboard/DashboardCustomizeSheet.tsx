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
import { DashboardWidgetPreferences, ShortcutConfig, PipelineStageConfig } from '@/hooks/useDashboardPreferences';
import { PipelineStageSelector } from './PipelineStageSelector';

interface DashboardCustomizeSheetProps {
  widgets: DashboardWidgetPreferences;
  shortcuts: ShortcutConfig[];
  pipelineStages: PipelineStageConfig[];
  onToggleWidget: (widget: keyof DashboardWidgetPreferences) => void;
  onToggleShortcut: (shortcutId: string) => void;
  onTogglePipelineStage: (stageId: string) => void;
  onReset: () => void;
  enabledStagesCount: number;
  maxStages: number;
}

const WIDGET_LABELS: Record<keyof DashboardWidgetPreferences, { label: string; description: string }> = {
  shortcuts: { label: 'Acessos Rápidos', description: 'Atalhos para ações frequentes' },
  assets: { label: 'Contagem de Ativos', description: 'Visão consolidada de ativos' },
  financial: { label: 'Financeiro', description: 'Receitas, despesas e fluxo de caixa' },
  pipeline: { label: 'Pipeline (CRM)', description: 'Métricas de funil de vendas' },
  appointments: { label: 'Compromissos', description: 'Próximos compromissos da agenda' },
  rent_receivables: { label: 'Aluguéis a receber', description: 'Cobranças de aluguel no período' },
  open_rentals: { label: 'Imóveis com aluguel em aberto', description: 'Imóveis com cobranças pendentes' },
  delinquency: { label: 'Inadimplência', description: 'Aging de cobranças em atraso' },
};

export function DashboardCustomizeSheet({
  widgets,
  shortcuts,
  pipelineStages,
  onToggleWidget,
  onToggleShortcut,
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
            {(Object.keys(WIDGET_LABELS) as Array<keyof DashboardWidgetPreferences>).map((key) => (
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

          {/* Shortcut Toggles */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Atalhos Rápidos</h4>
            <p className="text-xs text-muted-foreground">
              Escolha quais atalhos exibir no bloco de Acessos Rápidos.
            </p>
            {shortcuts.map((shortcut) => (
              <div key={shortcut.id} className="flex items-center justify-between">
                <Label htmlFor={`shortcut-${shortcut.id}`} className="text-sm">
                  {shortcut.label}
                </Label>
                <Switch
                  id={`shortcut-${shortcut.id}`}
                  checked={shortcut.enabled}
                  onCheckedChange={() => onToggleShortcut(shortcut.id)}
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
