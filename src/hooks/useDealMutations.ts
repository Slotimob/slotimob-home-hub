import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/hooks/useWorkspace';
import { PIPELINE_DEALS_QUERY_KEY } from '@/hooks/usePipelineDeals';
import type { Deal } from '@/hooks/usePipelineDeals';
import type { Database } from '@/integrations/supabase/types';

type PipelineStage = Database['public']['Enums']['pipeline_stage'];

export const useDealMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();

  const invalidateDeals = () => {
    queryClient.invalidateQueries({ queryKey: PIPELINE_DEALS_QUERY_KEY });
  };

  const updateDealPlacement = async (
    dealId: string,
    targetStage: string,
    customStages: { id: string; is_won_stage: boolean; is_lost_stage: boolean }[],
    deals: Deal[],
    onRequiresLossReason: (dealId: string, oldStage: PipelineStage, oldVisibleStageId: string) => void,
    onRequiresCommission: (deal: Deal) => void,
  ) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    const isCustomTarget = targetStage.startsWith('custom_');
    const realCustomId = isCustomTarget ? targetStage.replace('custom_', '') : null;
    const customStage = realCustomId ? customStages.find(s => s.id === realCustomId) : null;

    const isWon = targetStage === 'won' || customStage?.is_won_stage;
    const isLost = targetStage === 'lost' || customStage?.is_lost_stage;

    if (isLost) {
      const oldVisibleStageId = deal.custom_stage_id ? `custom_${deal.custom_stage_id}` : deal.stage;
      onRequiresLossReason(dealId, deal.stage, oldVisibleStageId);
      return;
    }

    const updateData: Record<string, any> = {
      stage: isCustomTarget ? deal.stage : (targetStage as PipelineStage),
      custom_stage_id: realCustomId ?? null,
    };

    if (isWon) {
      updateData.stage = 'won' as PipelineStage;
      updateData.custom_stage_id = null;
    }

    const { error: updateError } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', dealId);

    if (updateError) {
      toast({ title: 'Erro ao mover deal', description: updateError.message, variant: 'destructive' });
      return;
    }

    await supabase.from('deal_stage_history').insert({
      broker_id: effectiveBrokerId!,
      deal_id: dealId,
      from_stage: deal.stage,
      to_stage: isCustomTarget ? `custom_${realCustomId}` : targetStage,
      changed_at: new Date().toISOString(),
    });

    invalidateDeals();

    if (isWon) {
      onRequiresCommission(deal);
    }
  };

  const bulkMoveDeals = async (
    dealIds: string[],
    targetStage: string,
    deals: Deal[],
  ) => {
    const isCustomTarget = targetStage.startsWith('custom_');
    const realCustomId = isCustomTarget ? targetStage.replace('custom_', '') : null;
    const typedTargetStage = isCustomTarget ? ('new_lead' as PipelineStage) : (targetStage as PipelineStage);

    const { error: updateError } = await supabase
      .from('deals')
      .update({ stage: typedTargetStage, custom_stage_id: realCustomId ?? null })
      .in('id', dealIds);

    if (updateError) {
      toast({ title: 'Erro ao mover deals', description: updateError.message, variant: 'destructive' });
      return;
    }

    const historyEntries = dealIds.map(id => {
      const deal = deals.find(d => d.id === id);
      return {
        deal_id: id,
        from_stage: deal?.stage ?? 'new_lead',
        to_stage: targetStage,
        changed_at: new Date().toISOString(),
      };
    });

    await supabase.from('deal_stage_history').insert(historyEntries);
    invalidateDeals();
    toast({ title: `${dealIds.length} deals movidos` });
  };

  const confirmLossReason = async (
    dealId: string,
    targetStage: string,
    reason: string,
    notes: string,
    deals: Deal[],
  ) => {
    const deal = deals.find(d => d.id === dealId);
    const isCustomTarget = targetStage.startsWith('custom_');
    const realCustomId = isCustomTarget ? targetStage.replace('custom_', '') : null;

    const { error } = await supabase
      .from('deals')
      .update({
        stage: 'lost' as PipelineStage,
        custom_stage_id: realCustomId ?? null,
        loss_reason: reason,
        notes: notes || deal?.notes,
      })
      .eq('id', dealId);

    if (error) {
      toast({ title: 'Erro ao registrar perda', description: error.message, variant: 'destructive' });
      return;
    }

    await supabase.from('deal_stage_history').insert({
      broker_id: effectiveBrokerId!,
      deal_id: dealId,
      from_stage: deal?.stage ?? 'new_lead',
      to_stage: targetStage,
      changed_at: new Date().toISOString(),
    });

    invalidateDeals();
  };

  return { updateDealPlacement, bulkMoveDeals, confirmLossReason };
};
