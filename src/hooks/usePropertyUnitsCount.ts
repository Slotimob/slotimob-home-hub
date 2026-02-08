import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnitCount {
  property_id: string;
  count: number;
}

/**
 * Hook to fetch the real unit counts for properties from the units table.
 * Returns a map of property_id -> count for efficient lookups.
 */
export function usePropertyUnitsCount(propertyIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (propertyIds.length === 0) {
      setCounts({});
      setIsLoading(false);
      return;
    }

    const fetchCounts = async () => {
      try {
        // Count units grouped by property_id
        // Only count units that belong to properties (is_standalone = false or null)
        const { data, error } = await supabase
          .from('units')
          .select('property_id')
          .in('property_id', propertyIds)
          .eq('is_standalone', false);

        if (error) throw error;

        // Group and count
        const countMap: Record<string, number> = {};
        propertyIds.forEach(id => { countMap[id] = 0; });
        
        (data || []).forEach((unit) => {
          if (unit.property_id) {
            countMap[unit.property_id] = (countMap[unit.property_id] || 0) + 1;
          }
        });

        setCounts(countMap);
      } catch (error) {
        console.error('Error fetching unit counts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, [propertyIds.join(',')]); // Re-fetch when property list changes

  return { counts, isLoading };
}
