import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ACTIVITY_TYPE_LABELS } from '@/components/assets/ActivityFormDialog';

interface CrmRow {
  id: string;
  source: 'pipeline' | 'agenda';
  activity_type: string | null;
  title: string | null;
  description: string | null;
  date: string | null;
}

const SOURCE_LABEL: Record<CrmRow['source'], string> = {
  pipeline: 'Negociação',
  agenda: 'Agenda',
};

/**
 * Read-only commercial history (CRM) for a unit.
 * Renders nothing when there is no `deal_activities` / `schedule_activities` row.
 */
export function UnitCrmHistoryCard({ unitId }: { unitId?: string }) {
  const [open, setOpen] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ['unit-crm-history', unitId],
    enabled: !!unitId,
    staleTime: 60_000,
    queryFn: async (): Promise<CrmRow[]> => {
      const { data: deals } = await supabase.from('deals').select('id').eq('unit_id', unitId!);
      const dealIds = (deals || []).map((d) => d.id);

      const [dealActs, scheduleActs] = await Promise.all([
        dealIds.length
          ? supabase
              .from('deal_activities')
              .select('id, title, description, activity_type, scheduled_at, created_at')
              .in('deal_id', dealIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('schedule_activities')
          .select('id, title, description, activity_type, scheduled_at, created_at')
          .eq('unit_id', unitId!)
          .order('scheduled_at', { ascending: false }),
      ]);

      const mapped: CrmRow[] = [
        ...((dealActs.data || []) as any[]).map((r) => ({
          id: r.id,
          source: 'pipeline' as const,
          activity_type: r.activity_type,
          title: r.title,
          description: r.description,
          date: r.scheduled_at || r.created_at,
        })),
        ...((scheduleActs.data || []) as any[]).map((r) => ({
          id: r.id,
          source: 'agenda' as const,
          activity_type: r.activity_type,
          title: r.title,
          description: r.description,
          date: r.scheduled_at || r.created_at,
        })),
      ];

      return mapped.sort(
        (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
      );
    },
  });

  if (!unitId || rows.length === 0) return null;

  const renderDate = (value: string | null) => {
    if (!value) return '—';
    try {
      return format(parseISO(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '—';
    }
  };

  return (
    <Card>
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <History className="h-4 w-4 text-muted-foreground" />
          Histórico comercial (CRM)
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {rows.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Registros somente leitura vindos da negociação e da agenda.
          </p>
          {rows.map((row) => (
            <div
              key={`${row.source}-${row.id}`}
              className="flex items-start gap-3 rounded-md border p-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[11px] font-medium leading-tight">
                    {row.title || 'Atividade'}
                  </p>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    {row.activity_type
                      ? ACTIVITY_TYPE_LABELS[row.activity_type] || row.activity_type
                      : '—'}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {SOURCE_LABEL[row.source]}
                  </Badge>
                </div>
                {row.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {row.description}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {renderDate(row.date)}
              </span>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export default UnitCrmHistoryCard;
