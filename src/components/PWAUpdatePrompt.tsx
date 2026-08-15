import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { hasUnsavedChanges } from '@/lib/unsaved-changes-guard';

export function PWAUpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) setDismissed(false);
  }, [needRefresh]);

  const handleUpdate = async () => {
    // Never reload while a form holds unsaved data
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm(
        'Existem alterações não salvas nesta página. Recarregar agora vai descartá-las. Deseja continuar?'
      );
      if (!confirmed) return;
    }
    try {
      await updateServiceWorker(true);
    } catch {
      // ignore — fall back to hard reload
    }
    window.location.reload();
  };

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Nova versão disponível</p>
          <p className="text-xs text-muted-foreground">
            Atualize quando terminar o que está fazendo. Nada será recarregado automaticamente.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleUpdate}>
              Atualizar agora
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              Depois
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar aviso de atualização"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
