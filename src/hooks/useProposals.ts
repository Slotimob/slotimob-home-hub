import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useToast } from './use-toast';

export interface Proposal {
  id: string;
  broker_id: string;
  property_id: string | null;
  unit_id: string | null;
  deal_id: string | null;
  lead_name: string | null;
  introduction_message: string | null;
  include_financing: boolean;
  include_cover: boolean;
  status: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  // joined
  unit?: { unit_number: string; price: number | null; cover_image_url: string | null } | null;
  property?: { name: string } | null;
}

export interface CreateProposalInput {
  property_id?: string | null;
  unit_id?: string | null;
  deal_id?: string | null;
  contact_id?: string | null;
  lead_name?: string;
  introduction_message?: string;
  include_financing?: boolean;
  include_cover?: boolean;
  status?: string;
  pdf_url?: string;
}

export interface UpdateProposalInput extends CreateProposalInput {
  id: string;
}

export const useProposals = () => {
  const { effectiveBrokerId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const proposalsQuery = useQuery({
    queryKey: ['proposals', effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, unit:units(unit_number, price, cover_image_url), property:properties(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Proposal[];
    },
    enabled: !!effectiveBrokerId,
  });

  const createProposal = useMutation({
    mutationFn: async (input: CreateProposalInput) => {
      if (!effectiveBrokerId) throw new Error('Workspace não disponível');

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          broker_id: effectiveBrokerId,
          property_id: input.property_id || null,
          unit_id: input.unit_id || null,
          deal_id: (input as any).deal_id || null,
          contact_id: (input as any).contact_id || null,
          lead_name: input.lead_name || null,
          introduction_message: input.introduction_message || null,
          include_financing: input.include_financing ?? false,
          include_cover: input.include_cover ?? true,
          status: input.status || 'draft',
          pdf_url: input.pdf_url || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposta criada!', description: 'A proposta foi salva no histórico.' });

      // Auto-create CRM activity when linked to a deal
      const linkedDealId = variables.deal_id;
      if (linkedDealId && effectiveBrokerId) {
        supabase.from('deal_activities').insert({
          deal_id: linkedDealId,
          broker_id: effectiveBrokerId,
          activity_type: 'proposal',
          title: 'Proposta comercial gerada',
          description: `Proposta comercial gerada e enviada para o cliente${variables.lead_name ? ` (${variables.lead_name})` : ''}.`,
        }).then(({ error }) => {
          if (error) console.warn('Failed to create deal activity for proposal:', error);
          else queryClient.invalidateQueries({ queryKey: ['deal-activities'] });
        });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar proposta', description: error.message, variant: 'destructive' });
    },
  });

  const updateProposal = useMutation({
    mutationFn: async (input: UpdateProposalInput) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from('proposals')
        .update({
          lead_name: updates.lead_name || null,
          introduction_message: updates.introduction_message || null,
          include_financing: updates.include_financing ?? false,
          include_cover: updates.include_cover ?? true,
          status: updates.status,
          pdf_url: updates.pdf_url || null,
          deal_id: (updates as any).deal_id || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast({ title: 'Proposta atualizada!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar proposta', description: error.message, variant: 'destructive' });
    },
  });

  const updateProposalStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('proposals')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, status')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      await queryClient.refetchQueries({ queryKey: ['proposals', effectiveBrokerId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    },
  });


  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', effectiveBrokerId] });
      toast({ title: 'Proposta excluída' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir proposta', description: error.message, variant: 'destructive' });
    },
  });

  return {
    proposals: proposalsQuery.data ?? [],
    isLoading: proposalsQuery.isLoading,
    createProposal,
    updateProposal,
    updateProposalStatus,
    deleteProposal,
  };
};
