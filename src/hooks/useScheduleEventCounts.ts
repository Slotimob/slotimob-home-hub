import { useMemo } from 'react';
import { isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';

interface EventCountMap {
  [dateKey: string]: number;
}

interface UseScheduleEventCountsOptions {
  visits: any[] | undefined;
  activities: any[] | undefined;
  negotiationItems: any[] | undefined;
  currentMonth: Date;
}

export function useScheduleEventCounts({ 
  visits, 
  activities, 
  negotiationItems, 
  currentMonth 
}: UseScheduleEventCountsOptions) {
  const eventCounts = useMemo(() => {
    const counts: EventCountMap = {};
    
    // Helper to add count for a date
    const addToCount = (date: Date) => {
      const key = date.toISOString().split('T')[0];
      counts[key] = (counts[key] || 0) + 1;
    };

    // Count visits
    visits?.forEach((visit: any) => {
      if (visit.scheduled_at) {
        addToCount(new Date(visit.scheduled_at));
      }
    });

    // Count activities
    activities?.forEach((activity: any) => {
      if (activity.scheduled_at) {
        addToCount(new Date(activity.scheduled_at));
      }
    });

    // Count negotiation items (excluding expected_close which should not appear in agenda)
    negotiationItems?.forEach((item: any) => {
      if (item.scheduled_at && item.type !== 'expected_close') {
        addToCount(new Date(item.scheduled_at));
      }
    });

    return counts;
  }, [visits, activities, negotiationItems]);

  const getEventCount = (date: Date): number => {
    const key = date.toISOString().split('T')[0];
    return eventCounts[key] || 0;
  };

  const datesWithEvents = useMemo(() => {
    return Object.keys(eventCounts).map(key => new Date(key));
  }, [eventCounts]);

  return { eventCounts, getEventCount, datesWithEvents };
}
