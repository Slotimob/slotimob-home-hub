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
      // Check for updates every 60 seconds (less aggressive)
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

  const handleUpdate = async () => {
    if (autoReloadTimer.current) clearTimeout(autoReloadTimer.current);
    try {
      await updateServiceWorker(true);
    } catch {
      // If SW update fails, force a hard reload
    }
    // Hard reload to bust any remaining cache
    window.location.reload();
  };

  useEffect(() => {
    if (needRefresh) {
      toast.info('Nova versão disponível!', {
        description: 'Atualizando automaticamente em 3 segundos…',
        duration: 5000,
        action: {
          label: 'Atualizar agora',
          onClick: handleUpdate,
        },
      });

      // Force update after 3 seconds
      autoReloadTimer.current = setTimeout(handleUpdate, 3000);
    }

    return () => {
      if (autoReloadTimer.current) clearTimeout(autoReloadTimer.current);
    };
  }, [needRefresh]);

  return null;
}
