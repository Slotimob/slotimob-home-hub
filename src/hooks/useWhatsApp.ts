import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

  // Realtime: listen for conversation updates
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

  // Realtime: listen for new messages and status updates
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
            // Avoid duplicates
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
      // Fetch deal activities for deals related to this contact
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

export function useConversationContact(leadId: string | null) {
  const [contact, setContact] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setContact(null);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      // First try to find a contact linked to this lead
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('legacy_lead_id', leadId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching contact for lead:', error);
      }
      setContact(data);
      setLoading(false);
    };

    fetch();
  }, [leadId]);

  return { contact, loading };
}
