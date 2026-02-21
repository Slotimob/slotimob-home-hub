import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Mail, Phone, Tag, Plus, Calendar, StickyNote,
  PhoneCall, FileText, MessageCircle, TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MockContactDetail } from './mockData';

interface CrmContextPanelProps {
  contact: MockContactDetail | null;
  onCreateDeal?: () => void;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'visit': return <Calendar className="h-3.5 w-3.5 text-primary" />;
    case 'note': return <StickyNote className="h-3.5 w-3.5 text-amber-500" />;
    case 'call': return <PhoneCall className="h-3.5 w-3.5 text-green-500" />;
    case 'proposal': return <FileText className="h-3.5 w-3.5 text-blue-500" />;
    case 'message': return <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    default: return <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function CrmContextPanel({ contact, onCreateDeal }: CrmContextPanelProps) {
  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-6">
        <p className="text-sm text-center">Selecione uma conversa para ver os detalhes do CRM</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Contact Info */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{contact.name}</h3>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{contact.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Deal Section */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Negociação Atual
          </h4>

          {contact.deal ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 space-y-2">
                <p className="font-medium text-sm text-foreground">{contact.deal.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    {contact.deal.stage}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Valor</span>
                    <p className="font-semibold text-foreground">
                      {contact.deal.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Previsão</span>
                    <p className="font-semibold text-foreground">
                      {format(new Date(contact.deal.expectedCloseDate), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 gap-2"
              onClick={onCreateDeal}
            >
              <Plus className="h-4 w-4" />
              Criar Negociação
            </Button>
          )}
        </div>

        <Separator />

        {/* Activities Timeline */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Últimas Atividades
          </h4>

          <div className="space-y-0">
            {contact.activities.map((activity, idx) => (
              <div key={activity.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-7 w-7 rounded-full bg-muted/80 flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  {idx < contact.activities.length - 1 && (
                    <div className="w-px flex-1 bg-border my-1" />
                  )}
                </div>
                <div className="pb-4 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">{activity.description}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(activity.date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {contact.activities.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
