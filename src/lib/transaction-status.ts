import { todayInSaoPauloDateOnly } from "@/lib/date-only";

/**
 * Status efetivo de um lançamento. O atraso é DERIVADO da data: o banco grava
 * `pending` e o lançamento vira "Atrasado" quando o vencimento já passou (fuso SP).
 */
export type EffectiveStatus = "paid" | "cancelled" | "overdue" | "pending";

export function getEffectiveStatus(
  tx: { status: string; due_date?: string | null },
  today: string = todayInSaoPauloDateOnly()
): EffectiveStatus {
  if (tx.status === "paid") return "paid";
  if (tx.status === "cancelled") return "cancelled";
  if (tx.status === "overdue") return "overdue";
  if (tx.status === "pending" && tx.due_date && tx.due_date < today) return "overdue";
  return "pending";
}

export const EFFECTIVE_STATUS_LABELS: Record<EffectiveStatus, string> = {
  paid: "Pago",
  cancelled: "Cancelado",
  overdue: "Atrasado",
  pending: "Pendente",
};

export const EFFECTIVE_STATUS_BADGE_CLASSES: Record<EffectiveStatus, string> = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800",
  pending: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800",
  overdue: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/10",
  cancelled: "bg-muted text-muted-foreground border-border hover:bg-muted",
};
