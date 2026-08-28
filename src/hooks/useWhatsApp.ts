import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';


type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];
type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];
type WhatsAppConnection = Database['public']['Tables']['whatsapp_connections']['Row'];

/** Colunas de whatsapp_connections seguras para o cliente.
 *  webhook_secret é segredo de servidor: fica fora do select e fora do tipo. */
export type WhatsAppConnectionClient = Omit<WhatsAppConnection, 'webhook_secret'>;

// Extended conversation with joined relations (contacts, deals)
// Using Record<string, any> for relations to avoid Supabase generated type conflicts
export type WhatsAppConversationWithRelations = WhatsAppConversation & {
  contacts?: Record<string, any> | null;
  deals?: Record<string, any> | Record<string, any>[] | null;
};

export type ConversationWithConnection = WhatsAppConversation & {
  connection: WhatsAppConnection;
};

// ─── useWhatsAppConnection ──────────────────────────────────────────

export function useWhatsAppConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<WhatsAppConnectionClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('api_provider, broker_id, connected_at, connection_status, created_at, evolution_api_url, id, instance_name, phone_number, phone_number_id, qr_code, qr_code_base64, status, updated_at, waba_id, webhook_url')
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
  const [connection, setConnection] = useState<WhatsAppConnectionClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitingForQr, setWaitingForQr] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const brokerId = effectiveBrokerId || user?.id;

  const fetchConnection = useCallback(async () => {
    if (!brokerId) return;
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .select('api_provider, broker_id, connected_at, connection_status, created_at, evolution_api_url, id, instance_name, phone_number, phone_number_id, qr_code, qr_code_base64, status, updated_at, waba_id, webhook_url')
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
      .channel(`whatsapp-settings-${user.id}`)
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
  const { user } = useAuth();
  const [conversations, setConversations] = useState<WhatsAppConversationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const CONV_SELECT = '*, contacts(*), deals(*)';

  const fetchConversations = useCallback(async () => {
    if (!connectionId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select(CONV_SELECT)
      .eq('connection_id', connectionId)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      toast({ title: 'Erro ao carregar conversas', description: error.message, variant: 'destructive' });
    } else {
      const convs = (data as any as WhatsAppConversationWithRelations[]) || [];
      setConversations(convs);

      // Auto-link: for conversations without contact_id, try to find a match
      for (const conv of convs) {
        if (conv.contact_id || !conv.contact_phone) continue;
        const digits = conv.contact_phone.replace(/\D/g, '');
        if (digits.length < 8) continue;
        const last9 = digits.slice(-9);
        const last8 = digits.slice(-8);

        const { data: matched } = await supabase
          .from('contacts')
          .select('id, name')
          .or(`phone.ilike.%${last9},phone.ilike.%${last8},whatsapp.ilike.%${last9},whatsapp.ilike.%${last8}`)
          .limit(1)
          .maybeSingle();

        if (matched) {
          await supabase
            .from('whatsapp_conversations')
            .update({ contact_id: matched.id, contact_name: matched.name })
            .eq('id', conv.id);
          // Update local state
          setConversations(prev =>
            prev.map(c =>
              c.id === conv.id
                ? { ...c, contact_id: matched.id, contact_name: matched.name, contacts: matched as any }
                : c
            )
          );
        }
      }
    }
    setLoading(false);
  }, [connectionId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!connectionId || !user) return;

    const channel = supabase
      .channel(`conversations-${user.id}-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `connection_id=eq.${connectionId}`,
        },
        async (payload) => {
          const recordId = (payload.new as any)?.id || (payload.old as any)?.id;

          if (payload.eventType === 'DELETE') {
            setConversations((prev) => prev.filter((c) => c.id !== recordId));
            return;
          }

          // Deep fetch for both INSERT and UPDATE — never inject shallow payload
          const { data: fresh } = await supabase
            .from('whatsapp_conversations')
            .select(CONV_SELECT)
            .eq('id', recordId)
            .maybeSingle();

          if (!fresh) return;
          const fullConv = fresh as any as WhatsAppConversationWithRelations;

          if (payload.eventType === 'INSERT') {
            setConversations((prev) => {
              if (prev.some(c => c.id === fullConv.id)) return prev;
              return [fullConv, ...prev];
            });
          } else {
            // UPDATE — replace in-place and re-sort
            setConversations((prev) =>
              prev
                .map((c) => (c.id === fullConv.id ? fullConv : c))
                .sort((a, b) => {
                  const aTime = a.last_message_at || a.created_at;
                  const bTime = b.last_message_at || b.created_at;
                  return new Date(bTime).getTime() - new Date(aTime).getTime();
                })
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, user]);

  return { conversations, loading, refetch: fetchConversations };
}

// ─── useMessages ────────────────────────────────────────────────────

export function useMessages(conversationId: string | null, remoteJid?: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lazyLoading, setLazyLoading] = useState(false);
  const [lazyLoadAttempted, setLazyLoadAttempted] = useState<string | null>(null);

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
      setMessages([]);
    } else {
      setMessages(data || []);
      
      // Lazy load: if 0 messages in DB and we haven't tried yet for this conversation, fetch from Evolution
      if ((!data || data.length === 0) && remoteJid && lazyLoadAttempted !== conversationId) {
        setLazyLoadAttempted(conversationId);
        setLazyLoading(true);
        try {
          const { data: result, error: fetchErr } = await supabase.functions.invoke('whatsapp-instance', {
            body: { action: 'fetch_messages', remoteJid, conversationId },
          });
          
          if (!fetchErr && result?.count > 0) {
            // Re-fetch messages from DB after lazy load
            const { data: freshMessages } = await supabase
              .from('whatsapp_messages')
              .select('*')
              .eq('conversation_id', conversationId)
              .order('sent_at', { ascending: true });
            setMessages(freshMessages || []);
          }
        } catch (e) {
          console.error('Lazy load messages error:', e);
        } finally {
          setLazyLoading(false);
        }
      }
    }
    setLoading(false);
  }, [conversationId, remoteJid, lazyLoadAttempted]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Reset lazy load attempt when conversation changes
  useEffect(() => {
    if (!conversationId) setLazyLoadAttempted(null);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages-${user.id}-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as WhatsAppMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Auto-read: if an incoming message arrives while chat is open, reset unread
          if (newMsg.direction === 'incoming') {
            supabase
              .from('whatsapp_conversations')
              .update({ unread_count: 0 })
              .eq('id', conversationId)
              .then(({ error }) => {
                if (error) console.error('Auto-read error:', error);
              });
          }
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
  }, [conversationId, user]);

  return { messages, loading: loading || lazyLoading, refetch: fetchMessages };
}

// ─── useSendMessage ─────────────────────────────────────────────────

export function useSendMessage() {
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

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

        // Refresh connection status — backend marks it as 'connected' after a successful send
        queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });

        return data;
      } catch (err: any) {
        console.error('Send message exception:', err);
        toast({ title: 'Erro ao enviar mensagem', description: 'Tente novamente.', variant: 'destructive' });
        return null;
      } finally {
        setSending(false);
      }
    },
    [queryClient]
  );

  return { sendMessage, sending };
}


// ─── useContactDeals ────────────────────────────────────────────────

export function useContactDeals(contactId: string | null, refetchKey: number = 0) {
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
          unit:units(unit_number)
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
  }, [contactId, refetchKey]);

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
