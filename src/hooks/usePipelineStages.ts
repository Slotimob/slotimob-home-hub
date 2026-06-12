import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { arrayMove } from '@dnd-kit/sortable';

export interface CustomStage {
  id: string;
  name: string;
  display_order: number;
  color: string;
  is_won_stage: boolean;
  is_lost_stage: boolean;
}

export const PIPELINE_STAGES_QUERY_KEY = ['pipeline-stages'] as const;
export const PIPELINE_STAGE_ORDER_QUERY_KEY = ['pipeline-stage-order'] as const;

export const usePipelineStages = (activePipeline: string) => {
  const { effectiveBrokerId } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customStages = [] } = useQuery({
    queryKey: [...PIPELINE_STAGES_QUERY_KEY, activePipeline, effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_type', activePipeline)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as CustomStage[];
    },
    enabled: !!effectiveBrokerId,
    staleTime: 60_000,
  });

  const { data: stageOrder = null } = useQuery({
    queryKey: [...PIPELINE_STAGE_ORDER_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('pipeline_stage_order')
        .eq('id', user.id)
        .single();
      if (error) return null;
      return (data?.pipeline_stage_order as string[] | null) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const invalidateStages = () => {
    queryClient.invalidateQueries({ queryKey: PIPELINE_STAGES_QUERY_KEY });
  };

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: PIPELINE_STAGE_ORDER_QUERY_KEY });
  };

  const saveStageOrder = async (orderedIds: string[]) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ pipeline_stage_order: orderedIds })
      .eq('id', user.id);
    if (error) throw error;
    invalidateOrder();
  };

  const handleAddStage = async (
    name: string,
    color: string,
    isWonStage?: boolean,
    isLostStage?: boolean,
    insertAfterStageId?: string | null,
  ) => {
    try {
      if (insertAfterStageId) {
        const insertAfterStage = customStages.find(s => s.id === insertAfterStageId);
        if (insertAfterStage) {
          const stagesToShift = customStages.filter(s => s.display_order > insertAfterStage.display_order);
          for (const stage of stagesToShift) {
            await supabase
              .from('pipeline_stages')
              .update({ display_order: stage.display_order + 1 })
              .eq('id', stage.id);
          }
        }
      }
      const insertAfterStage = insertAfterStageId
        ? customStages.find(s => s.id === insertAfterStageId)
        : null;
      const displayOrder = insertAfterStage
        ? insertAfterStage.display_order + 1
        : customStages.length > 0
        ? Math.max(...customStages.map(s => s.display_order)) + 1
        : 0;

      const { error } = await supabase.from('pipeline_stages').insert({
        pipeline_type: activePipeline,
        name,
        color,
        display_order: displayOrder,
        is_won_stage: isWonStage ?? false,
        is_lost_stage: isLostStage ?? false,
      });
      if (error) throw error;
      invalidateStages();
    } catch (error: any) {
      toast({ title: 'Erro ao criar estágio', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      const { error: moveError } = await supabase
        .from('deals')
        .update({ custom_stage_id: null, stage: 'new_lead' as any })
        .eq('custom_stage_id', stageId);
      if (moveError) throw moveError;
      const { error } = await supabase.from('pipeline_stages').delete().eq('id', stageId);
      if (error) throw error;
      toast({ title: 'Estágio excluído' });
      invalidateStages();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir estágio', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveStage = async (
    id: string,
    name: string,
    color: string,
    isWonStage: boolean,
    isLostStage: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update({ name, color, is_won_stage: isWonStage, is_lost_stage: isLostStage })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Estágio atualizado' });
      invalidateStages();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar estágio', description: error.message, variant: 'destructive' });
    }
  };

  const handleReorderStages = async (activeId: string, overId: string, currentStageIds: string[]) => {
    const activeIndex = currentStageIds.indexOf(activeId);
    const overIndex = currentStageIds.indexOf(overId);
    if (activeIndex === -1 || overIndex === -1) return;

    const newOrder = arrayMove(currentStageIds, activeIndex, overIndex);
    await saveStageOrder(newOrder);

    const customIds = newOrder.filter(id => id.startsWith('custom_'));
    const updates = customIds
      .map((stageId, index) => {
        const realId = stageId.replace('custom_', '');
        const stage = customStages.find(s => s.id === realId);
        return stage ? { id: realId, display_order: index } : null;
      })
      .filter(Boolean) as { id: string; display_order: number }[];

    for (const update of updates) {
      await supabase
        .from('pipeline_stages')
        .update({ display_order: update.display_order })
        .eq('id', update.id);
    }
    invalidateStages();
  };

  return {
    customStages,
    stageOrder,
    saveStageOrder,
    handleAddStage,
    handleDeleteStage,
    handleSaveStage,
    handleReorderStages,
  };
};
