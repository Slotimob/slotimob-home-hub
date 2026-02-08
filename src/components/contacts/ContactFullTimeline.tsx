import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  GitCommitHorizontal,
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  MapPin, 
  FileText, 
  Loader2, 
  Clock,
  Briefcase,
  Home,
  CheckCircle,
  XCircle,
  ArrowRight,
  User
} from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimelineEvent {
  id: string;
  type: 'deal_created' | 'deal_stage_change' | 'activity' | 'visit' | 'message' | 'lead_created';
  title: string;
  description?: string | null;
  timestamp: string;
  metadata?: {
    property_name?: string;
    stage?: string;
    from_stage?: string;
    to_stage?: string;
    activity_type?: string;
    visit_status?: string;
    message_direction?: string;
    estimated_value?: number;
  };
}

interface ContactFullTimelineProps {
  leadId: string;
  leadName: string;
  leadCreatedAt?: string;
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'Novo Lead',
  in_contact: 'Em Contato',
  visit_scheduled: 'Visita Agendada',
  proposal: 'Proposta',
  won: 'Ganho',
  lost: 'Perdido',
};

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

const visitStatusLabels: Record<string, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Realizada',
};

const getEventIcon = (event: TimelineEvent) => {
  switch (event.type) {
    case 'deal_created':
      return Briefcase;
    case 'deal_stage_change':
      if (event.metadata?.to_stage === 'won') return CheckCircle;
      if (event.metadata?.to_stage === 'lost') return XCircle;
      return ArrowRight;
    case 'activity':
      return activityIcons[event.metadata?.activity_type || 'note'] || FileText;
    case 'visit':
      return MapPin;
    case 'message':
      return MessageSquare;
    case 'lead_created':
      return User;
    default:
      return Clock;
  }
};

const getEventColor = (event: TimelineEvent) => {
  switch (event.type) {
    case 'deal_created':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'deal_stage_change':
      if (event.metadata?.to_stage === 'won') return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30';
      if (event.metadata?.to_stage === 'lost') return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';
      return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
    case 'activity':
      const activityType = event.metadata?.activity_type;
      if (activityType === 'call') return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
      if (activityType === 'email') return 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30';
      if (activityType === 'whatsapp') return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30';
      if (activityType === 'meeting') return 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30';
      return 'bg-muted text-muted-foreground border-muted-foreground/30';
    case 'visit':
      const status = event.metadata?.visit_status;
      if (status === 'completed') return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30';
      if (status === 'cancelled') return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';
      return 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
    case 'message':
      return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30';
    case 'lead_created':
      return 'bg-primary/20 text-primary border-primary/30';
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/30';
  }
};

const formatGroupDate = (date: Date) => {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  if (isThisWeek(date)) return format(date, "EEEE", { locale: ptBR });
  if (isThisMonth(date)) return format(date, "d 'de' MMMM", { locale: ptBR });
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
};

export const ContactFullTimeline = ({ leadId, leadName, leadCreatedAt }: ContactFullTimelineProps) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const allEvents: TimelineEvent[] = [];

      // Add lead created event
      if (leadCreatedAt) {
        allEvents.push({
          id: `lead-created-${leadId}`,
          type: 'lead_created',
          title: 'Lead cadastrado',
          description: `${leadName} foi adicionado como contato.`,
          timestamp: leadCreatedAt,
        });
      }

      // Get all deals for this lead
      const { data: deals } = await supabase
        .from('deals')
        .select(`
          id,
          created_at,
          stage,
          estimated_value,
          property:properties(name)
        `)
        .eq('lead_id', leadId);

      if (deals && deals.length > 0) {
        // Add deal created events
        deals.forEach(deal => {
          allEvents.push({
            id: `deal-${deal.id}`,
            type: 'deal_created',
            title: 'Deal criado',
            description: deal.property?.name ? `Negociação iniciada para ${deal.property.name}` : 'Nova negociação iniciada',
            timestamp: deal.created_at,
            metadata: {
              property_name: deal.property?.name,
              estimated_value: deal.estimated_value,
            },
          });
        });

        const dealIds = deals.map(d => d.id);

        // Get deal activities
        const { data: activities } = await supabase
          .from('deal_activities')
          .select(`
            id,
            activity_type,
            title,
            description,
            created_at,
            deal:deals(property:properties(name))
          `)
          .in('deal_id', dealIds)
          .order('created_at', { ascending: false });

        if (activities) {
          activities.forEach(activity => {
            allEvents.push({
              id: `activity-${activity.id}`,
              type: 'activity',
              title: activity.title,
              description: activity.description,
              timestamp: activity.created_at,
              metadata: {
                activity_type: activity.activity_type,
                property_name: activity.deal?.property?.name,
              },
            });
          });
        }

        // Get deal stage history
        const { data: stageHistory } = await supabase
          .from('deal_stage_history')
          .select(`
            id,
            from_stage,
            to_stage,
            changed_at,
            notes,
            deal:deals(property:properties(name))
          `)
          .in('deal_id', dealIds)
          .order('changed_at', { ascending: false });

        if (stageHistory) {
          stageHistory.forEach(history => {
            allEvents.push({
              id: `stage-${history.id}`,
              type: 'deal_stage_change',
              title: 'Mudança de estágio',
              description: history.notes || `${STAGE_LABELS[history.from_stage || ''] || history.from_stage || 'Início'} → ${STAGE_LABELS[history.to_stage] || history.to_stage}`,
              timestamp: history.changed_at,
              metadata: {
                from_stage: history.from_stage,
                to_stage: history.to_stage,
                property_name: history.deal?.property?.name,
              },
            });
          });
        }
      }

      // Get visits
      const { data: visits } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_at,
          status,
          notes,
          property:properties(name),
          unit:units(unit_number)
        `)
        .eq('lead_id', leadId)
        .order('scheduled_at', { ascending: false });

      if (visits) {
        visits.forEach(visit => {
          const propertyInfo = visit.property?.name || 'Imóvel';
          const unitInfo = visit.unit?.unit_number ? ` - Unidade ${visit.unit.unit_number}` : '';
          allEvents.push({
            id: `visit-${visit.id}`,
            type: 'visit',
            title: `Visita ${visitStatusLabels[visit.status] || visit.status}`,
            description: `${propertyInfo}${unitInfo}${visit.notes ? ` - ${visit.notes}` : ''}`,
            timestamp: visit.scheduled_at,
            metadata: {
              visit_status: visit.status,
              property_name: visit.property?.name,
            },
          });
        });
      }

      // Sort all events by timestamp descending
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadTimeline();
    }
  };

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const date = new Date(event.timestamp);
    const key = format(date, 'yyyy-MM-dd');
    if (!groups[key]) {
      groups[key] = { date, events: [] };
    }
    groups[key].events.push(event);
    return groups;
  }, {} as Record<string, { date: Date; events: TimelineEvent[] }>);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitCommitHorizontal className="h-4 w-4" />
          Timeline Completa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GitCommitHorizontal className="h-5 w-5" />
            Timeline de Interações - {leadName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma interação registrada</h3>
            <p className="text-muted-foreground">
              As interações aparecerão aqui quando você adicionar deals, visitas ou atividades.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([key, { date, events: dayEvents }]) => (
                <div key={key}>
                  <div className="sticky top-0 z-10 bg-background py-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="capitalize font-medium">
                        {formatGroupDate(date)}
                      </Badge>
                      <Separator className="flex-1" />
                    </div>
                  </div>

                  <div className="relative pl-6 mt-3">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-border" />

                    <div className="space-y-4">
                      {dayEvents.map((event, index) => {
                        const Icon = getEventIcon(event);
                        const colorClass = getEventColor(event);
                        
                        return (
                          <div key={event.id} className="relative flex gap-4">
                            {/* Timeline dot */}
                            <div className={`absolute -left-6 p-1.5 rounded-full border-2 bg-background ${colorClass}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>

                            {/* Event card */}
                            <div className="flex-1 ml-2 p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{event.title}</span>
                                    {event.type === 'activity' && event.metadata?.activity_type && (
                                      <Badge variant="outline" className="text-xs">
                                        {activityLabels[event.metadata.activity_type] || event.metadata.activity_type}
                                      </Badge>
                                    )}
                                    {event.type === 'deal_stage_change' && event.metadata?.to_stage && (
                                      <Badge 
                                        variant={event.metadata.to_stage === 'won' ? 'default' : event.metadata.to_stage === 'lost' ? 'destructive' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {STAGE_LABELS[event.metadata.to_stage] || event.metadata.to_stage}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {event.metadata?.property_name && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                      <Home className="h-3 w-3" />
                                      {event.metadata.property_name}
                                    </div>
                                  )}
                                  
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                                      {event.description}
                                    </p>
                                  )}

                                  {event.metadata?.estimated_value && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(event.metadata.estimated_value)}
                                    </p>
                                  )}
                                </div>

                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(event.timestamp), 'HH:mm')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
