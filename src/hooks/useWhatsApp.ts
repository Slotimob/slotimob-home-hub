import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];
type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];
type WhatsAppConnection = Database['public']['Tables']['whatsapp_connections']['Row'];

export type ConversationWithConnection = WhatsAppConversation & {
  connection: WhatsAppConnection;
};

// ─── useWhatsAppConnection ──────────────────────────────────────────

export function useWhatsAppConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('broker_id', user.id)
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching WhatsApp connection:', error);
      }
      setConnection(data);
      setLoading(false);
    };

    fetch();
  }, [user]);

  return { connection, loading };
}

// ─── useWhatsAppSettingsConnection ──────────────────────────────────
// Used in WhatsAppSettings page: fetches ANY connection (not just connected)
// and subscribes to Realtime for QR code updates from the webhook.

export function useWhatsAppSettingsConnection() {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitingForQr, setWaitingForQr] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const brokerId = effectiveBrokerId || user?.id;

  const fetchConnection = useCallback(async () => {
    if (!brokerId) return;
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('broker_id', brokerId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching WhatsApp connection:', error);
    }
    setConnection(data);
    setLoading(false);

    if (data && !data.qr_code_base64 && ['preparing', 'connecting', 'pending'].includes(data.connection_status || '')) {
      setWaitingForQr(true);
    } else {
      setWaitingForQr(false);
    }
  }, [brokerId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Shared cleanup: reset local state + disconnect backend (fire-and-forget)
  const cleanupInstance = useCallback(async (reason: 'cancel' | 'timeout') => {
    setWaitingForQr(false);
    setCountdown(null);
    if (reason === 'timeout') setTimedOut(true);

    // Fire-and-forget backend cleanup
    supabase.functions.invoke('whatsapp-instance', {
      body: { action: 'disconnect' },
    }).then(() => {
      toast({
        title: reason === 'cancel' ? 'Solicitação cancelada' : 'Tempo esgotado',
        description: 'Instância limpa com sucesso. Você pode tentar novamente.',
      });
    }).catch((e) => {
      console.warn('Cleanup disconnect failed (non-critical):', e);
    });

    fetchConnection();
  }, [fetchConnection]);

  // Countdown timer (60s) while waiting
  useEffect(() => {
    if (!waitingForQr) {
      setCountdown(null);
      return;
    }

    setCountdown(60);
    setTimedOut(false);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Timeout reached — trigger full cleanup
          cleanupInstance('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [waitingForQr, cleanupInstance]);

  // Cancel: user-initiated abort
  const cancelRequest = useCallback(() => {
    cleanupInstance('cancel');
  }, [cleanupInstance]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('whatsapp-settings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_connections',
          filter: `broker_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime whatsapp_connections update:', payload.eventType);
          if (payload.eventType === 'DELETE') {
            setConnection(null);
            setWaitingForQr(false);
          } else {
            const updated = payload.new as WhatsAppConnection;
            setConnection(updated);
            if (updated.qr_code_base64 || updated.connection_status === 'open') {
              setWaitingForQr(false);
            }
            // Auto-trigger sync_history when status becomes connected
            if (updated.status === 'connected' && updated.connection_status === 'open') {
              console.log('Connection established — triggering sync_history...');
              supabase.functions.invoke('whatsapp-instance', {
                body: { action: 'sync_history' },
              }).then(({ data, error }) => {
                if (error) console.error('Auto sync_history error:', error);
                else console.log('Auto sync_history result:', data);
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brokerId]);

  // Verificação manual do status (fallback se Realtime falhar)
  const checkInstanceStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'status' },
      });
      if (error) throw error;
      console.log('checkInstanceStatus result:', data);
      if (data?.state === 'open' || data?.state === 'connected') {
        // Force local state update immediately (avoid F5 if Realtime is slow)
        setConnection((prev) => prev ? {
          ...prev,
          status: 'connected',
          connection_status: 'open',
          qr_code_base64: null,
          connected_at: prev.connected_at || new Date().toISOString(),
        } : prev);
        setWaitingForQr(false);
        await fetchConnection();
        return { connected: true };
      }
      return { connected: false, state: data?.state };
    } catch (e) {
      console.error('checkInstanceStatus error:', e);
      return { connected: false };
    }
  }, [fetchConnection]);

  return {
    connection,
    loading,
    waitingForQr,
    setWaitingForQr,
    countdown,
    timedOut,
    setTimedOut,
    cancelRequest,
    checkInstanceStatus,
    refetch: fetchConnection,
  };
}

// ─── useConversations ───────────────────────────────────────────────

export function useConversations(connectionId: string | null) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!connectionId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      toast({ title: 'Erro ao carregar conversas', description: error.message, variant: 'destructive' });
    } else {
      setConversations(data || []);
    }
    setLoading(false);
  }, [connectionId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!connectionId) return;

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConversations((prev) => [payload.new as WhatsAppConversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations((prev) =>
              prev
                .map((c) => (c.id === (payload.new as WhatsAppConversation).id ? (payload.new as WhatsAppConversation) : c))
                .sort((a, b) => {
                  const aTime = a.last_message_at || a.created_at;
                  const bTime = b.last_message_at || b.created_at;
                  return new Date(bTime).getTime() - new Date(aTime).getTime();
                })
            );
          } else if (payload.eventType === 'DELETE') {
            setConversations((prev) => prev.filter((c) => c.id !== (payload.old as WhatsAppConversation).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId]);

  return { conversations, loading, refetch: fetchConversations };
}

// ─── useMessages ────────────────────────────────────────────────────

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      toast({ title: 'Erro ao carregar mensagens', description: error.message, variant: 'destructive' });
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const newMsg = payload.new as WhatsAppMessage;
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as WhatsAppMessage).id ? (payload.new as WhatsAppMessage) : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, refetch: fetchMessages };
}

// ─── useSendMessage ─────────────────────────────────────────────────

export function useSendMessage() {
  const [sending, setSending] = useState(false);

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!content.trim()) return null;

      setSending(true);
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-send', {
          body: {
            conversationId,
            messageType: 'text',
            content: content.trim(),
          },
        });

        if (error) {
          console.error('Send message error:', error);
          toast({ title: 'Erro ao enviar mensagem', description: error.message, variant: 'destructive' });
          return null;
        }

        return data;
      } catch (err: any) {
        console.error('Send message exception:', err);
        toast({ title: 'Erro ao enviar mensagem', description: 'Tente novamente.', variant: 'destructive' });
        return null;
      } finally {
        setSending(false);
      }
    },
    []
  );

  return { sendMessage, sending };
}

// ─── useContactDeals ────────────────────────────────────────────────

export function useContactDeals(contactId: string | null) {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contactId) {
      setDeals([]);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          custom_stage:pipeline_stages(name, color),
          property:properties(name),
          unit:units(title)
        `)
        .eq('contact_id', contactId)
        .not('stage', 'in', '("won","lost")')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching contact deals:', error);
      } else {
        setDeals(data || []);
      }
      setLoading(false);
    };

    fetch();
  }, [contactId]);

  return { deals, loading };
}

// ─── useContactActivities ───────────────────────────────────────────

export function useContactActivities(contactId: string | null) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contactId) {
      setActivities([]);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data: contactDeals } = await supabase
        .from('deals')
        .select('id')
        .eq('contact_id', contactId);

      if (!contactDeals || contactDeals.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const dealIds = contactDeals.map((d) => d.id);
      const { data, error } = await supabase
        .from('deal_activities')
        .select('*')
        .in('deal_id', dealIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching activities:', error);
      } else {
        setActivities(data || []);
      }
      setLoading(false);
    };

    fetch();
  }, [contactId]);

  return { activities, loading };
}

// ─── useConversationContact ─────────────────────────────────────────

export function useConversationContact(contactId: string | null) {
  const [contact, setContact] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contactId) {
      setContact(null);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      // Try direct contact_id first
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching contact:', error);
      }
      setContact(data);
      setLoading(false);
    };

    fetch();
  }, [contactId]);

  return { contact, loading };
}
