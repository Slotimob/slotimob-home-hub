import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ACTION_TYPE_LABELS, type BulkActionType } from '@/utils/approvalConstants';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ApprovalStatusBanner() {
  const { user } = useAuth();
  const { isMember } = useWorkspace();

  const { data: requests } = useQuery({
    queryKey: ['my-approval-requests', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('approval_requests')
        .select('id, action_type, item_count, status, created_at, decision_note')
        .eq('requested_by', user!.id)
        .in('status', ['pending', 'approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user?.id && isMember,
    refetchInterval: 30000,
  });

  if (!requests?.length) return null;

  const statusConfig = {
    pending: { icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', label: 'Pendente' },
    approved: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Aprovada' },
    rejected: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Rejeitada' },
  };

  return (
    <div className="border-b bg-muted/30 px-4 py-2">
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="font-medium text-muted-foreground">Suas solicitações:</span>
        {requests.map((r) => {
          const cfg = statusConfig[r.status as keyof typeof statusConfig];
          if (!cfg) return null;
          const Icon = cfg.icon;
          const label = ACTION_TYPE_LABELS[r.action_type as BulkActionType] || r.action_type;
          return (
            <Badge key={r.id} variant="outline" className={`gap-1 ${cfg.color}`}>
              <Icon className="h-3 w-3" />
              {label} ({r.item_count}) — {cfg.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
