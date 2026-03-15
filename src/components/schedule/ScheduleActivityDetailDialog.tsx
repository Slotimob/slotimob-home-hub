import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Loader2, Save, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { ACTIVITY_TYPES } from './ActivityPalette';
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

interface ScheduleActivity {
  id: string;
  activity_type: string;
  title: string;
  description?: string | null;
  scheduled_at: string;
  duration_minutes?: number | null;
  lead_id?: string | null;
  leads?: { name: string; phone: string | null } | null;
}

interface ScheduleActivityDetailDialogProps {
  activity: ScheduleActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const hourOptions = Array.from({ length: 14 }, (_, i) => i + 7).map(h => ({
  value: h.toString(),
  label: `${h.toString().padStart(2, '0')}:00`,
}));

export function ScheduleActivityDetailDialog({
  activity,
  open,
  onOpenChange,
  onSuccess,
}: ScheduleActivityDetailDialogProps) {
  const { toast } = useToast();
  const { isOwner, hasPermission } = usePermissions();
  const canEdit = isOwner || hasPermission('crm_schedule', 'edit');
  const canDelete = isOwner || hasPermission('crm_schedule', 'delete');

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: '',
    title: '',
    description: '',
    scheduled_date: null as Date | null,
    scheduled_hour: '9',
    duration: '30',
  });

  useEffect(() => {
    if (activity && open) {
      const scheduledDate = activity.scheduled_at ? new Date(activity.scheduled_at) : null;
      setFormData({
        activity_type: activity.activity_type,
        title: activity.title,
        description: activity.description || '',
        scheduled_date: scheduledDate,
        scheduled_hour: scheduledDate ? scheduledDate.getHours().toString() : '9',
        duration: (activity.duration_minutes || 30).toString(),
      });
    }
  }, [activity, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity || !canEdit) return;

    setIsLoading(true);
    try {
      let scheduledAt: string | null = null;
      if (formData.scheduled_date) {
        const dt = new Date(formData.scheduled_date);
        dt.setHours(parseInt(formData.scheduled_hour), 0, 0, 0);
        scheduledAt = dt.toISOString();
      }

      const { error } = await supabase
        .from('schedule_activities')
        .update({
          activity_type: formData.activity_type,
          title: formData.title,
          description: formData.description || null,
          scheduled_at: scheduledAt,
          duration_minutes: parseInt(formData.duration),
        })
        .eq('id', activity.id);

      if (error) throw error;

      toast({ title: 'Atividade atualizada!' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!activity) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('schedule_activities')
        .delete()
        .eq('id', activity.id);

      if (error) throw error;

      toast({ title: 'Atividade excluída!' });
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const activityInfo = activity ? ACTIVITY_TYPES.find(a => a.id === activity.activity_type) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {activityInfo && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${activityInfo.color}`}>
                    <activityInfo.icon className="h-4 w-4" />
                  </div>
                )}
                {canEdit ? 'Editar Atividade' : 'Detalhes da Atividade'}
              </DialogTitle>
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSave}>
            <fieldset disabled={!canEdit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(v) => setFormData({ ...formData, activity_type: v })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Agendamento
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'justify-start text-left font-normal',
                          !formData.scheduled_date && 'text-muted-foreground'
                        )}
                        disabled={!canEdit}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.scheduled_date
                          ? format(formData.scheduled_date, 'dd/MM/yyyy', { locale: ptBR })
                          : 'Data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.scheduled_date ?? undefined}
                        onSelect={(date) => setFormData({ ...formData, scheduled_date: date ?? null })}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <Select
                    value={formData.scheduled_hour}
                    onValueChange={(v) => setFormData({ ...formData, scheduled_hour: v })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {hourOptions.map((h) => (
                        <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duração</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(v) => setFormData({ ...formData, duration: v })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h 30min</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activity?.leads && (
                <div className="space-y-2">
                  <Label>Lead vinculado</Label>
                  <Input value={activity.leads.name} disabled />
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </fieldset>

            {canEdit && (
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !formData.title}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </DialogFooter>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A atividade será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
