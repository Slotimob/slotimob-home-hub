import { useState, useEffect } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HINT_STORAGE_KEY = 'pipeline_scroll_hint_dismissed';

export const PipelineScrollHint = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(HINT_STORAGE_KEY);
    if (!dismissed) {
      // Small delay for smoother appearance
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(HINT_STORAGE_KEY, 'true');
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        'fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50',
        'bg-card border shadow-lg rounded-xl px-4 py-3',
        'animate-fade-in transition-all duration-300',
        'max-w-xs w-[90vw]'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
          <GripHorizontal className="h-5 w-5 text-primary animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Arraste para navegar</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            No desktop, clique e arraste. No mobile, deslize para os lados.
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mt-1 -mr-1"
          onClick={dismiss}
          aria-label="Fechar dica"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="secondary" className="text-xs h-7" onClick={dismiss}>
          Entendi
        </Button>
      </div>
    </div>
  );
};
