import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Fonte única para conciliar e desconciliar lançamento <-> linha do extrato.
 * Regra: 1 linha de extrato <-> 1 lançamento; "marcar como pago" é opcional.
 */

export interface ReconcileParams {
  entryId: string;
  transactionId: string;
  markAsPaid: boolean;
  entryDate: string;
  /** Conta da linha do extrato; só é gravada se o lançamento ainda não tiver conta. */
  bankAccountId?: string | null;
}

export interface UnreconcileParams {
  transactionId?: string | null;
  entryId?: string | null;
}

const RECONCILIATION_QUERY_KEYS = [
  "infinite-transactions",
  "bank-statement-entries",
  "unreconciled-statement-entries",
  "unreconciled-transactions",
  "reconciled-entries",
  "reconciliation-totals",
  "bank-accounts",
  "bank-accounts-progressive",
  "transaction-summaries-progressive",
  "finance-overview",
] as const;

export function invalidateReconciliationQueries(queryClient: QueryClient) {
  RECONCILIATION_QUERY_KEYS.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
}

export async function reconcileEntry({
  entryId,
  transactionId,
  markAsPaid,
  entryDate,
  bankAccountId,
}: ReconcileParams): Promise<void> {
  const { data: tx, error: txReadError } = await supabase
    .from("financial_transactions")
    .select("id, bank_account_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (txReadError) throw txReadError;
  if (!tx) throw new Error("Lançamento não encontrado ou sem permissão para editar.");

  const { data: entryRows, error: entryError } = await supabase
    .from("bank_statement_entries")
    .update({ transaction_id: transactionId, is_reconciled: true })
    .eq("id", entryId)
    .select("id");
  if (entryError) throw entryError;
  if (!entryRows || entryRows.length === 0) {
    throw new Error("Item do extrato não encontrado ou sem permissão para editar.");
  }

  const txUpdate: Record<string, unknown> = {
    is_reconciled: true,
    reconciled_at: new Date().toISOString(),
  };
  if (markAsPaid) {
    txUpdate.status = "paid";
    txUpdate.paid_date = entryDate;
  }
  if (!tx.bank_account_id && bankAccountId) {
    txUpdate.bank_account_id = bankAccountId;
  }

  const { data: txRows, error: txError } = await supabase
    .from("financial_transactions")
    .update(txUpdate)
    .eq("id", transactionId)
    .select("id");

  if (txError || !txRows || txRows.length === 0) {
    // Desfaz o 1º update para não deixar a linha do extrato presa
    const { error: rollbackError } = await supabase
      .from("bank_statement_entries")
      .update({ transaction_id: null, is_reconciled: false })
      .eq("id", entryId);
    if (rollbackError) console.error("[useReconciliation] rollback falhou:", rollbackError);
    if (txError) throw txError;
    throw new Error("Lançamento não encontrado ou sem permissão para editar.");
  }
}

export async function unreconcileEntry({ transactionId, entryId }: UnreconcileParams): Promise<void> {
  if (!transactionId && !entryId) throw new Error("Nada para desconciliar.");

  // Resolve o par
  const entryIds = new Set<string>();
  let txId: string | null = transactionId ?? null;

  if (entryId) {
    entryIds.add(entryId);
    if (!txId) {
      const { data, error } = await supabase
        .from("bank_statement_entries")
        .select("transaction_id")
        .eq("id", entryId)
        .maybeSingle();
      if (error) throw error;
      txId = data?.transaction_id ?? null;
    }
  }

  if (txId) {
    const { data, error } = await supabase
      .from("bank_statement_entries")
      .select("id")
      .eq("transaction_id", txId);
    if (error) throw error;
    (data || []).forEach((e) => entryIds.add(e.id));
  }

  if (entryIds.size > 0) {
    const { error } = await supabase
      .from("bank_statement_entries")
      .update({ transaction_id: null, is_reconciled: false })
      .in("id", Array.from(entryIds));
    if (error) throw error;
  }

  if (txId) {
    const { data, error } = await supabase
      .from("financial_transactions")
      .update({ is_reconciled: false, reconciled_at: null })
      .eq("id", txId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Lançamento não encontrado ou sem permissão para editar.");
    }
  }
}

export function useReconciliation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reconcile = useMutation({
    mutationFn: reconcileEntry,
    onSuccess: () => {
      toast({ title: "Lançamento conciliado com sucesso!" });
      invalidateReconciliationQueries(queryClient);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao conciliar", description: error?.message, variant: "destructive" });
    },
  });

  const unreconcile = useMutation({
    mutationFn: unreconcileEntry,
    onSuccess: () => {
      toast({ title: "Conciliação desfeita com sucesso!" });
      invalidateReconciliationQueries(queryClient);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao desfazer conciliação", description: error?.message, variant: "destructive" });
    },
  });

  return { reconcile, unreconcile };
}
