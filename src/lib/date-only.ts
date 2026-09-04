import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Colunas `date` do Postgres chegam como "yyyy-MM-dd".
 * `new Date("2026-10-01")` interpreta como MEIA-NOITE UTC, que em BRT (UTC-3)
 * é 30/09 21:00 — formatar isso em horário local imprime o dia ANTERIOR.
 *
 * Estes helpers existem para que nenhuma coluna `date` passe por `new Date(string)`.
 * Para colunas `timestamptz` (created_at, updated_at, reconciled_at...) continue
 * usando `new Date(valor)` normalmente — ali o instante é real e o fuso é correto.
 */

/** "2026-10-01" -> Date local no meio-dia (meio-dia blinda contra qualquer salto de fuso). */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-10-01" -> "01/10/2026". Devolve o fallback quando o valor é vazio ou inválido. */
export function formatDateOnly(
  value: string | null | undefined,
  pattern = "dd/MM/yyyy",
  fallback = "-",
): string {
  const date = parseDateOnly(value);
  if (!date) return fallback;
  return format(date, pattern, { locale: ptBR });
}

/** Date -> "yyyy-MM-dd" no fuso LOCAL. Substitui `.toISOString().split("T")[0]`, que erra o dia após as 21h em BRT. */
export function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Hoje como "yyyy-MM-dd" no fuso local. */
export function todayDateOnly(): string {
  return toDateOnly(new Date());
}
