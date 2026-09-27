import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
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
  ownerContactId?: string | null;
  propertyId?: string | null;
  /** Data de início do contrato: define o DIA do mês usado na data de emissão. */
  leaseStartDate?: string | null;
  /** Parcelas já confirmadas pelo usuário no dialog. Nada é inserido sem isso. */
  installments: PlannedInstallment[];
}

interface FinancialTransaction {
  broker_id: string;
  unit_id: string;
  contact_id: string | null;
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
  lease_id: string;
  metadata: Json;
  settlement_group_id: string | null;
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
  garbage_fee: { income: ["Taxa de Lixo"], expense: ["Repasse de Taxa de Lixo"] },
  other: { income: [], expense: [] },
  // Condições especiais (abatimento = encargo do proprietário; IRRF = dedução)
  rent_deduction: { income: [], expense: ["Abatimento de Aluguel (Encargo do Proprietário)"] },
  irrf: { income: [], expense: ["IRRF Retido na Fonte"] },
};

/** `rent_deduction_<id8>` compartilha a categoria de `rent_deduction`. */
const categoryKey = (obligation: string) =>
  obligation.startsWith("rent_deduction_") ? "rent_deduction" : obligation;

type CategoryLookup = (
  obligation: string,
  type: "income" | "expense"
) => string | null;

async function resolveCategoryIds(brokerId: string): Promise<CategoryLookup> {
  const allNames = Object.values(CATEGORY_NAMES).flatMap((v) => [...v.income, ...v.expense]);

  const { data, error } = await supabase
    .from("financial_categories")
    .select("id, name, type")
    .eq("broker_id", brokerId)
    .in("name", allNames);

  const rows = error || !data ? [] : data;

  return (obligation, type) => {
    const names = CATEGORY_NAMES[categoryKey(obligation)]?.[type] ?? [];
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

      const { leaseId, unitId, tenantContactId, ownerContactId, propertyId, leaseStartDate, installments } =
        params;

      if (!installments || installments.length === 0) return { count: 0 };

      // Idempotência por PARCELA (tipo:competência:vencimento): recarrega o estado
      // atual e descarta duplicatas — mesma chave usada na camada de UI.
      const existing = await fetchExistingCompetencies(leaseId);
      // Mês isento de carência só aparece no preview; o banco exige amount > 0.
      const toInsert = installments.filter(
        (i) => !i.isGrace && Number(i.amount) > 0 && !existing.has(i.dedupKey ?? i.key)
      );

      if (toInsert.length === 0) return { count: 0 };

      const brokerId = effectiveBrokerId || user.id;
      const findCategory = await resolveCategoryIds(brokerId);

      /**
       * Baixa conjunta: competência com aluguel + (abatimento ou IRRF) ganha um
       * `settlement_group_id`. Reaproveita o id de um aluguel já lançado da mesma
       * competência; competência só com aluguel fica null.
       */
      const { data: existingGroups } = await supabase
        .from("financial_transactions")
        .select("competency_period, settlement_group_id")
        .eq("reference", `lease:${leaseId}`)
        .or("obligation_type.eq.rent,obligation_type.is.null")
        .not("settlement_group_id", "is", null);
      const groupByCompetency = new Map<string, string>();
      (existingGroups || []).forEach((r: any) => {
        if (r.competency_period && r.settlement_group_id)
          groupByCompetency.set(r.competency_period, r.settlement_group_id);
      });
      const isRentLine = (i: PlannedInstallment) => i.obligationType === "rent";
      const isSettlementExtra = (i: PlannedInstallment) =>
        i.obligationType === "irrf" || i.obligationType.startsWith("rent_deduction_");
      const keys = new Set(toInsert.map((i) => i.settlementKey).filter(Boolean) as string[]);
      const settlementIds = new Map<string, string>();
      keys.forEach((k) => {
        const lines = toInsert.filter((i) => i.settlementKey === k);
        const hasRent = lines.some(isRentLine) || groupByCompetency.has(k);
        const hasExtra = lines.some(isSettlementExtra);
        if (hasRent && hasExtra) settlementIds.set(k, groupByCompetency.get(k) ?? crypto.randomUUID());
      });

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

      /**
       * Contato do lançamento por NATUREZA, não por posição no contrato:
       *  - receita (cobrada do inquilino) => inquilino
       *  - despesa (repasse assumido pelo proprietário) => proprietário
       * O `contactId` da própria parcela (responsável do encargo) sempre manda.
       * Sem proprietário conhecido a despesa fica SEM contato: `contact_id` é
       * nullable, e null é melhor que atribuir a despesa à pessoa errada.
       */
      const resolveContactId = (i: PlannedInstallment): string | null => {
        if (i.contactId) return i.contactId;
        if (i.obligationType.startsWith("rent_deduction_")) return ownerContactId ?? null;
        if (i.obligationType === "irrf") return tenantContactId ?? null;
        if ((i.transactionType ?? "income") === "expense") return ownerContactId ?? null;
        return tenantContactId ?? null;
      };

      const transactions: FinancialTransaction[] = toInsert.map((i) => {
        const transactionType = i.transactionType ?? "income";
        return {
          broker_id: brokerId,
          unit_id: unitId,
          contact_id: resolveContactId(i),
          type: transactionType,
          description: i.description,
          amount: i.amount,
          // O que a tela mostrou é o que vai para o banco: a emissão vem pronta
          // da UI. `resolveTransactionDate` só serve de fallback para chamadas
          // antigas que ainda não preenchem `issueDate`.
          transaction_date: i.issueDate ?? resolveTransactionDate(i),
          due_date: i.dueDate,
          status: "pending",
          obligation_type: i.obligationType,
          competency_period: i.competencyPeriod,
          reference: `lease:${leaseId}`,
          property_id: propertyId || null,
          category_id: findCategory(i.obligationType, transactionType),
          lease_id: leaseId,
          metadata: (i.meta ?? {}) as Json,
          settlement_group_id: i.settlementKey ? settlementIds.get(i.settlementKey) ?? null : null,
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
        .or("obligation_type.eq.rent,obligation_type.is.null")
        // Parcelas de carência mantêm o valor reduzido acordado
        .or("metadata->>kind.is.null,metadata->>kind.neq.grace")
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
