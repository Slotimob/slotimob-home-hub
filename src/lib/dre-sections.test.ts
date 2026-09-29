import { describe, it, expect } from "vitest";
import { buildDRESections, dreRegimeFilter } from "./dre-sections";
const cat = (id: string, name: string, dre_type: string | null) => ({ id, name, dre_type });
describe("buildDRESections", () => {
  it("IRRF fica fora das deduções, antes do resultado", () => {
    const r = buildDRESections([
      { amount: 4000, type: "income", financial_categories: cat("a", "Aluguel", "gross_revenue") },
      { amount: 300, type: "expense", obligation_type: "irrf", financial_categories: cat("i", "IRRF Retido na Fonte", "tax_deduction") },
      { amount: 100, type: "expense", financial_categories: cat("j", "IRRF Retido na Fonte", "tax_deduction") },
      { amount: 200, type: "expense", financial_categories: cat("t", "ISS", "tax_deduction") },
    ]);
    expect(r.taxDeductions.total).toBe(200);
    expect(r.netRevenue).toBe(3800);
    expect(r.irrfWithheld.total).toBe(400);
    expect(r.netResult).toBe(3400);
  });
  it("não categorizado separado por tipo; transferências fora", () => {
    const r = buildDRESections([
      { amount: 50, type: "income", financial_categories: null },
      { amount: 20, type: "expense", financial_categories: cat("x", "X", null) },
      { amount: 999, type: "expense", obligation_type: "transfer", financial_categories: null },
    ]);
    expect(r.uncategorizedRevenue).toBe(50);
    expect(r.uncategorizedExpense).toBe(20);
    expect(r.netResult).toBe(30);
  });
});
describe("dreRegimeFilter", () => {
  it("caixa filtra por paid_date e só pagos", () => {
    const f = dreRegimeFilter("caixa", [{ start: "2026-09-01", end: "2026-09-30" }]);
    expect(f.paidOnly).toBe(true);
    expect(f.or).toBe("and(paid_date.gte.2026-09-01,paid_date.lte.2026-09-30)");
  });
});
