import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface LeadPipelineTagProps {
  leadId: string;
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'Novo Lead',
  in_contact: 'Em Contato',
  visit_scheduled: 'Visita Agendada',
  proposal: 'Proposta',
  won: 'Ganho',
  lost: 'Perdido',
};

const STAGE_COLORS: Record<string, string> = {
  new_lead: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  in_contact: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  visit_scheduled: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  proposal: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  won: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  lost: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};

export const LeadPipelineTag = ({ leadId }: LeadPipelineTagProps) => {
  const [mainStage, setMainStage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMainStage = async () => {
      try {
        const { data, error } = await supabase
          .from('deals')
          .select('stage')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setMainStage(data?.stage || null);
      } catch (error) {
        console.error('Error loading lead stage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMainStage();
  }, [leadId]);

  if (loading) {
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  }

  if (!mainStage) {
    return (
      <Badge variant="outline" className="text-xs bg-muted/50">
        Sem Pipeline
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`text-xs font-medium ${STAGE_COLORS[mainStage] || ''}`}
    >
      {STAGE_LABELS[mainStage] || mainStage}
    </Badge>
  );
};

export const PIPELINE_STAGES = [
  { value: 'new_lead', label: 'Novo Lead' },
  { value: 'in_contact', label: 'Em Contato' },
  { value: 'visit_scheduled', label: 'Visita Agendada' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'won', label: 'Ganho' },
  { value: 'lost', label: 'Perdido' },
];
