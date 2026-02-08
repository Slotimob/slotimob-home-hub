import { useState } from 'react';
import { Check, ChevronDown, Kanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PipelineStageConfig } from '@/hooks/useDashboardPreferences';

interface PipelineStageSelectorProps {
  stages: PipelineStageConfig[];
  onToggleStage: (stageId: string) => void;
  enabledCount: number;
  maxStages: number;
}

export function PipelineStageSelector({
  stages,
  onToggleStage,
  enabledCount,
  maxStages,
}: PipelineStageSelectorProps) {
  const [open, setOpen] = useState(false);
  const isAtMax = enabledCount >= maxStages;

  if (stages.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
        <Kanban className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p>Nenhum estágio configurado no Pipeline.</p>
        <p className="mt-1 text-muted-foreground/70">
          Crie estágios em Pipeline {'>'} Configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 py-2"
          >
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {enabledCount === 0 ? (
                <span className="text-muted-foreground">Selecionar estágios...</span>
              ) : (
                stages
                  .filter(s => s.enabled)
                  .slice(0, 3)
                  .map(stage => (
                    <Badge
                      key={stage.id}
                      variant="secondary"
                      className="gap-1 text-xs"
                      style={{ 
                        backgroundColor: `${stage.color}20`,
                        borderColor: `${stage.color}40`,
                        color: stage.color,
                      }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="truncate max-w-[80px]">{stage.name}</span>
                    </Badge>
                  ))
              )}
              {enabledCount > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{enabledCount - 3} mais
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              <Badge 
                variant={isAtMax ? 'destructive' : 'secondary'} 
                className="text-xs"
              >
                {enabledCount}/{maxStages}
              </Badge>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[300px] p-0 bg-popover border shadow-lg z-50" 
          align="start"
          sideOffset={4}
        >
          <div className="p-3 border-b bg-muted/30">
            <p className="text-sm font-medium">Selecionar Etapas</p>
            <p className="text-xs text-muted-foreground">
              Máximo de {maxStages} etapas para exibir como Big Numbers
            </p>
          </div>
          <ScrollArea className="h-[250px]">
            <div className="p-2 pr-4">
            {stages.map((stage) => {
              const isDisabled = !stage.enabled && isAtMax;
              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                    isDisabled 
                      ? "opacity-50 cursor-not-allowed" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => {
                    if (!isDisabled) {
                      onToggleStage(stage.id);
                    }
                  }}
                >
                  <Checkbox
                    id={`stage-select-${stage.id}`}
                    checked={stage.enabled}
                    disabled={isDisabled}
                    onCheckedChange={() => {
                      if (!isDisabled) {
                        onToggleStage(stage.id);
                      }
                    }}
                    className="pointer-events-none"
                  />
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: stage.color }}
                  />
                  <span 
                    className="text-sm truncate flex-1"
                    title={stage.name}
                  >
                    {stage.name}
                  </span>
                  {stage.enabled && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
              );
            })}
            </div>
          </ScrollArea>
          {isAtMax && (
            <div className="p-2 border-t bg-destructive/5 text-xs text-destructive text-center">
              Limite atingido. Desmarque um para selecionar outro.
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
