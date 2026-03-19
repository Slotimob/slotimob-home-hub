import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';

export interface QuickMessage {
  id: string;
  title: string;
  content: string;
  broker_id: string;
  created_at: string;
}

export function useQuickMessages() {
  const { effectiveBrokerId } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['quick-messages', effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_messages')
        .select('*')
        .eq('broker_id', effectiveBrokerId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as QuickMessage[];
    },
    enabled: !!effectiveBrokerId,
  });

  const addMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const { error } = await supabase
        .from('quick_messages')
        .insert({ title, content, broker_id: effectiveBrokerId! });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quick-messages'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quick_messages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quick-messages'] }),
  });

  return {
    messages,
    isLoading,
    addMessage: addMutation.mutateAsync,
    deleteMessage: deleteMutation.mutateAsync,
  };
}
