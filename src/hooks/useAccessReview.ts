import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';

export type AccessReviewStatus = 'pending' | 'overdue';

export interface AccessReviewMemberSnapshot {
  user_id?: string;
  full_name?: string;
  email?: string;
  role_label?: string;
  [key: string]: unknown;
}

export interface AccessReviewCycle {
  id: string;
  broker_id: string;
  period_label: string;
  period_start: string;
  due_date: string;
  status: AccessReviewStatus;
  members_count: number;
  members_snapshot: AccessReviewMemberSnapshot[] | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_snapshot: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CompleteReviewResponse {
  success: boolean;
  error?: 'cycle_not_found' | 'not_authorized' | 'already_completed';
  cycle_id?: string;
  period?: string;
  members_at_completion?: number;
}

const COMPLETION_ERRORS: Record<string, string> = {
  already_completed: 'Esta revisão já foi concluída.',
  not_authorized: 'Você não tem permissão para concluir esta revisão.',
  cycle_not_found: 'Ciclo de revisão não encontrado.',
};

const startOfDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

/** Dias inteiros entre hoje e a data limite (negativo quando vencido). */
const diffInDays = (dueDate: string): number => {
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(due).getTime() - startOfDay(new Date()).getTime()) / msPerDay);
};

/**
 * Revisão trimestral de acessos da equipe (controle de segurança BaaS).
 * Somente o DONO da conta possui ciclo de revisão — convidados são ignorados.
 */
export const useAccessReview = () => {
  const queryClient = useQueryClient();
  const { isMember, isLoading: workspaceLoading, effectiveBrokerId } = useWorkspace();

  const { data: cycle, isLoading } = useQuery({
    queryKey: ['access-review', 'pending'],
    queryFn: async (): Promise<AccessReviewCycle | null> => {
      const { data, error } = await supabase.rpc('get_pending_access_review');
      if (error) throw error;
      if (!data) return null;
      return data as unknown as AccessReviewCycle;
    },
    enabled: !workspaceLoading && !isMember && !!effectiveBrokerId,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (notes: string | null) => {
      if (!cycle) throw new Error(COMPLETION_ERRORS.cycle_not_found);

      const { data, error } = await supabase.rpc('complete_access_review', {
        p_cycle_id: cycle.id,
        p_notes: notes && notes.trim() ? notes.trim() : null,
      });
      if (error) throw new Error('Não foi possível concluir a revisão. Tente novamente.');

      const result = data as unknown as CompleteReviewResponse | null;
      if (!result?.success) {
        const key = result?.error ?? '';
        throw new Error(COMPLETION_ERRORS[key] ?? 'Não foi possível concluir a revisão. Tente novamente.');
      }
      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['access-review', 'pending'] });
    },
  });

  const completeReview = useCallback(
    async (notes: string | null) => mutation.mutateAsync(notes),
    [mutation],
  );

  return {
    cycle: cycle ?? null,
    hasPendingReview: !!cycle,
    isOverdue: cycle?.status === 'overdue',
    daysLeft: cycle ? diffInDays(cycle.due_date) : 0,
    isLoading: isLoading || workspaceLoading,
    completeReview,
    isCompleting: mutation.isPending,
  };
};
