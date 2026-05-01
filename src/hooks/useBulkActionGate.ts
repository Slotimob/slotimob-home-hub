import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useAuth } from './useAuth';
import { useCallback } from 'react';
import type { BulkActionType } from '@/utils/approvalConstants';

export interface BulkGateInput {
  actionType: BulkActionType;
  itemCount: number;
  targetTable?: string;
  targetIds?: string[];
  parameters?: Record<string, unknown>;
}

export interface BulkGateResult {
  canProceed: boolean;
  reason?: 'within_limit' | 'owner_self' | 'approved_passe' | 'requires_approval';
  approvalRequestId?: string;
  consumedApprovalId?: string;
  thresholdValue?: number;
}

export function useBulkActionGate() {
  const { user } = useAuth();
  const { isMember, ownerId } = useWorkspace();

  const check = useCallback(async (input: BulkGateInput): Promise<BulkGateResult> => {
    if (!user?.id) return { canProceed: false, reason: 'requires_approval' };

    // 1) Owner always passes
    if (!isMember) {
      return { canProceed: true, reason: 'owner_self' };
    }

    if (!ownerId) return { canProceed: false, reason: 'requires_approval' };

    // 2) Fetch threshold
    const { data: threshold } = await (supabase as any)
      .from('approval_thresholds')
      .select('threshold, enabled')
      .eq('organization_owner_id', ownerId)
      .eq('action_type', input.actionType)
      .maybeSingle();

    if (!threshold || !threshold.enabled) {
      return { canProceed: true, reason: 'within_limit' };
    }

    // 3) Within limit
    if (input.itemCount <= threshold.threshold) {
      return { canProceed: true, reason: 'within_limit', thresholdValue: threshold.threshold };
    }

    // 4) Check for existing approved request
    const { data: approved } = await (supabase as any)
      .from('approval_requests')
      .select('id, item_count')
      .eq('requested_by', user.id)
      .eq('action_type', input.actionType)
      .eq('status', 'approved')
      .gte('item_count', input.itemCount)
      .order('decided_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (approved) {
      const { data: consumed } = await supabase.rpc('consume_approval' as any, {
        p_request_id: approved.id,
      });

      if (consumed) {
        return {
          canProceed: true,
          reason: 'approved_passe',
          consumedApprovalId: approved.id,
        };
      }
    }

    // 5) Requires approval
    return { canProceed: false, reason: 'requires_approval', thresholdValue: threshold.threshold };
  }, [user?.id, isMember, ownerId]);

  const requestApproval = useCallback(async (
    input: BulkGateInput,
    justification: string
  ): Promise<string> => {
    if (!user?.id || !ownerId) throw new Error('Not authenticated');

    const { data, error } = await (supabase as any)
      .from('approval_requests')
      .insert({
        organization_owner_id: ownerId,
        requested_by: user.id,
        action_type: input.actionType,
        item_count: input.itemCount,
        target_table: input.targetTable ?? null,
        target_ids: input.targetIds ?? [],
        parameters: input.parameters ?? {},
        justification: justification || null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }, [user?.id, ownerId]);

  return { check, requestApproval };
}
