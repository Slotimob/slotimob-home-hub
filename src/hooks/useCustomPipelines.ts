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

      // Always include default "Vendas" pipeline at position 0
      const defaultPipeline: CustomPipeline = {
        ...DEFAULT_PIPELINE,
        broker_id: effectiveBrokerId,
      };

      // Filter out any DB entry with key 'sale' (we handle it as built-in)
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

  const deletePipeline = async (pipelineKey: string) => {
    if (pipelineKey === 'sale') return; // Can't delete default

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

  return { pipelines, loading, createPipeline, deletePipeline, reload: loadPipelines };
};
