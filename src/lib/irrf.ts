/**
 * IRRF mensal sobre aluguel — ESTIMATIVA (ano-calendário 2026).
 *
 * Serve só para projetar o valor que o inquilino pessoa jurídica deve reter.
 * O valor válido é SEMPRE o que o inquilino efetivamente reteve e informou
 * no comprovante de rendimentos; o usuário deve ajustar o lançamento se diferir.
 */
export const IRRF_TABLE_YEAR = 2026;

/** Tabela progressiva mensal: [limite superior, alíquota, parcela a deduzir]. */
export const IRRF_MONTHLY_TABLE: ReadonlyArray<{ upTo: number; rate: number; deduction: number }> = [
  { upTo: 2428.8, rate: 0, deduction: 0 },
  { upTo: 2826.65, rate: 0.075, deduction: 182.16 },
  { upTo: 3751.05, rate: 0.15, deduction: 394.16 },
  { upTo: 4664.68, rate: 0.225, deduction: 675.49 },
  { upTo: Infinity, rate: 0.275, deduction: 908.73 },
];

/** Redutor mensal 2026 (Lei 15.270/2025). */
export const IRRF_REDUCTION_EXEMPT_UP_TO = 5000;
export const IRRF_REDUCTION_PHASE_OUT_UP_TO = 7350;
export const IRRF_REDUCTION_CONSTANT = 978.62;
export const IRRF_REDUCTION_FACTOR = 0.133145;

const round2 = (n: number) => Math.round(n * 100) / 100;

function tableTax(base: number): number {
  if (!(base > 0)) return 0;
  const bracket = IRRF_MONTHLY_TABLE.find((b) => base <= b.upTo)!;
  return Math.max(0, base * bracket.rate - bracket.deduction);
}

/**
 * ESTIMATIVA do IRRF mensal.
 * @param grossIncome rendimento bruto do mês (define o redutor de 2026)
 * @param taxableBase base de cálculo após deduções (aplica a tabela)
 * @returns imposto estimado em 2 casas; o valor válido é o efetivamente retido pelo inquilino.
 */
export function estimateIrrfMonthly({
  grossIncome,
  taxableBase,
}: {
  grossIncome: number;
  taxableBase: number;
}): number {
  const tax = tableTax(taxableBase);
  if (grossIncome <= IRRF_REDUCTION_EXEMPT_UP_TO) return 0;
  let reduction = 0;
  if (grossIncome <= IRRF_REDUCTION_PHASE_OUT_UP_TO) {
    reduction = Math.max(0, IRRF_REDUCTION_CONSTANT - IRRF_REDUCTION_FACTOR * grossIncome);
    reduction = Math.min(reduction, tax);
  }
  return round2(Math.max(0, tax - reduction));
}
