import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Phone, Mail, MessageSquare, Calendar as CalendarIcon, MapPin, FileText, Loader2, Clock, FileSignature } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
}

interface EditActivityDialogProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const activityTypes = [
  { value: 'call', label: 'Ligação', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'meeting', label: 'Reunião', icon: CalendarIcon },
  { value: 'visit', label: 'Visita', icon: MapPin },
  { value: 'proposal', label: 'Proposta', icon: FileSignature },
  { value: 'note', label: 'Nota', icon: FileText },
];

const hourOptions = Array.from({ length: 14 }, (_, i) => i + 7).map(h => ({
  value: h.toString(),
  label: `${h.toString().padStart(2, '0')}:00`,
}));

export const EditActivityDialog = ({ activity, open, onOpenChange, onSuccess }: EditActivityDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: 'note',
    title: '',
    description: '',
    scheduled_date: null as Date | null,
    scheduled_hour: '9',
  });

  useEffect(() => {
    if (activity && open) {
      let scheduledDate: Date | null = null;
      let scheduledHour = '9';
      
      if (activity.scheduled_at) {
        const dateTime = new Date(activity.scheduled_at);
        scheduledDate = dateTime;
        scheduledHour = dateTime.getHours().toString();
      }

      setFormData({
        activity_type: activity.activity_type,
        title: activity.title,
        description: activity.description || '',
        scheduled_date: scheduledDate,
        scheduled_hour: scheduledHour,
      });
    }
  }, [activity, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity) return;

    setIsLoading(true);
    try {
      let scheduledAt: string | null = null;
      
      if (formData.scheduled_date) {
        const dateTime = new Date(formData.scheduled_date);
        dateTime.setHours(parseInt(formData.scheduled_hour), 0, 0, 0);
        scheduledAt = dateTime.toISOString();
      }

      const { error } = await supabase
        .from('deal_activities')
        .update({
          activity_type: formData.activity_type,
          title: formData.title,
          description: formData.description || null,
          scheduled_at: scheduledAt,
        })
        .eq('id', activity.id);

      if (error) throw error;

      toast({
        title: 'Atividade atualizada!',
        description: 'As alterações foram salvas.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar atividade',
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
          <DialogTitle>Editar Atividade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Atividade</Label>
            <Select
              value={formData.activity_type}
              onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Ligação para apresentar proposta"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Agendar (opcional - aparece na Agenda)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !formData.scheduled_date && 'text-muted-foreground'
                    )}
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
                onValueChange={(value) => setFormData({ ...formData, scheduled_hour: value })}
                disabled={!formData.scheduled_date}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.scheduled_date && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setFormData({ ...formData, scheduled_date: null })}
              >
                Remover agendamento
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes sobre a atividade..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
