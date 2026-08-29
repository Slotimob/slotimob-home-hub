import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { format, getDate, parseISO } from "date-fns";
import {
  calculateDueDate,
  type PlannedInstallment,
} from "@/lib/lease-projection";

export interface LeaseProjectionParams {
  leaseId: string;
  unitId: string;
  tenantContactId: string;
  propertyId?: string | null;
  /** Data de início do contrato: define o DIA do mês usado na data de emissão. */
  leaseStartDate?: string | null;
  /** Parcelas já confirmadas pelo usuário no dialog. Nada é inserido sem isso. */
  installments: PlannedInstallment[];
}

interface FinancialTransaction {
  broker_id: string;
  unit_id: string;
  contact_id: string;
  type: "income" | "expense";
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

/**
 * Categoria financeira por tipo de obrigação e por natureza do lançamento.
 * `income` = cobrado do inquilino; `expense` = assumido pelo proprietário (repasse).
 * Nomes conferidos em `public.financial_categories`. Ausência => category_id null.
 */
const CATEGORY_NAMES: Record<string, { income: string[]; expense: string[] }> = {
  rent: { income: ["Aluguéis", "Receita de Aluguel", "Aluguel"], expense: ["Repasse a Proprietário"] },
  fire_insurance: { income: ["Seguro Incêndio"], expense: ["Repasse de Seguro Incêndio"] },
  iptu: { income: ["IPTU"], expense: ["Repasse de IPTU"] },
  condominium: { income: ["Condomínio"], expense: ["Repasse de Condomínio"] },
  energy: { income: ["Energia"], expense: ["Repasse de Energia"] },
  water: { income: ["Água"], expense: ["Repasse de Água"] },
  gas: { income: ["Gás"], expense: ["Repasse de Gás"] },
  other: { income: [], expense: [] },
};

type CategoryLookup = (
  obligation: string,
  type: "income" | "expense"
) => string | null;

async function resolveCategoryIds(): Promise<CategoryLookup> {
  const allNames = Object.values(CATEGORY_NAMES).flatMap((v) => [...v.income, ...v.expense]);

  const { data, error } = await supabase
    .from("financial_categories")
    .select("id, name, type")
    .in("name", allNames);

  const rows = error || !data ? [] : data;

  return (obligation, type) => {
    const names = CATEGORY_NAMES[obligation]?.[type] ?? [];
    for (const name of names) {
      const match = rows.find((c: any) => c.name === name && c.type === type);
      if (match) return match.id;
    }
    return null;
  };
}

/**
 * Parcelas já lançadas para um contrato, na chave `${obligation}:${yyyy-MM}:${due_date}`.
 * O vencimento faz parte da chave porque encargo anual (IPTU/seguro) tem N parcelas na
 * MESMA competência — espelha o índice único do banco
 * `(reference, obligation_type, competency_period, due_date)`.
 */
export async function fetchExistingCompetencies(leaseId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("competency_period, obligation_type, due_date")
    .eq("reference", `lease:${leaseId}`);

  if (error || !data) return new Set();

  return new Set(
    data
      .filter((t: any) => t.competency_period && t.due_date)
      .map((t: any) => `${t.obligation_type || "rent"}:${t.competency_period}:${t.due_date}`)
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

      const { leaseId, unitId, tenantContactId, propertyId, leaseStartDate, installments } =
        params;

      if (!installments || installments.length === 0) return { count: 0 };

      // Idempotência por PARCELA (tipo:competência:vencimento): recarrega o estado
      // atual e descarta duplicatas — mesma chave usada na camada de UI.
      const existing = await fetchExistingCompetencies(leaseId);
      const toInsert = installments.filter((i) => !existing.has(i.dedupKey ?? i.key));

      if (toInsert.length === 0) return { count: 0 };

      const findCategory = await resolveCategoryIds();

      /**
       * Data de emissão (regime de competência): dia do mês em que o contrato começou,
       * aplicado dentro do mês de competência do lançamento. O clamp de meses curtos
       * reaproveita `calculateDueDate` (ex.: contrato dia 31 + fevereiro => 28/29).
       */
      const contractDay = leaseStartDate ? getDate(parseISO(leaseStartDate)) : null;
      const resolveTransactionDate = (i: PlannedInstallment): string => {
        if (!contractDay || !/^\d{4}-\d{2}$/.test(i.competencyPeriod)) return i.dueDate;
        const competencyMonth = parseISO(`${i.competencyPeriod}-01`);
        if (Number.isNaN(competencyMonth.getTime())) return i.dueDate;
        return format(calculateDueDate(competencyMonth, contractDay), "yyyy-MM-dd");
      };

      const transactions: FinancialTransaction[] = toInsert.map((i) => {
        const transactionType = i.transactionType ?? "income";
        return {
          broker_id: effectiveBrokerId || user.id,
          unit_id: unitId,
          contact_id: i.contactId || tenantContactId,
          type: transactionType,
          description: i.description,
          amount: i.amount,
          transaction_date: resolveTransactionDate(i),
          due_date: i.dueDate,
          status: "pending",
          obligation_type: i.obligationType,
          competency_period: i.competencyPeriod,
          reference: `lease:${leaseId}`,
          property_id: propertyId || null,
          category_id: findCategory(i.obligationType, transactionType),
        };
      });


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
