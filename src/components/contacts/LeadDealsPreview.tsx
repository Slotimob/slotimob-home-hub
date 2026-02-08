import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Deal {
  id: string;
  stage: string;
  custom_stage_id: string | null;
  estimated_value: number | null;
  property: { name: string } | null;
}

interface LeadDealsPreviewProps {
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

export const LeadDealsPreview = ({ leadId }: LeadDealsPreviewProps) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDeals = async () => {
      try {
        const { data, error } = await supabase
          .from('deals')
          .select('id, stage, custom_stage_id, estimated_value, property:properties(name)')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setDeals(data || []);
      } catch (error) {
        console.error('Error loading deals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex items-center gap-1 pt-2">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Carregando deals...</span>
      </div>
    );
  }

  if (deals.length === 0) {
    return null;
  }

  const formatValue = (value: number | null) => {
    if (!value) return null;
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  return (
    <div className="pt-2 border-t border-border mt-2">
      <div className="flex items-center gap-1 mb-2">
        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {deals.length} deal{deals.length !== 1 ? 's' : ''} vinculado{deals.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        <TooltipProvider>
          {deals.map((deal) => (
            <Tooltip key={deal.id}>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`text-xs cursor-default ${STAGE_COLORS[deal.stage] || ''}`}
                >
                  {STAGE_LABELS[deal.stage] || deal.stage}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-medium">{deal.property?.name || 'Sem imóvel'}</p>
                  {deal.estimated_value && (
                    <p className="text-muted-foreground">{formatValue(deal.estimated_value)}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
};
