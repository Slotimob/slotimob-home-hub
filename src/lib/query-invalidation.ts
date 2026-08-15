import type { QueryClient } from "@tanstack/react-query";

/**
 * Chaves de query que dependem do estado de um contrato (lease).
 * Mantenha esta lista como fonte única — chaves distintas NÃO são invalidadas
 * por prefixo (ex.: ["lease"] não invalida ["lease-detail", id]).
 */
export const LEASE_QUERY_KEYS: string[] = [
  "lease-detail",
  "leases",
  "lease",
  "lease-by-unit",
  "leases-contracts",
  "asset-health",
  "financial-transactions",
  "transactions",
];

/**
 * Invalida todas as queries afetadas por uma escrita em contratos.
 * Use `await` quando a UI exibir o resultado logo em seguida (toast/refetch).
 */
export async function invalidateLeaseQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    LEASE_QUERY_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] }))
  );
}
