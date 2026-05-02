import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardScope, type RentalScope } from '@/hooks/useDashboardScope';
import { differenceInDays } from 'date-fns';

export interface RentalMetricsOutput {
  received: { amount: number; count: number };
  receivable: { amount: number; count: number };
  overdue: {
    amount: number;
    count: number;
    buckets: {
      bucket_0_15: { amount: number; count: number };
      bucket_16_30: { amount: number; count: number };
      bucket_31_60: { amount: number; count: number };
      bucket_60_plus: { amount: number; count: number };
    };
  };
  properties_with_open_rentals: Array<{
    property_id: string | null;
    unit_id: string | null;
    property_name: string;
    unit_label: string | null;
    total_open: number;
    oldest_due_date: string;
    transactions_count: number;
  }>;
}

function fmt(d: Date) {
  return d.toISOString().split('T')[0];
}

export function useRentalMetrics(params: {
  from: Date;
  to: Date;
  refreshKey: number;
}) {
  const { user } = useAuth();
  const scope = useDashboardScope();
  const { from, to, refreshKey } = params;

  return useQuery({
    queryKey: ['rental-metrics', user?.id, scope, fmt(from), fmt(to), refreshKey],
    queryFn: async (): Promise<RentalMetricsOutput> => {
      if (!user) return emptyMetrics();

      // 1. Get broker IDs based on scope
      let brokerIds: string[] = [user.id];
      if (scope === 'workspace') {
        const { data } = await supabase.rpc('get_workspace_user_ids', { p_user_id: user.id });
        if (data && Array.isArray(data) && data.length > 0) brokerIds = data;
      }

      // 2. Fetch rental income transactions in period
      const { data: txns = [] } = await supabase
        .from('financial_transactions')
        .select('id, description, amount, due_date, status, property_id, unit_id, contact_id, asset_expense_category')
        .in('broker_id', brokerIds)
        .eq('type', 'income')
        .gte('due_date', fmt(from))
        .lte('due_date', fmt(to));

      // Filter to rental-related
      const rentalTxns = txns.filter(t =>
        t.asset_expense_category === 'rental_income' ||
        (!t.asset_expense_category && t.description?.toLowerCase().includes('aluguel'))
      );

      // 3. Aggregate
      const today = new Date();
      const received = { amount: 0, count: 0 };
      const receivable = { amount: 0, count: 0 };
      const overdueItems: typeof rentalTxns = [];

      for (const t of rentalTxns) {
        const amt = Number(t.amount) || 0;
        if (t.status === 'paid') {
          received.amount += amt;
          received.count++;
        } else if (t.status === 'overdue' || (t.status === 'pending' && t.due_date && new Date(t.due_date) < today)) {
          overdueItems.push(t);
        } else if (t.status === 'pending') {
          receivable.amount += amt;
          receivable.count++;
        }
      }

      // Overdue buckets
      const buckets = {
        bucket_0_15: { amount: 0, count: 0 },
        bucket_16_30: { amount: 0, count: 0 },
        bucket_31_60: { amount: 0, count: 0 },
        bucket_60_plus: { amount: 0, count: 0 },
      };
      let overdueTotal = 0;

      for (const t of overdueItems) {
        const amt = Number(t.amount) || 0;
        overdueTotal += amt;
        const days = differenceInDays(today, new Date(t.due_date!));
        if (days <= 15) { buckets.bucket_0_15.amount += amt; buckets.bucket_0_15.count++; }
        else if (days <= 30) { buckets.bucket_16_30.amount += amt; buckets.bucket_16_30.count++; }
        else if (days <= 60) { buckets.bucket_31_60.amount += amt; buckets.bucket_31_60.count++; }
        else { buckets.bucket_60_plus.amount += amt; buckets.bucket_60_plus.count++; }
      }

      // 4. Properties with open rentals (overdue grouped by property/unit)
      const openMap = new Map<string, {
        property_id: string | null;
        unit_id: string | null;
        total_open: number;
        oldest_due_date: string;
        count: number;
      }>();

      for (const t of overdueItems) {
        const key = `${t.property_id || ''}_${t.unit_id || ''}`;
        const existing = openMap.get(key);
        const amt = Number(t.amount) || 0;
        if (existing) {
          existing.total_open += amt;
          existing.count++;
          if (t.due_date! < existing.oldest_due_date) existing.oldest_due_date = t.due_date!;
        } else {
          openMap.set(key, {
            property_id: t.property_id,
            unit_id: t.unit_id,
            total_open: amt,
            oldest_due_date: t.due_date!,
            count: 1,
          });
        }
      }

      // Fetch names for properties/units
      const propIds = [...new Set([...openMap.values()].map(v => v.property_id).filter(Boolean))] as string[];
      const unitIds = [...new Set([...openMap.values()].map(v => v.unit_id).filter(Boolean))] as string[];

      const propNameMap = new Map<string, string>();
      const unitLabelMap = new Map<string, string>();

      if (propIds.length > 0) {
        const { data } = await supabase.from('properties').select('id, name, address').in('id', propIds);
        for (const p of data || []) propNameMap.set(p.id, p.name || p.address || 'Imóvel');
      }
      if (unitIds.length > 0) {
        const { data } = await supabase.from('units').select('id, unit_number, property:properties(name)').in('id', unitIds);
        for (const u of data || []) {
          const propName = (u as any).property?.name || '';
          unitLabelMap.set(u.id, u.unit_number ? `${propName ? propName + ' — ' : ''}${u.unit_number}` : propName || 'Unidade');
          if (!propNameMap.has(u.id)) {
            // Use property name for unit-only keys
          }
        }
      }

      const properties_with_open_rentals = [...openMap.values()]
        .map(v => ({
          property_id: v.property_id,
          unit_id: v.unit_id,
          property_name: v.unit_id ? (unitLabelMap.get(v.unit_id) || 'Unidade') : (v.property_id ? propNameMap.get(v.property_id) || 'Imóvel' : 'Sem vínculo'),
          unit_label: v.unit_id ? unitLabelMap.get(v.unit_id) || null : null,
          total_open: v.total_open,
          oldest_due_date: v.oldest_due_date,
          transactions_count: v.count,
        }))
        .sort((a, b) => new Date(a.oldest_due_date).getTime() - new Date(b.oldest_due_date).getTime());

      return {
        received,
        receivable,
        overdue: { amount: overdueTotal, count: overdueItems.length, buckets },
        properties_with_open_rentals,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

function emptyMetrics(): RentalMetricsOutput {
  return {
    received: { amount: 0, count: 0 },
    receivable: { amount: 0, count: 0 },
    overdue: {
      amount: 0, count: 0,
      buckets: {
        bucket_0_15: { amount: 0, count: 0 },
        bucket_16_30: { amount: 0, count: 0 },
        bucket_31_60: { amount: 0, count: 0 },
        bucket_60_plus: { amount: 0, count: 0 },
      },
    },
    properties_with_open_rentals: [],
  };
}
