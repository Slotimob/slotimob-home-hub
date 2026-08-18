/**
 * Shared rent adjustment math.
 *
 * Single source of truth for "reajuste de aluguel" so the management flow
 * (AdjustmentCalculatorDialog) and the public calculator
 * (ReajusteAluguelCalculator) can never drift apart again.
 */

/** Rounds a monetary value to cents, avoiding float artifacts (2613.4500000000003). */
export const roundToCents = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export interface RentAdjustmentResult {
  /** New rent, already rounded to cents — safe to persist. */
  newRent: number;
  /** Difference between new and current rent, rounded to cents. */
  difference: number;
  /** Normalized percentage actually applied. */
  indexPercentage: number;
}

/**
 * Applies an index percentage over the current rent.
 * `indexPercentage` is a percentage (e.g. 4.538 for 4,538%) and keeps every
 * decimal the user typed — only the resulting money value is rounded.
 */
export const calculateRentAdjustment = (
  currentRent: number,
  indexPercentage: number
): RentAdjustmentResult => {
  const rent = Number.isFinite(currentRent) ? currentRent : 0;
  const pct = Number.isFinite(indexPercentage) ? indexPercentage : 0;

  const newRent = roundToCents(rent * (1 + pct / 100));

  return {
    newRent,
    difference: roundToCents(newRent - rent),
    indexPercentage: pct,
  };
};
