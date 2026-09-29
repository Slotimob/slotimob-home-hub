import { invalidateLeaseQueries } from "@/lib/query-invalidation";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateReconciliationQueries } from "@/hooks/useReconciliation";
import type { CompositionKind } from "@/lib/settlement-group";

export type DifferenceKind = "late_fee" | "other_addition" | "discount" | "partial";

export interface SettleRentPaymentResult {
  group_id: string | null;
  anchor_id: string;
  expected: number;
  received: number;
  difference: number;
  kind: DifferenceKind | null;
  paid_ids: string[];
  adjustment_id: string | null;
  balance_id: string | null;
}

export interface SetRentCompositionResult {
  group_id: string;
  anchor_id: string;
  net_before: number;
  net_after: number;
  unreconciled: boolean;
}

export interface CompositionLineInput {
  id?: string | null;
  kind: CompositionKind;
  amount: number;
  description?: string | null;
}

export interface SettleRentPaymentInput {
  transactionId: string;
  paidDate: string;
  received?: number | null;
  differenceKind?: DifferenceKind | null;
  bankAccountId?: string | null;
}

export async function settleRentPayment(input: SettleRentPaymentInput): Promise<SettleRentPaymentResult> {
  const { data, error } = await supabase.rpc("settle_rent_payment", {
    p_transaction_id: input.transactionId,
    p_paid_date: input.paidDate,
    p_received: input.received ?? undefined,
    p_difference_kind: input.differenceKind ?? undefined,
    p_bank_account_id: input.bankAccountId ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as unknown as SettleRentPaymentResult;
}

export async function setRentComposition(
  anchorId: string,
  rentAmount: number,
  lines: CompositionLineInput[]
): Promise<SetRentCompositionResult> {
  const { data, error } = await supabase.rpc("set_rent_composition", {
    p_anchor_id: anchorId,
    p_rent_amount: rentAmount,
    p_lines: lines.map((l) => ({
      ...(l.id ? { id: l.id } : {}),
      kind: l.kind,
      amount: l.amount,
      description: l.description ?? null,
    })) as any,
  });
  if (error) throw new Error(error.message);
  return data as unknown as SetRentCompositionResult;
}

export function invalidateRentSettlementQueries(queryClient: QueryClient) {
  invalidateReconciliationQueries(queryClient);
  // Lista de lançamentos e contratos (fonte única: LEASE_QUERY_KEYS)
  void invalidateLeaseQueries(queryClient);
  for (const key of [
    "rent-payment-group",
    "rent-composition",
    "lease-next-pending-rent",
    "dashboard",
    "recent-lease-transactions",
    "lease-transactions",
    "dre-report",
    "settlement-groups",
  ]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function useSettleRentPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settleRentPayment,
    onSuccess: () => invalidateRentSettlementQueries(queryClient),
  });
}

export function useSetRentComposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { anchorId: string; rentAmount: number; lines: CompositionLineInput[] }) =>
      setRentComposition(v.anchorId, v.rentAmount, v.lines),
    onSuccess: () => invalidateRentSettlementQueries(queryClient),
  });
}
