import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
}

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const hourOptions = Array.from({ length: 14 }, (_, i) => i + 7).map(h => ({
  value: h.toString(),
  label: `${h.toString().padStart(2, '0')}:00`,
}));

export const EditTaskDialog = ({ task, open, onOpenChange, onSuccess }: EditTaskDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: null as Date | null,
    due_hour: '9',
  });

  useEffect(() => {
    if (task && open) {
      let dueDate: Date | null = null;
      let dueHour = '9';
      
      if (task.due_date) {
        const dateTime = new Date(task.due_date);
        dueDate = dateTime;
        dueHour = dateTime.getHours().toString();
      }

      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority || 'medium',
        due_date: dueDate,
        due_hour: dueHour,
      });
    }
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setIsLoading(true);
    try {
      let dueDateTime: string | null = null;
      
      if (formData.due_date) {
        const dateTime = new Date(formData.due_date);
        dateTime.setHours(parseInt(formData.due_hour), 0, 0, 0);
        dueDateTime = dateTime.toISOString();
      }

      const { error } = await supabase
        .from('deal_tasks')
        .update({
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          due_date: dueDateTime,
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: 'Tarefa atualizada!',
        description: 'As alterações foram salvas.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar tarefa',
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
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Enviar proposta por email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes sobre a tarefa..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Data e Horário de Vencimento
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !formData.due_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formData.due_date
                      ? format(formData.due_date, 'dd/MM/yyyy', { locale: ptBR })
                      : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ?? undefined}
                    onSelect={(date) => setFormData({ ...formData, due_date: date ?? null })}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <Select
                value={formData.due_hour}
                onValueChange={(value) => setFormData({ ...formData, due_hour: value })}
                disabled={!formData.due_date}
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
