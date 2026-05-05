import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface CustomPipeline {
  id: string;
  broker_id: string;
  name: string;
  pipeline_key: string;
  display_order: number;
  created_at: string;
}

// Default pipeline always present
const DEFAULT_PIPELINE: Omit<CustomPipeline, 'broker_id'> = {
  id: 'default_sale',
  name: 'Vendas',
  pipeline_key: 'sale',
  display_order: -1,
  created_at: '',
};

export const CUSTOM_PIPELINES_QUERY_KEY = ['custom-pipelines'] as const;

export const useCustomPipelines = () => {
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pipelines = [], isLoading: loading } = useQuery({
    queryKey: [...CUSTOM_PIPELINES_QUERY_KEY, effectiveBrokerId],
    queryFn: async () => {
      if (!effectiveBrokerId) return [{ ...DEFAULT_PIPELINE, broker_id: '' } as CustomPipeline];

      const { data, error } = await supabase
        .from('custom_pipelines')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      const defaultPipeline: CustomPipeline = {
        ...DEFAULT_PIPELINE,
        broker_id: effectiveBrokerId,
      };

      const custom = (data || []).filter((p: any) => p.pipeline_key !== 'sale');
      return [defaultPipeline, ...custom];
    },
    enabled: true,
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CUSTOM_PIPELINES_QUERY_KEY });
  }, [queryClient]);

  const createPipeline = async (name: string) => {
    if (!effectiveBrokerId) return;

    const key = `custom_${Date.now()}`;
    const maxOrder = Math.max(...pipelines.map(p => p.display_order), 0);

    try {
      const { error } = await supabase
        .from('custom_pipelines')
        .insert({
          broker_id: effectiveBrokerId,
          name,
          pipeline_key: key,
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      toast({ title: 'Pipeline criado!', description: `"${name}" foi adicionado.` });
      invalidate();
      return key;
    } catch (error: any) {
      toast({ title: 'Erro ao criar pipeline', description: error.message, variant: 'destructive' });
    }
  };

  const renamePipeline = async (pipelineKey: string, newName: string) => {
    if (pipelineKey === 'sale') return;

    // Optimistic update
    queryClient.setQueryData(
      [...CUSTOM_PIPELINES_QUERY_KEY, effectiveBrokerId],
      (old: CustomPipeline[] | undefined) =>
        old?.map(p => p.pipeline_key === pipelineKey ? { ...p, name: newName } : p)
    );

    try {
      const { error } = await supabase
        .from('custom_pipelines')
        .update({ name: newName })
        .eq('pipeline_key', pipelineKey);

      if (error) throw error;

      toast({ title: 'Pipeline renomeado!' });
      invalidate();
    } catch (error: any) {
      toast({ title: 'Erro ao renomear pipeline', description: error.message, variant: 'destructive' });
      invalidate(); // revert
    }
  };

  const deletePipeline = async (pipelineKey: string) => {
    if (pipelineKey === 'sale') return;

    try {
      const { error } = await supabase
        .from('custom_pipelines')
        .delete()
        .eq('pipeline_key', pipelineKey);

      if (error) throw error;

      toast({ title: 'Pipeline excluído!' });
      invalidate();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir pipeline', description: error.message, variant: 'destructive' });
    }
  };

  const reorderPipelines = async (orderedKeys: string[]) => {
    const customKeys = orderedKeys.filter(k => k !== 'sale');

    // Optimistic update
    queryClient.setQueryData(
      [...CUSTOM_PIPELINES_QUERY_KEY, effectiveBrokerId],
      (old: CustomPipeline[] | undefined) => {
        if (!old) return old;
        const defaultP = old.find(p => p.pipeline_key === 'sale');
        const reordered = customKeys
          .map(key => old.find(p => p.pipeline_key === key))
          .filter(Boolean) as CustomPipeline[];
        const reorderedWithOrder = reordered.map((p, i) => ({ ...p, display_order: i }));
        return defaultP ? [defaultP, ...reorderedWithOrder] : reorderedWithOrder;
      }
    );

    try {
      for (let i = 0; i < customKeys.length; i++) {
        const pipeline = pipelines.find(p => p.pipeline_key === customKeys[i]);
        if (pipeline && pipeline.id !== 'default_sale') {
          await supabase
            .from('custom_pipelines')
            .update({ display_order: i })
            .eq('id', pipeline.id);
        }
      }
      toast({ title: 'Ordem salva!' });
    } catch (error: any) {
      toast({ title: 'Erro ao reordenar', description: error.message, variant: 'destructive' });
      invalidate(); // revert
    }
  };

  return {
    pipelines,
    loading,
    createPipeline,
    renamePipeline,
    deletePipeline,
    reorderPipelines,
    reload: invalidate,
  };
};
