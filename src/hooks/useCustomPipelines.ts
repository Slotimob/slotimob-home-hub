import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';

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

export const useCustomPipelines = () => {
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState<CustomPipeline[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPipelines = useCallback(async () => {
    if (!effectiveBrokerId) return;
    try {
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
      setPipelines([defaultPipeline, ...custom]);
    } catch (error) {
      console.error('Error loading pipelines:', error);
      setPipelines([{ ...DEFAULT_PIPELINE, broker_id: effectiveBrokerId || '' }]);
    } finally {
      setLoading(false);
    }
  }, [effectiveBrokerId]);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

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
      await loadPipelines();
      return key;
    } catch (error: any) {
      toast({ title: 'Erro ao criar pipeline', description: error.message, variant: 'destructive' });
    }
  };

  const renamePipeline = async (pipelineKey: string, newName: string) => {
    if (pipelineKey === 'sale') return;

    // Optimistic update
    setPipelines(prev => prev.map(p => p.pipeline_key === pipelineKey ? { ...p, name: newName } : p));

    try {
      const { error } = await supabase
        .from('custom_pipelines')
        .update({ name: newName })
        .eq('pipeline_key', pipelineKey);

      if (error) throw error;

      toast({ title: 'Pipeline renomeado!' });
      await loadPipelines();
    } catch (error: any) {
      toast({ title: 'Erro ao renomear pipeline', description: error.message, variant: 'destructive' });
      await loadPipelines(); // revert
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
      await loadPipelines();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir pipeline', description: error.message, variant: 'destructive' });
    }
  };

  const reorderPipelines = async (orderedKeys: string[]) => {
    // Only reorder custom pipelines (skip 'sale')
    const customKeys = orderedKeys.filter(k => k !== 'sale');

    // Optimistic update
    const defaultP = pipelines.find(p => p.pipeline_key === 'sale');
    const reordered = customKeys
      .map(key => pipelines.find(p => p.pipeline_key === key))
      .filter(Boolean) as CustomPipeline[];
    const reorderedWithOrder = reordered.map((p, i) => ({ ...p, display_order: i }));
    setPipelines(defaultP ? [defaultP, ...reorderedWithOrder] : reorderedWithOrder);

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
      await loadPipelines(); // revert
    }
  };

  return {
    pipelines,
    loading,
    createPipeline,
    renamePipeline,
    deletePipeline,
    reorderPipelines,
    reload: loadPipelines,
  };
};
