import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function PWAUpdatePrompt() {
  const autoReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every 30 seconds
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 30 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // Show toast immediately
      toast.error('Nova versão disponível!', {
        description: 'Atualizando automaticamente em 3 segundos…',
        duration: 4000,
        action: {
          label: 'Atualizar agora',
          onClick: () => {
            if (autoReloadTimer.current) clearTimeout(autoReloadTimer.current);
            updateServiceWorker(true);
          },
        },
      });

      // Force update after 3 seconds regardless
      autoReloadTimer.current = setTimeout(() => {
        updateServiceWorker(true);
      }, 3000);
    }

    return () => {
      if (autoReloadTimer.current) clearTimeout(autoReloadTimer.current);
    };
  }, [needRefresh, updateServiceWorker]);

  return null;
}
