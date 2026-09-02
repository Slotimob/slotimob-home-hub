/**
 * Fonte única do rótulo de um encargo adicional do contrato.
 *
 * Ordem de precedência (validada com o cliente):
 *  1. `additional_obligations[].label` — a Descrição que o usuário digitou NAQUELE contrato
 *  2. rótulo conhecido do tipo fixo (condomínio, energia, água, gás, taxa de lixo, outros)
 *  3. nome do tipo customizado cadastrado pelo corretor (`custom_<uuid>` -> nome)
 *  4. texto neutro
 *
 * O id cru (`custom_<uuid>`) NUNCA é exibido.
 */

export const FALLBACK_OBLIGATION_LABEL = "Encargo personalizado";

/** Rótulos dos encargos adicionais mensais da taxonomia fixa do contrato. */
export const ADDITIONAL_OBLIGATION_LABELS: Record<string, string> = {
  condominium: "Condomínio",
  energy: "Energia",
  water: "Água",
  gas: "Gás",
  garbage_fee: "Taxa de Lixo",
  other: "Outros",
};

/** `custom_<uuid>` -> uuid do tipo customizado; null para tipos fixos. */
export function customObligationTypeId(type: string): string | null {
  return type?.startsWith("custom_") ? type.slice("custom_".length) : null;
}

/**
 * Encargos de texto livre não têm categoria financeira possível: o usuário
 * classifica depois em Financeiro. Usado para exibir o aviso discreto.
 */
export function isUncategorizedObligation(type: string): boolean {
  return type === "other" || !!customObligationTypeId(type);
}

export const UNCATEGORIZED_OBLIGATION_NOTICE =
  "Este encargo será lançado sem categoria financeira. Você pode classificá-lo depois em Financeiro.";

export function resolveObligationLabel(
  type: string,
  label?: string | null,
  customTypeNames?: Record<string, string> | null
): string {
  const explicit = label?.trim();
  if (explicit) return explicit;

  const known = ADDITIONAL_OBLIGATION_LABELS[type];
  if (known) return known;

  const customId = customObligationTypeId(type);
  const customName = customId ? customTypeNames?.[customId]?.trim() : "";
  if (customName) return customName;

  return FALLBACK_OBLIGATION_LABEL;
}
