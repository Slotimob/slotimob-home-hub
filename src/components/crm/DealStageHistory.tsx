import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StageHistoryEntry {
  id: string;
  from_stage: string | null;
  to_stage: string;
  changed_at: string;
  notes: string | null;
}

interface DealStageHistoryProps {
  dealId: string;
}

const stageLabels: Record<string, string> = {
  new_lead: 'Novo Lead',
  in_contact: 'Em Contato',
  visit_scheduled: 'Visita Agendada',
  proposal: 'Proposta',
  lost: 'Perdido',
  won: 'Ganho',
};

const stageColors: Record<string, string> = {
  new_lead: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  in_contact: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  visit_scheduled: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  proposal: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  lost: 'bg-destructive/20 text-destructive',
  won: 'bg-green-500/20 text-green-700 dark:text-green-400',
};

export const DealStageHistory = ({ dealId }: DealStageHistoryProps) => {
  const { toast } = useToast();
  const [history, setHistory] = useState<StageHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_stage_history')
        .select('*')
        .eq('deal_id', dealId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
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
      <h3 className="font-medium text-sm">Histórico de Etapas</h3>

      {history.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma movimentação registrada ainda.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <Card key={entry.id} className="p-3">
              <div className="flex items-center gap-3 flex-wrap">
                {entry.from_stage && (
                  <>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${stageColors[entry.from_stage] || 'bg-muted'}`}>
                      {stageLabels[entry.from_stage] || entry.from_stage}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </>
                )}
                <span className={`px-2 py-1 rounded text-xs font-medium ${stageColors[entry.to_stage] || 'bg-muted'}`}>
                  {stageLabels[entry.to_stage] || entry.to_stage}
                </span>
              </div>
              {entry.notes && (
                <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {format(new Date(entry.changed_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
