import type { NavigateFunction } from "react-router-dom";
import { isLeasePendingSetup } from "@/lib/lease-status";

/**
 * Fonte única de navegação para um contrato.
 * Contratos com status `pending` (esqueleto criado pelo trigger a partir do
 * cadastro do imóvel) ainda não têm tela de detalhe — abrem o wizard.
 */
export function openLeaseRoute(
  navigate: NavigateFunction,
  lease: { id: string; status?: string | null },
  options?: { replace?: boolean }
) {
  if (isLeasePendingSetup(lease.status)) {
    navigate(`/gestao/contratos/novo?edit=${lease.id}`, { replace: options?.replace });
    return;
  }
  navigate(`/gestao/contratos?id=${lease.id}`, { replace: options?.replace });
}
