import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

/**
 * Global Realtime listener for WhatsApp connection changes.
 * Mounted in AppLayout so it works on ANY page.
 * Shows a toast when the QR code arrives or connection becomes active.
 */
export function useWhatsAppGlobalListener() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('whatsapp-global-listener')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_connections',
          filter: `broker_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          const connId = updated.id;

          // Notify when QR code arrives (only once per connection)
          if (
            updated.qr_code_base64 &&
            updated.connection_status === 'qrcode' &&
            notifiedRef.current !== `qr-${connId}`
          ) {
            notifiedRef.current = `qr-${connId}`;
            toast({
              title: '📱 WhatsApp pronto!',
              description: 'O QR Code está disponível. Escaneie agora para conectar.',
              action: (
                <button
                  className="ml-2 text-xs font-semibold underline text-primary whitespace-nowrap"
                  onClick={() => navigate('/integrations')}
                >
                  Ir para Conectar
                </button>
              ) as any,
            });
          }

          // Notify when connected
          if (
            updated.connection_status === 'open' &&
            notifiedRef.current !== `open-${connId}`
          ) {
            notifiedRef.current = `open-${connId}`;
            toast({
              title: '✅ WhatsApp conectado!',
              description: 'Sua integração está ativa.',
              duration: 1000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);
}
