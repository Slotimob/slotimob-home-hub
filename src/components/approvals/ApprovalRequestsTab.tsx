import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ACTION_TYPE_LABELS, type BulkActionType } from '@/utils/approvalConstants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  approved: { label: 'Aprovada', variant: 'default' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
  expired: { label: 'Expirada', variant: 'outline' },
  consumed: { label: 'Consumida', variant: 'outline' },
};

export function ApprovalRequestsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    requestId: string;
    action: 'approved' | 'rejected';
  }>({ open: false, requestId: '', action: 'approved' });
  const [decisionNote, setDecisionNote] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['approval-requests', user?.id, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('approval_requests')
        .select('*')
        .eq('organization_owner_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });

  // Fetch profile names for requesters
  const requesterIds = [...new Set((requests ?? []).map((r: any) => r.requested_by))];
  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-approvals', requesterIds],
    queryFn: async () => {
      if (!requesterIds.length) return {};
      const { data } = await (supabase as any)
        .from('profile_directory')
        .select('id, full_name, email')
        .in('id', requesterIds);
      const map: Record<string, { full_name: string; email: string }> = {};
      (data || []).forEach((p: any) => { map[p.id] = { full_name: p.full_name || '', email: p.email || '' }; });
      return map;
    },
    enabled: requesterIds.length > 0,
  });

  const handleDecision = async () => {
    try {
      setIsDeciding(true);
      const { error } = await (supabase as any)
        .from('approval_requests')
        .update({
          status: decisionDialog.action,
          decided_by: user!.id,
          decided_at: new Date().toISOString(),
          decision_note: decisionNote || null,
        })
        .eq('id', decisionDialog.requestId);

      if (error) throw error;

      toast.success(
        decisionDialog.action === 'approved' ? 'Solicitação aprovada' : 'Solicitação rejeitada',
        { duration: 1000 }
      );
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      setDecisionDialog({ open: false, requestId: '', action: 'approved' });
      setDecisionNote('');
    } catch (error: any) {
      toast.error(error.message, { duration: 1000 });
    } finally {
      setIsDeciding(false);
    }
  };

  const isRecent = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 30 * 60 * 1000; // 30 min
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Solicitações</CardTitle>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="rejected">Rejeitadas</SelectItem>
            <SelectItem value="expired">Expiradas</SelectItem>
            <SelectItem value="consumed">Consumidas</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
        ) : !requests?.length ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Nenhuma solicitação encontrada
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r: any) => {
                  const profile = profiles?.[r.requested_by];
                  const badge = STATUS_BADGES[r.status] ?? STATUS_BADGES.pending;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{profile?.full_name || 'Usuário'}</p>
                          <p className="text-xs text-muted-foreground">{profile?.email || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ACTION_TYPE_LABELS[r.action_type as BulkActionType] || r.action_type}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.item_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {formatDistanceToNow(new Date(r.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                          {r.status === 'pending' && isRecent(r.created_at) && (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {r.justification || '—'}
                      </TableCell>
                      <TableCell>
                        {r.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() =>
                                setDecisionDialog({
                                  open: true,
                                  requestId: r.id,
                                  action: 'approved',
                                })
                              }
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-destructive"
                              onClick={() =>
                                setDecisionDialog({
                                  open: true,
                                  requestId: r.id,
                                  action: 'rejected',
                                })
                              }
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <AlertDialog
          open={decisionDialog.open}
          onOpenChange={(v) => !v && setDecisionDialog({ open: false, requestId: '', action: 'approved' })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {decisionDialog.action === 'approved' ? 'Aprovar solicitação?' : 'Rejeitar solicitação?'}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    {decisionDialog.action === 'approved'
                      ? 'O solicitante poderá executar a ação dentro do prazo de validade.'
                      : 'O solicitante será notificado e precisará criar uma nova solicitação.'}
                  </p>
                  <Textarea
                    placeholder="Observação para o solicitante (opcional)"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeciding}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDecision}
                disabled={isDeciding}
                className={
                  decisionDialog.action === 'rejected'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : ''
                }
              >
                {isDeciding
                  ? 'Processando...'
                  : decisionDialog.action === 'approved'
                    ? 'Confirmar aprovação'
                    : 'Confirmar rejeição'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
