import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Phone, Mail, MessageSquare, Calendar, MapPin, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AddActivityDialog } from './AddActivityDialog';

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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    </div>
  );
};
