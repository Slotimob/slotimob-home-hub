import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  MapPin, 
  FileText,
  CheckSquare,
  Target,
  Clock,
  User,
  Send,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { NegotiationScheduleItem } from '@/hooks/useNegotiationScheduleItems';

interface NegotiationScheduleCardProps {
  item: NegotiationScheduleItem;
  onClick?: () => void;
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  meeting: Calendar,
  visit: MapPin,
  note: FileText,
};

const activityColors: Record<string, string> = {
  call: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30',
  email: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30',
  whatsapp: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
  meeting: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
  visit: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
  note: 'bg-muted text-muted-foreground border-muted',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  high: 'bg-destructive/20 text-destructive',
};

export function NegotiationScheduleCard({ item, onClick }: NegotiationScheduleCardProps) {
  const { toast } = useToast();
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const handleSendWhatsAppConfirmation = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSendingWhatsApp(true);
    try {
      const dateStr = format(new Date(item.scheduled_at), "dd/MM/yyyy", { locale: ptBR });
      const timeStr = format(new Date(item.scheduled_at), "HH:mm", { locale: ptBR });
      const message = `Olá ${item.deal_lead_name}, confirmo nossa visita ao imóvel ${item.deal_property_name} no dia ${dateStr} às ${timeStr}. Podemos confirmar?`;

      // Find the conversation for this lead
      const { data: conversations } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('contact_name', item.deal_lead_name)
        .limit(1);

      if (!conversations || conversations.length === 0) {
        toast({ title: 'Conversa não encontrada', description: 'Nenhuma conversa WhatsApp vinculada a esse lead.', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId: conversations[0].id,
          messageType: 'text',
          content: message,
        },
      });

      if (error) throw error;
      toast({ title: 'Confirmação enviada!', description: 'Mensagem de confirmação enviada via WhatsApp.' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setSendingWhatsApp(false);
    }
  }, [item, toast]);
  const getIcon = () => {
    if (item.type === 'task') return CheckSquare;
    if (item.type === 'expected_close') return Target;
    return activityIcons[item.activity_type || 'note'] || FileText;
  };

  const getTypeLabel = () => {
    if (item.type === 'task') return 'Tarefa';
    if (item.type === 'expected_close') return 'Fechamento';
    return 'Atividade';
  };

  const getCardStyle = () => {
    if (item.is_completed) return 'opacity-60';
    if (item.type === 'expected_close') return 'border-primary/50 bg-primary/5';
    if (item.type === 'task' && item.priority) {
      return priorityColors[item.priority] || '';
    }
    if (item.type === 'activity' && item.activity_type) {
      return activityColors[item.activity_type] || '';
    }
    return '';
  };

  const Icon = getIcon();

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md relative overflow-hidden',
        getCardStyle()
      )}
      onClick={onClick}
    >
      {/* Negotiation indicator stripe */}
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      
      <CardContent className="p-4 pl-5">
        {/* Header with negotiation badge */}
        <div className="flex items-center gap-2 mb-3">
          <Badge 
            variant="secondary" 
            className="gap-1 text-xs bg-primary/10 text-primary border-primary/20"
          >
            <Briefcase className="h-3 w-3" />
            Negociação
          </Badge>
          <Badge variant="outline" className="text-xs">
            {getTypeLabel()}
          </Badge>
          {item.is_completed && (
            <Badge variant="secondary" className="text-xs bg-muted">
              Concluído
            </Badge>
          )}
        </div>

        {/* Time and Icon */}
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-full flex-shrink-0',
            item.type === 'expected_close' 
              ? 'bg-primary/20 text-primary' 
              : 'bg-muted'
          )}>
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">
                {format(new Date(item.scheduled_at), "HH:mm", { locale: ptBR })}
              </span>
            </div>
            
            <h4 className={cn(
              'font-semibold text-sm mt-1 truncate',
              item.is_completed && 'line-through'
            )}>
              {item.title}
            </h4>
            
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Lead and Property info */}
        <div className="mt-3 pt-3 border-t space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate font-medium">{item.deal_lead_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{item.deal_property_name}</span>
          </div>
          {/* WhatsApp confirmation button */}
          {!item.is_completed && (item.activity_type === 'visit' || item.type === 'task') && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2 gap-1.5 text-xs border-green-500/40 text-green-600 hover:bg-green-500/10 dark:text-green-400"
              onClick={handleSendWhatsAppConfirmation}
              disabled={sendingWhatsApp}
            >
              {sendingWhatsApp ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Enviar Confirmação WhatsApp
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
