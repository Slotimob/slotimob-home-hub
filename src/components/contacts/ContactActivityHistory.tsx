import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Phone, Mail, MessageSquare, Calendar, MapPin, FileText, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  deal_id: string;
  deal?: { 
    property: { name: string } | null;
  } | null;
}

interface ContactActivityHistoryProps {
  leadId: string;
  leadName: string;
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

export const ContactActivityHistory = ({ leadId, leadName }: ContactActivityHistoryProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activityCount, setActivityCount] = useState(0);

  useEffect(() => {
    // Load count on mount
    const loadCount = async () => {
      const { data: deals } = await supabase
        .from('deals')
        .select('id')
        .eq('lead_id', leadId);

      if (deals && deals.length > 0) {
        const dealIds = deals.map(d => d.id);
        const { count } = await supabase
          .from('deal_activities')
          .select('*', { count: 'exact', head: true })
          .in('deal_id', dealIds);
        
        setActivityCount(count || 0);
      }
    };
    loadCount();
  }, [leadId]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      // First get all deals for this lead
      const { data: deals } = await supabase
        .from('deals')
        .select('id')
        .eq('lead_id', leadId);

      if (!deals || deals.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const dealIds = deals.map(d => d.id);

      // Then get all activities for those deals
      const { data: activitiesData, error } = await supabase
        .from('deal_activities')
        .select(`
          id,
          activity_type,
          title,
          description,
          created_at,
          deal_id,
          deal:deals(property:properties(name))
        `)
        .in('deal_id', dealIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadActivities();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs">
          <History className="h-3.5 w-3.5" />
          {activityCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {activityCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Atividades - {leadName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma atividade registrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              As atividades são registradas nos deals vinculados a este lead.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.activity_type] || FileText;
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
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
                      {activity.deal?.property?.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Imóvel: {activity.deal.property.name}
                        </p>
                      )}
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
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
