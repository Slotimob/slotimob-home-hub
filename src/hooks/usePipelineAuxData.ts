import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { isPast, isToday } from 'date-fns';

export interface StageHistoryEntry {
  deal_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_at: string;
}

export interface Property {
  id: string;
  name: string;
}

export const usePipelineAuxData = () => {
  const { effectiveBrokerId } = useWorkspace();

  // Task counts por deal
  const { data: rawTaskCounts = [] } = useQuery({
    queryKey: ['deal-task-counts', effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_tasks')
        .select('deal_id, is_completed, due_date');
      if (error) throw error;
      return (data || []) as { deal_id: string; is_completed: boolean; due_date: string | null }[];
    },
    enabled: !!effectiveBrokerId,
    staleTime: 60_000,
  });

  const taskCounts = rawTaskCounts.reduce<Record<string, { pending: number; overdue: number }>>(
    (acc, task) => {
      if (!acc[task.deal_id]) acc[task.deal_id] = { pending: 0, overdue: 0 };
      if (!task.is_completed) {
        acc[task.deal_id].pending += 1;
        if (
          task.due_date &&
          isPast(new Date(task.due_date)) &&
          !isToday(new Date(task.due_date))
        ) {
          acc[task.deal_id].overdue += 1;
        }
      }
      return acc;
    },
    {},
  );

  // Histórico de estágios
  const { data: stageHistory = [] } = useQuery({
    queryKey: ['deal-stage-history', effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_stage_history')
        .select('deal_id, from_stage, to_stage, changed_at')
        .order('changed_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as StageHistoryEntry[];
    },
    enabled: !!effectiveBrokerId,
    staleTime: 120_000,
  });

  // Propriedades (para filtros)
  const { data: properties = [] } = useQuery({
    queryKey: ['pipeline-properties', effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as Property[];
    },
    enabled: !!effectiveBrokerId,
    staleTime: 300_000,
  });

  return { taskCounts, stageHistory, properties };
};
