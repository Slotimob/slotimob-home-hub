import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, MapPin, User, Phone, Loader2, Trash2, XCircle, CalendarCheck, BellRing, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useQueryClient } from '@tanstack/react-query';
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
import type { VisitLike } from './DraggableVisit';

interface VisitDetailDialogProps {
  visit: VisitLike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const getStatusColor = (status?: string | null) => {
  switch (status) {
    case 'confirmed': return 'bg-green-500';
    case 'scheduled': return 'bg-blue-500';
    case 'cancelled': return 'bg-red-500';
    case 'completed': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

const getStatusLabel = (status?: string | null) => {
  switch (status) {
    case 'confirmed': return 'Confirmada';
    case 'scheduled': return 'Agendada';
    case 'cancelled': return 'Cancelada';
    case 'completed': return 'Concluída';
    default: return status || '—';
  }
};

export function VisitDetailDialog({ visit, open, onOpenChange, onSuccess }: VisitDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOwner, hasPermission } = usePermissions();
  const canEdit = isOwner || hasPermission('crm_schedule', 'edit');
  const canDelete = isOwner || hasPermission('crm_schedule', 'delete');

  const [loading, setLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!visit) return null;

  const scheduled = new Date(visit.scheduled_at);
  const duration = visit.duration_minutes || 60;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['all-visits'] });
    queryClient.invalidateQueries({ queryKey: ['visits-period'] });
    onSuccess?.();
  };

  const runUpdate = async (label: string, patch: Record<string, any>, close = false) => {
    setLoading(label);
    try {
      const { error } = await supabase.from('visits').update(patch).eq('id', visit.id);
      if (error) throw error;
      toast({ title: 'Visita atualizada' });
      invalidate();
      if (close) onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleConfirm = () => runUpdate('confirm', { status: 'confirmed' });
  const handleComplete = () => runUpdate('complete', { status: 'completed' });
  const handleCancel = async () => {
    setShowCancelConfirm(false);
    await runUpdate('cancel', { status: 'cancelled' }, true);
  };
  const handleToggleLeadConfirmed = () => {
    const next = !visit.lead_confirmed;
    runUpdate('lead', {
      lead_confirmed: next,
      lead_confirmed_at: next ? new Date().toISOString() : null,
    });
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setLoading('delete');
    try {
      const { error } = await supabase.from('visits').delete().eq('id', visit.id);
      if (error) throw error;
      toast({ title: 'Visita excluída' });
      invalidate();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const propertyLabel = visit.properties?.name
    ? `${visit.properties.name}${visit.units?.unit_number ? ` — Un. ${visit.units.unit_number}` : ''}`
    : visit.units?.unit_number
      ? `Imóvel Avulso — Un. ${visit.units.unit_number}`
      : '—';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-orange-500">
                  <MapPin className="h-4 w-4" />
                </div>
                Detalhes da Visita
              </DialogTitle>
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading !== null}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getStatusColor(visit.status)}>{getStatusLabel(visit.status)}</Badge>
              {visit.lead_confirmed && (
                <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Cliente Informado
                </Badge>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{visit.leads?.name || '—'}</span>
              </div>
              {visit.leads?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground pl-6">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{visit.leads.phone}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{propertyLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(scheduled, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • {duration} min
                </span>
              </div>
            </div>

            {canEdit && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                {visit.status === 'scheduled' && (
                  <Button variant="outline" onClick={handleConfirm} disabled={loading !== null}>
                    {loading === 'confirm' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarCheck className="h-4 w-4 mr-2" />}
                    Confirmar
                  </Button>
                )}
                {visit.status !== 'completed' && visit.status !== 'cancelled' && (
                  <Button variant="outline" onClick={handleComplete} disabled={loading !== null}>
                    {loading === 'complete' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Concluir
                  </Button>
                )}
                <Button variant="outline" onClick={handleToggleLeadConfirmed} disabled={loading !== null}>
                  {loading === 'lead' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : visit.lead_confirmed ? (
                    <BellOff className="h-4 w-4 mr-2" />
                  ) : (
                    <BellRing className="h-4 w-4 mr-2" />
                  )}
                  {visit.lead_confirmed ? 'Desmarcar informado' : 'Cliente informado'}
                </Button>
                {visit.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={loading !== null}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar visita
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir visita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A visita será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta visita?</AlertDialogTitle>
            <AlertDialogDescription>
              O status será alterado para "Cancelada". Você pode excluir depois se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Confirmar cancelamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
