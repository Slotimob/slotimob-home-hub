import { useMemo } from "react";
import { useNextPendingRent } from "@/hooks/useNextPendingRent";
import { nextDueFromConfig } from "@/lib/lease-special-conditions";
import { todayInSaoPauloDateOnly } from "@/lib/date-only";
import type { RentGraceConfig } from "@/hooks/useLeases";

export interface LeaseNextDue {
  competency: string;
  /** "yyyy-MM-dd" */
  dueDate: string;
  /** true = aluguel pendente já lançado; false = calculado pela configuração. */
  fromTransaction: boolean;
}

/**
 * Próximo vencimento do contrato: aluguel pendente mais antigo; sem
 * lançamento, pela configuração (pulando carência isenta).
 */
export function useLeaseNextDue(
  lease: { id: string; start_date?: string | null; due_day?: number | null; rent_grace?: RentGraceConfig | null } | null | undefined
): LeaseNextDue | null {
  const { data: pending, isSuccess } = useNextPendingRent(lease?.id);
  return useMemo(() => {
    if (!lease) return null;
    if (pending?.due_date) {
      return {
        competency: pending.competency_period || pending.due_date.slice(0, 7),
        dueDate: pending.due_date,
        fromTransaction: true,
      };
    }
    const cfg = nextDueFromConfig(lease, todayInSaoPauloDateOnly());
    return cfg ? { ...cfg, fromTransaction: false } : null;
  }, [lease, pending, isSuccess]);
}
