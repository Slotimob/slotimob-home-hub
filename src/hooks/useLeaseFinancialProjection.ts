import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { format } from "date-fns";
import type { PlannedInstallment, PlannedObligation } from "@/lib/lease-projection";

export interface LeaseProjectionParams {
  leaseId: string;
  unitId: string;
  tenantContactId: string;
  propertyId?: string | null;
  /** Parcelas já confirmadas pelo usuário no dialog. Nada é inserido sem isso. */
  installments: PlannedInstallment[];
}

interface FinancialTransaction {
  broker_id: string;
  unit_id: string;
  contact_id: string;
  type: "income";
  description: string;
  amount: number;
  transaction_date: string;
  due_date: string;
  status: "pending";
  obligation_type: string;
  competency_period: string;
  reference: string;
  property_id?: string | null;
  category_id?: string | null;
}

/** Categoria financeira por tipo de obrigação. Ausência => category_id null. */
const CATEGORY_NAMES: Record<PlannedObligation, string[]> = {
  rent: ["Aluguéis", "Receita de Aluguel", "Aluguel"],
  fire_insurance: ["Seguro Incêndio", "Seguros"],
  iptu: ["IPTU", "Impostos"],
};

async function resolveCategoryIds(): Promise<Record<PlannedObligation, string | null>> {
  const result: Record<PlannedObligation, string | null> = {
    rent: null,
    fire_insurance: null,
    iptu: null,
  };

  const allNames = Object.values(CATEGORY_NAMES).flat();
  const { data, error } = await supabase
    .from("financial_categories")
    .select("id, name, type")
    .in("name", allNames);

  if (error || !data) return result;

  for (const key of Object.keys(CATEGORY_NAMES) as PlannedObligation[]) {
    for (const name of CATEGORY_NAMES[key]) {
      const match = data.find((c: any) => c.name === name && c.type === "income");
      if (match) {
        result[key] = match.id;
        break;
      }
    }
  }

  return result;
}

/**
 * Competências já lançadas para um contrato, no formato `${obligation}:${yyyy-MM}`.
 * É a base da idempotência por competência: geramos apenas o que ainda não existe,
 * de modo que o ciclo seguinte a um reajuste possa ser lançado sem duplicar o anterior.
 */
export async function fetchExistingCompetencies(leaseId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("competency_period, obligation_type")
    .eq("reference", `lease:${leaseId}`);

  if (error || !data) return new Set();

  return new Set(
    data
      .filter((t: any) => t.competency_period)
      .map((t: any) => `${t.obligation_type || "rent"}:${t.competency_period}`)
  );
}

export function useExistingLeaseCompetencies(leaseId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["lease-competencies", leaseId],
    queryFn: () => fetchExistingCompetencies(leaseId!),
    enabled: !!leaseId && enabled,
    staleTime: 0,
  });
}

/**
 * Insere as parcelas confirmadas pelo usuário. Nunca é chamado automaticamente:
 * a confirmação passa obrigatoriamente por ConfirmLeaseProjectionDialog.
 */
export function useLeaseFinancialProjection() {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const queryClient = useQueryClient();

  const generateProjections = useMutation({
    mutationFn: async (params: LeaseProjectionParams): Promise<{ count: number }> => {
      if (!user) throw new Error("Usuário não autenticado");

      const { leaseId, unitId, tenantContactId, propertyId, installments } = params;

      if (!installments || installments.length === 0) return { count: 0 };

      // Idempotência por competência: recarrega o estado atual e descarta duplicatas.
      const existing = await fetchExistingCompetencies(leaseId);
      const toInsert = installments.filter((i) => !existing.has(i.key));

      if (toInsert.length === 0) return { count: 0 };

      const categoryIds = await resolveCategoryIds();

      const transactions: FinancialTransaction[] = toInsert.map((i) => ({
        broker_id: effectiveBrokerId || user.id,
        unit_id: unitId,
        contact_id: tenantContactId,
        type: "income",
        description: i.description,
        amount: i.amount,
        transaction_date: i.dueDate,
        due_date: i.dueDate,
        status: "pending",
        obligation_type: i.obligationType,
        competency_period: i.competencyPeriod,
        reference: `lease:${leaseId}`,
        property_id: propertyId || null,
        category_id: categoryIds[i.obligationType] ?? null,
      }));

      const { error: insertError } = await supabase
        .from("financial_transactions")
        .insert(transactions);

      if (insertError) throw new Error(insertError.message || "Erro ao salvar parcelas");

      return { count: transactions.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["lease-competencies"] });
    },
  });

  return {
    generateProjections,
    isGenerating: generateProjections.isPending,
  };
}

/**
 * Utility to delete all projected transactions for a lease
 * Useful when a lease is terminated or canceled
 */
export function useDeleteLeaseProjections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leaseId: string): Promise<{ deleted: number }> => {
      if (!user) throw new Error("Usuário não autenticado");

      // Only delete pending transactions (not paid ones)
      const { data, error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("reference", `lease:${leaseId}`)
        .eq("status", "pending")
        .select("id");

      if (error) throw error;

      return { deleted: data?.length || 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });
}

/**
 * Hook to update future pending transactions when rent amount changes
 */
export function useUpdateFutureProjections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leaseId,
      newAmount,
      effectiveDate,
    }: {
      leaseId: string;
      newAmount: number;
      effectiveDate: Date;
    }): Promise<{ updated: number }> => {
      if (!user) throw new Error("Usuário não autenticado");

      const effectiveDateStr = format(effectiveDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("financial_transactions")
        .update({ amount: newAmount })
        .eq("reference", `lease:${leaseId}`)
        .eq("status", "pending")
        .gte("due_date", effectiveDateStr)
        .select("id");

      if (error) throw error;

      return { updated: data?.length || 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });
}

/**
 * Hook to count future pending transactions for a lease
 * Useful for showing preview before termination
 */
export function useCountFutureProjections() {
  const { user } = useAuth();

  const countProjections = async (leaseId: string, fromDate: string): Promise<number> => {
    if (!user) return 0;

    const { count, error } = await supabase
      .from("financial_transactions")
      .select("id", { count: "exact", head: true })
      .eq("reference", `lease:${leaseId}`)
      .eq("status", "pending")
      .gte("due_date", fromDate);

    if (error) {
      console.error("Error counting projections:", error);
      return 0;
    }

    return count || 0;
  };

  return { countProjections };
}
