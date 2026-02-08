import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

export interface NegotiationScheduleItem {
  id: string;
  type: 'activity' | 'task' | 'expected_close';
  title: string;
  description?: string | null;
  scheduled_at: string;
  deal_id: string;
  deal_lead_name: string;
  deal_property_name: string;
  activity_type?: string;
  priority?: string;
  is_completed?: boolean;
}

interface UseNegotiationScheduleItemsOptions {
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'calendar';
}

export function useNegotiationScheduleItems({ selectedDate, viewMode }: UseNegotiationScheduleItemsOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['negotiation-schedule-items', user?.id, selectedDate.toISOString(), viewMode],
    queryFn: async (): Promise<NegotiationScheduleItem[]> => {
      if (!user) return [];

      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'week') {
        startDate = startOfWeek(selectedDate, { weekStartsOn: 0 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 0 });
      } else {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      }

      const items: NegotiationScheduleItem[] = [];

      // Fetch deal activities with scheduled dates
      const { data: activities, error: activitiesError } = await supabase
        .from('deal_activities')
        .select(`
          id,
          title,
          description,
          scheduled_at,
          activity_type,
          completed_at,
          deal_id,
          deals!inner (
            id,
            leads!inner (name),
            properties!inner (name)
          )
        `)
        .eq('broker_id', user.id)
        .not('scheduled_at', 'is', null)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: true });

      if (!activitiesError && activities) {
        activities.forEach((activity: any) => {
          items.push({
            id: activity.id,
            type: 'activity',
            title: activity.title,
            description: activity.description,
            scheduled_at: activity.scheduled_at,
            deal_id: activity.deal_id,
            deal_lead_name: activity.deals?.leads?.name || 'Lead',
            deal_property_name: activity.deals?.properties?.name || 'Imóvel',
            activity_type: activity.activity_type,
            is_completed: !!activity.completed_at,
          });
        });
      }

      // Fetch deal tasks with due dates
      const { data: tasks, error: tasksError } = await supabase
        .from('deal_tasks')
        .select(`
          id,
          title,
          description,
          due_date,
          priority,
          is_completed,
          deal_id,
          deals!inner (
            id,
            leads!inner (name),
            properties!inner (name)
          )
        `)
        .eq('broker_id', user.id)
        .not('due_date', 'is', null)
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (!tasksError && tasks) {
        tasks.forEach((task: any) => {
          // Parse due_date - it now contains time information
          const dueDateTime = new Date(task.due_date);
          
          items.push({
            id: task.id,
            type: 'task',
            title: task.title,
            description: task.description,
            scheduled_at: dueDateTime.toISOString(),
            deal_id: task.deal_id,
            deal_lead_name: task.deals?.leads?.name || 'Lead',
            deal_property_name: task.deals?.properties?.name || 'Imóvel',
            priority: task.priority,
            is_completed: task.is_completed,
          });
        });
      }

      // Fetch deals with expected close dates
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select(`
          id,
          expected_close_date,
          estimated_value,
          leads!inner (name),
          properties!inner (name)
        `)
        .eq('broker_id', user.id)
        .not('expected_close_date', 'is', null)
        .gte('expected_close_date', startDate.toISOString().split('T')[0])
        .lte('expected_close_date', endDate.toISOString().split('T')[0])
        .not('stage', 'in', '("won","lost")');

      if (!dealsError && deals) {
        deals.forEach((deal: any) => {
          const closeDateTime = new Date(deal.expected_close_date);
          closeDateTime.setHours(10, 0, 0, 0);

          items.push({
            id: `close_${deal.id}`,
            type: 'expected_close',
            title: `Previsão de Fechamento`,
            description: deal.estimated_value 
              ? `Valor: R$ ${deal.estimated_value.toLocaleString('pt-BR')}`
              : null,
            scheduled_at: closeDateTime.toISOString(),
            deal_id: deal.id,
            deal_lead_name: deal.leads?.name || 'Lead',
            deal_property_name: deal.properties?.name || 'Imóvel',
          });
        });
      }

      return items.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    },
    enabled: !!user?.id,
  });
}
