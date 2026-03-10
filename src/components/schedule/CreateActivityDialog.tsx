import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/hooks/useWorkspace';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { ACTIVITY_TYPES } from './ActivityPalette';

interface CreateActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityType: string;
  scheduledDate: Date;
  scheduledHour: number;
  onSuccess: () => void;
}

export function CreateActivityDialog({
  open,
  onOpenChange,
  activityType,
  scheduledDate,
  scheduledHour,
  onSuccess,
}: CreateActivityDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [duration, setDuration] = useState('30');

  const { data: leads } = useQuery({
    queryKey: ['leads-for-activity', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const activityInfo = ACTIVITY_TYPES.find((a) => a.id === activityType);

  // Se não encontrar o tipo de atividade, fecha o dialog
  if (!activityInfo && open) {
    onOpenChange(false);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return;

    setIsLoading(true);
    try {
      const scheduledAt = new Date(scheduledDate);
      scheduledAt.setHours(scheduledHour, 0, 0, 0);

      const { error } = await supabase.from('schedule_activities').insert({
        broker_id: user.id,
        activity_type: activityType,
        title,
        description: description || null,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(duration),
        lead_id: selectedLeadId && selectedLeadId !== 'none' ? selectedLeadId : null,
      });

      if (error) throw error;

      toast({
        title: 'Atividade criada',
        description: 'A atividade foi agendada com sucesso.',
      });
      
      onSuccess();
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setSelectedLeadId('');
    } catch (error: any) {
      toast({
        title: 'Erro ao criar atividade',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activityInfo && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${activityInfo.color}`}>
                <activityInfo.icon className="h-4 w-4" />
              </div>
            )}
            Nova {activityInfo?.label || 'Atividade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Data e Hora</Label>
            <Input
              value={`${format(scheduledDate, 'dd/MM/yyyy')} às ${scheduledHour.toString().padStart(2, '0')}:00`}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ligar para cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead">Lead (opcional)</Label>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {leads?.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duração (minutos)</Label>
            <Select value={duration} onValueChange={setDuration}>
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

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes da atividade..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !title}>
              {isLoading ? 'Salvando...' : 'Criar Atividade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
