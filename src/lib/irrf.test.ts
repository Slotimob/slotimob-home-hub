import { describe, it, expect } from "vitest";
import { estimateIrrfMonthly } from "./irrf";

describe("estimateIrrfMonthly (2026)", () => {
  it("2.000 é isento", () => {
    expect(estimateIrrfMonthly({ grossIncome: 2000, taxableBase: 2000 })).toBe(0);
  });
  it("4.800 bruto zera pelo redutor", () => {
    expect(estimateIrrfMonthly({ grossIncome: 4800, taxableBase: 4800 })).toBe(0);
  });
  it("6.000 aplica tabela menos redutor", () => {
    const tax = 6000 * 0.275 - 908.73;
    const red = 978.62 - 0.133145 * 6000;
    expect(estimateIrrfMonthly({ grossIncome: 6000, taxableBase: 6000 })).toBeCloseTo(tax - red, 2);
  });
  it("10.000 sem redutor", () => {
    expect(estimateIrrfMonthly({ grossIncome: 10000, taxableBase: 10000 })).toBeCloseTo(10000 * 0.275 - 908.73, 2);
  });
});
