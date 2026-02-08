import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CalendarDays, Loader2, AlertTriangle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AddTaskDialog } from './AddTaskDialog';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface DealTasksProps {
  dealId: string;
}

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  high: 'bg-destructive/20 text-destructive',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export const DealTasks = ({ dealId }: DealTasksProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_tasks')
        .select('*')
        .eq('deal_id', dealId)
        .order('is_completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar tarefas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [dealId]);

  const toggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('deal_tasks')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', taskId);

      if (error) throw error;
      loadTasks();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar tarefa',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isOverdue = (dueDate: string | null, isCompleted: boolean) => {
    if (!dueDate || isCompleted) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => t.is_completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Tarefas e Follow-ups</h3>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Tarefa
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma tarefa cadastrada ainda.
          </p>
          <Button variant="link" size="sm" onClick={() => setIsDialogOpen(true)}>
            Criar primeira tarefa
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Pendentes ({pendingTasks.length})
              </p>
              {pendingTasks.map((task) => {
                const overdue = isOverdue(task.due_date, task.is_completed);
                return (
                  <Card key={task.id} className={`p-3 ${overdue ? 'border-destructive/50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={(checked) => toggleTask(task.id, checked as boolean)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{task.title}</span>
                          <Badge className={priorityColors[task.priority]}>
                            {priorityLabels[task.priority]}
                          </Badge>
                          {overdue && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Atrasada
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        {task.due_date && (
                          <div className={`flex items-center gap-1 mt-2 text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            <CalendarDays className="h-3 w-3" />
                            {isToday(new Date(task.due_date))
                              ? 'Hoje'
                              : format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Concluídas ({completedTasks.length})
              </p>
              {completedTasks.map((task) => (
                <Card key={task.id} className="p-3 opacity-60">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={(checked) => toggleTask(task.id, checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm line-through">{task.title}</span>
                      {task.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Concluída em {format(new Date(task.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <AddTaskDialog
        dealId={dealId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadTasks}
      />
    </div>
  );
};
