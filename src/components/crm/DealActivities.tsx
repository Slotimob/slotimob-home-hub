import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Plus, Phone, Mail, MessageSquare, Calendar, MapPin, FileText, Loader2, MoreVertical, Pencil, Trash2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AddActivityDialog } from './AddActivityDialog';
import { EditActivityDialog } from './EditActivityDialog';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface DealActivitiesProps {
  dealId: string;
}

const activityIcons: Record<string, any> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  meeting: Calendar,
  visit: MapPin,
  note: FileText,
};

const activityLabels: Record<string, string> = {
  call: 'Ligação',
  email: 'Email',
  whatsapp: 'WhatsApp',
  meeting: 'Reunião',
  visit: 'Visita',
  note: 'Nota',
};

const activityColors: Record<string, string> = {
  call: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  email: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  whatsapp: 'bg-green-500/20 text-green-700 dark:text-green-400',
  meeting: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  visit: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
  note: 'bg-muted text-muted-foreground',
};

export const DealActivities = ({ dealId }: DealActivitiesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOwner, hasPermission } = usePermissions();
  const canEdit = isOwner || hasPermission('crm_pipeline', 'edit');
  const canDelete = isOwner || hasPermission('crm_pipeline', 'delete');
  const canCreate = isOwner || hasPermission('crm_pipeline', 'create');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar atividades',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [dealId]);

  const handleDelete = async () => {
    if (!deletingActivityId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('deal_activities')
        .delete()
        .eq('id', deletingActivityId);

      if (error) throw error;

      toast({
        title: 'Atividade excluída!',
        description: 'A atividade foi removida.',
      });

      loadActivities();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir atividade',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeletingActivityId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Histórico de Atividades</h3>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Atividade
        </Button>
      </div>

      <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>Atividades com data/hora agendados aparecerão automaticamente na Agenda.</span>
      </div>

      {activities.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade registrada ainda.
          </p>
          <Button variant="link" size="sm" onClick={() => setIsDialogOpen(true)}>
            Registrar primeira atividade
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.activity_type] || FileText;
            return (
              <Card key={activity.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${activityColors[activity.activity_type] || activityColors.note}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{activity.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {activityLabels[activity.activity_type] || activity.activity_type}
                      </Badge>
                      {activity.scheduled_at && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(activity.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </Badge>
                      )}
                    </div>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(activity.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingActivity(activity)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeletingActivityId(activity.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddActivityDialog
        dealId={dealId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadActivities}
      />

      <EditActivityDialog
        activity={editingActivity}
        open={!!editingActivity}
        onOpenChange={(open) => !open && setEditingActivity(null)}
        onSuccess={loadActivities}
      />

      <AlertDialog open={!!deletingActivityId} onOpenChange={(open) => !open && setDeletingActivityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A atividade será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
