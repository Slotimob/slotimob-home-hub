import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface LeaseStatusConfig {
  label: string;
  variant: BadgeVariant;
}

/* ------------------------------------------------------------------ */
/* (a) Status do contrato — coluna leases.status                      */
/* ------------------------------------------------------------------ */

export const LEASE_STATUS_LABELS: Record<string, LeaseStatusConfig> = {
  pending: { label: "Pendente de Configuração", variant: "secondary" },
  active: { label: "Ativo", variant: "default" },
  terminated: { label: "Encerrado", variant: "outline" },
  expired: { label: "Expirado", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

export function getLeaseStatusConfig(status: string | null | undefined): LeaseStatusConfig {
  return LEASE_STATUS_LABELS[status || ""] || LEASE_STATUS_LABELS.active;
}

export function isLeasePendingSetup(status: string | null | undefined): boolean {
  return status === "pending";
}

/* ------------------------------------------------------------------ */
/* (b) Status de assinatura — coluna signature_status                 */
/* ------------------------------------------------------------------ */

export interface SignatureStatusConfig {
  label: string;
  signed: boolean;
  className: string;
}

export function getSignatureStatus(
  signatureStatus: string | null | undefined
): SignatureStatusConfig {
  const signed = signatureStatus === "signed";
  return {
    signed,
    label: signed ? "Assinado" : "Aguardando Assinatura",
    className: signed
      ? "border-green-500/30 text-green-700 bg-green-500/10"
      : "border-amber-500/30 text-amber-700 bg-amber-500/10",
  };
}

/* ------------------------------------------------------------------ */
/* (c) Situação do reajuste — derivada de next_adjustment_date        */
/* ------------------------------------------------------------------ */

export type AdjustmentStatus = "sem_reajuste" | "em_dia" | "proximo" | "vencido";

export interface AdjustmentStatusConfig {
  status: AdjustmentStatus;
  label: string;
  /** dias até o reajuste (negativo quando vencido); null se sem data */
  daysUntil: number | null;
  variant: BadgeVariant;
  className: string;
  /** true quando exige ação do usuário (vencido ou próximo) */
  needsAction: boolean;
}

/**
 * Fonte ÚNICA da lógica de situação de reajuste.
 * Comparação sempre em início do dia nas duas pontas — reajuste marcado
 * para HOJE é `proximo`, nunca `vencido`.
 */
export function getAdjustmentStatus(
  nextAdjustmentDate: string | null | undefined
): AdjustmentStatus {
  if (!nextAdjustmentDate) return "sem_reajuste";

  let target: Date;
  try {
    target = startOfDay(parseISO(nextAdjustmentDate));
  } catch {
    return "sem_reajuste";
  }
  if (Number.isNaN(target.getTime())) return "sem_reajuste";

  const today = startOfDay(new Date());
  const days = differenceInCalendarDays(target, today);

  if (days < 0) return "vencido";
  if (days <= 30) return "proximo";
  return "em_dia";
}

export const ADJUSTMENT_STATUS_LABELS: Record<AdjustmentStatus, string> = {
  sem_reajuste: "Sem reajuste definido",
  em_dia: "Em dia",
  proximo: "Próximo de Reajustar",
  vencido: "Reajuste Vencido",
};

export function getAdjustmentStatusConfig(
  nextAdjustmentDate: string | null | undefined
): AdjustmentStatusConfig {
  const status = getAdjustmentStatus(nextAdjustmentDate);

  let daysUntil: number | null = null;
  if (nextAdjustmentDate && status !== "sem_reajuste") {
    daysUntil = differenceInCalendarDays(
      startOfDay(parseISO(nextAdjustmentDate)),
      startOfDay(new Date())
    );
  }

  const styles: Record<AdjustmentStatus, { variant: BadgeVariant; className: string }> = {
    sem_reajuste: {
      variant: "outline",
      className: "border-muted-foreground/30 text-muted-foreground bg-muted/40",
    },
    em_dia: {
      variant: "outline",
      className: "border-emerald-500/30 text-emerald-700 bg-emerald-500/10",
    },
    proximo: {
      variant: "outline",
      className: "border-amber-500/30 text-amber-700 bg-amber-500/10",
    },
    vencido: {
      variant: "outline",
      className: "border-red-500/30 text-red-700 bg-red-500/10",
    },
  };

  return {
    status,
    label: ADJUSTMENT_STATUS_LABELS[status],
    daysUntil,
    needsAction: status === "vencido" || status === "proximo",
    ...styles[status],
  };
}
