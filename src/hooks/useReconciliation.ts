import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchSettlementGroup, settlementAnchor } from "@/lib/settlement-group";

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
  "settlement-groups",
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
}: ReconcileParams): Promise<{ groupSize: number }> {
  const { data: tx, error: txReadError } = await supabase
    .from("financial_transactions")
    .select("id, bank_account_id, settlement_group_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (txReadError) throw txReadError;
  if (!tx) throw new Error("Lançamento não encontrado ou sem permissão para editar.");

  // Baixa conjunta: extrato vincula ao ALUGUEL; todas as linhas do grupo são baixadas
  let anchorId = transactionId;
  let lines: { id: string; bank_account_id?: string | null }[] = [tx];
  if (tx.settlement_group_id) {
    const group = await fetchSettlementGroup(tx.settlement_group_id);
    if (group.length > 0) {
      lines = group;
      anchorId = settlementAnchor(group)?.id ?? transactionId;
    }
  }

  const { data: entryRows, error: entryError } = await supabase
    .from("bank_statement_entries")
    .update({ transaction_id: anchorId, is_reconciled: true })
    .eq("id", entryId)
    .select("id");
  if (entryError) throw entryError;
  if (!entryRows || entryRows.length === 0) {
    throw new Error("Item do extrato não encontrado ou sem permissão para editar.");
  }

  const base: Record<string, unknown> = {
    is_reconciled: true,
    reconciled_at: new Date().toISOString(),
  };
  if (markAsPaid) {
    base.status = "paid";
    base.paid_date = entryDate;
  }

  const withAccount = lines.filter((l) => l.bank_account_id || !bankAccountId).map((l) => l.id);
  const withoutAccount = bankAccountId ? lines.filter((l) => !l.bank_account_id).map((l) => l.id) : [];

  let updated = 0;
  let failure: any = null;
  for (const [ids, patch] of [
    [withAccount, base],
    [withoutAccount, { ...base, bank_account_id: bankAccountId }],
  ] as const) {
    if (ids.length === 0 || failure) continue;
    const { data, error } = await supabase
      .from("financial_transactions")
      .update(patch as any)
      .in("id", ids as string[])
      .select("id");
    if (error) failure = error;
    else updated += data?.length || 0;
  }

  if (failure || updated < lines.length) {
    // Desfaz para não deixar extrato ou grupo pela metade
    const { error: rollbackError } = await supabase
      .from("bank_statement_entries")
      .update({ transaction_id: null, is_reconciled: false })
      .eq("id", entryId);
    if (rollbackError) console.error("[useReconciliation] rollback falhou:", rollbackError);
    if (updated > 0) {
      const { error: txRollbackError } = await supabase
        .from("financial_transactions")
        .update({ is_reconciled: false, reconciled_at: null })
        .in("id", lines.map((l) => l.id));
      if (txRollbackError) console.error("[useReconciliation] rollback do grupo falhou:", txRollbackError);
    }
    if (failure) throw failure;
    throw new Error("Lançamento não encontrado ou sem permissão para editar.");
  }
  return { groupSize: lines.length };
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

  // Grupo de baixa conjunta: desfaz todas as linhas
  let txIds: string[] = txId ? [txId] : [];
  if (txId) {
    const { data: tx, error } = await supabase
      .from("financial_transactions")
      .select("settlement_group_id")
      .eq("id", txId)
      .maybeSingle();
    if (error) throw error;
    if (tx?.settlement_group_id) {
      const group = await fetchSettlementGroup(tx.settlement_group_id);
      if (group.length > 0) txIds = Array.from(new Set([txId, ...group.map((l) => l.id)]));
    }
  }

  if (txIds.length > 0) {
    const { data, error } = await supabase
      .from("bank_statement_entries")
      .select("id")
      .in("transaction_id", txIds);
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

  if (txIds.length > 0) {
    const { data, error } = await supabase
      .from("financial_transactions")
      .update({ is_reconciled: false, reconciled_at: null })
      .in("id", txIds)
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
    onSuccess: (result) => {
      toast({
        title: "Lançamento conciliado com sucesso!",
        description: result?.groupSize > 1 ? `Baixa conjunta: ${result.groupSize} lançamentos` : undefined,
      });
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
