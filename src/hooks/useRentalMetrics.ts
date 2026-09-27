import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardScope, type RentalScope } from '@/hooks/useDashboardScope';
import { differenceInDays, startOfDay } from 'date-fns';
import { fetchSettlementGroups, settlementNet } from "@/lib/settlement-group";
import { parseDateOnly, toDateOnly, todayDateOnly } from "@/lib/date-only";

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
  return toDateOnly(d);
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
        .select('id, description, amount, due_date, status, property_id, unit_id, contact_id, asset_expense_category, settlement_group_id')
        .in('broker_id', brokerIds)
        .eq('type', 'income')
        .gte('due_date', fmt(from))
        .lte('due_date', fmt(to));

      // Filter to rental-related
      const rentalRaw = txns.filter((t: any) =>
        t.asset_expense_category === 'rental_income' ||
        (!t.asset_expense_category && t.description?.toLowerCase().includes('aluguel'))
      );

      // Baixa conjunta: aluguel em aberto com grupo vale o LÍQUIDO (aluguel − abatimentos − IRRF)
      const openGroupIds = rentalRaw
        .filter((t: any) => t.settlement_group_id && t.status !== 'paid')
        .map((t: any) => t.settlement_group_id as string);
      const groups = openGroupIds.length ? await fetchSettlementGroups(openGroupIds) : {};
      const rentalTxns = rentalRaw.map((t: any) => {
        const lines = t.settlement_group_id && t.status !== 'paid' ? groups[t.settlement_group_id] : null;
        if (!lines || lines.length < 2) return t;
        const net = settlementNet(lines);
        return net > 0 ? { ...t, amount: net } : t;
      });

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
        } else if (t.status === 'overdue' || (t.status === 'pending' && t.due_date && t.due_date < todayDateOnly())) {
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
        const dueParsed = parseDateOnly(t.due_date);
        const days = dueParsed ? differenceInDays(startOfDay(today), startOfDay(dueParsed)) : 0;
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

      // Contrato com vários imóveis: o lançamento é único (no principal), mas o
      // agrupamento por imóvel usa o rateio de v_financial_transactions_by_unit.
      const overdueIds = overdueItems.map((t: any) => t.id).filter(Boolean);
      const allocById = new Map<string, { alloc_unit_id: string; alloc_factor: number }[]>();
      if (overdueIds.length) {
        const { data: allocRows } = await (supabase as any)
          .from('v_financial_transactions_by_unit')
          .select('id, alloc_unit_id, alloc_factor')
          .in('id', overdueIds)
          .eq('is_allocated', true);
        for (const r of (allocRows as any[]) || []) {
          const list = allocById.get(r.id) || [];
          list.push({ alloc_unit_id: r.alloc_unit_id, alloc_factor: Number(r.alloc_factor) || 0 });
          allocById.set(r.id, list);
        }
      }
      const overdueByUnit = overdueItems.flatMap((t: any) => {
        const allocs = allocById.get(t.id);
        if (!allocs?.length) return [t];
        return allocs.map((a) => ({
          ...t,
          unit_id: a.alloc_unit_id,
          amount: Math.round((Number(t.amount) || 0) * a.alloc_factor * 100) / 100,
        }));
      });

      for (const t of overdueByUnit) {
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
        .sort((a, b) => String(a.oldest_due_date).localeCompare(String(b.oldest_due_date)));

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
