import { useState, useEffect } from "react";
import { subDays, startOfDay } from "date-fns";

const STORAGE_KEY = "finance:reconciliation:dateRange";

interface DateRange {
  from: Date;
  to: Date;
}

function getDefault(): DateRange {
  return {
    from: startOfDay(subDays(new Date(), 30)),
    to: new Date(),
  };
}

export function useReconciliationDateRange() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { from: new Date(parsed.from), to: new Date(parsed.to) };
      }
    } catch {}
    return getDefault();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      }));
    } catch {}
  }, [dateRange]);

  const resetToDefault = () => setDateRange(getDefault());

  return { dateRange, setDateRange, resetToDefault };
}
