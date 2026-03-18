import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StageData {
  id: string;
  label: string;
  color: string;
  dealCount?: number;
  totalValue?: number;
}

interface PipelineMinimapProps {
  stages: StageData[];
  scrollRef: React.RefObject<HTMLDivElement>;
  columnWidth: number;
}

export const PipelineMinimap = ({ stages, scrollRef, columnWidth }: PipelineMinimapProps) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: stages.length });

  const updateVisibleRange = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollLeft = el.scrollLeft;
    const viewportWidth = el.clientWidth;

    const startIndex = Math.floor(scrollLeft / columnWidth);
    const visibleCount = Math.ceil(viewportWidth / columnWidth);
    const endIndex = Math.min(startIndex + visibleCount, stages.length);

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [scrollRef, columnWidth, stages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateVisibleRange();
    el.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      el.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [scrollRef, updateVisibleRange]);

  const scrollToStage = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTo({
      left: index * columnWidth,
      behavior: 'smooth',
    });
  };

  const scrollToStart = () => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const formatValue = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', compactDisplay: 'short' } as any);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollToStart}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Início
        </Button>

        <div className="flex-1 flex items-center justify-center gap-1.5">
          {stages.map((stage, index) => {
            const isVisible = index >= visibleRange.start && index < visibleRange.end;
            const dealCount = stage.dealCount ?? 0;
            const totalValue = stage.totalValue ?? 0;

            return (
              <Tooltip key={stage.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => scrollToStage(index)}
                    className={cn(
                      'relative rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center',
                      isVisible
                        ? 'min-w-6 h-5 px-1.5 opacity-100 ring-2 ring-primary/30'
                        : 'w-3 h-3 opacity-60 hover:opacity-90 hover:scale-110'
                    )}
                    style={{ backgroundColor: stage.color }}
                    aria-label={`Ir para ${stage.label}`}
                  >
                    {isVisible && dealCount > 0 && (
                      <span className="text-[10px] font-medium text-white drop-shadow-sm">
                        {dealCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="font-medium">{stage.label}</div>
                  <div className="text-muted-foreground">
                    {dealCount} deal{dealCount !== 1 ? 's' : ''}
                    {totalValue > 0 && ` • ${formatValue(totalValue)}`}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground w-20 text-right">
          {visibleRange.start + 1}-{visibleRange.end} de {stages.length}
        </div>
      </div>
    </TooltipProvider>
  );
};
