import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const POLL_MS = 5000;
const TIMEOUT_MS = 15 * 60 * 1000;

interface Params {
  userId?: string;
  expectedPlanId?: string;
  baselinePeriodEnd: string | null;
  since: string | null;
  enabled: boolean;
}

export function usePlatformPaymentStatus({ userId, expectedPlanId, baselinePeriodEnd, since, enabled }: Params) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !since) return;
    const id = window.setInterval(() => setNow(Date.now()), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, since]);

  const timedOut = !!since && now - new Date(since).getTime() > TIMEOUT_MS;
  const active = enabled && !!userId && !!since;

  const query = useQuery({
    queryKey: ['platform-payment-status', userId, since],
    enabled: active,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan_id, current_period_end, last_payment_error, last_payment_error_at')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: active && !timedOut ? POLL_MS : false,
    refetchOnWindowFocus: true,
  });

  const row = query.data;
  const periodEnd = row?.current_period_end ?? null;
  const confirmed =
    !!row &&
    row.status === 'active' &&
    row.plan_id === expectedPlanId &&
    periodEnd !== baselinePeriodEnd &&
    !!periodEnd &&
    new Date(periodEnd).getTime() > Date.now();

  const paymentError =
    row?.last_payment_error &&
    row.last_payment_error_at &&
    since &&
    new Date(row.last_payment_error_at).getTime() > new Date(since).getTime()
      ? row.last_payment_error
      : null;

  return { confirmed, paymentError, timedOut, refetch: query.refetch };
}
