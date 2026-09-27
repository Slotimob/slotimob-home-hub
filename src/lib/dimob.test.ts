import { describe, it, expect } from "vitest";
import { buildDimobMonths } from "./dimob";

const opts = { adminFeePercentage: 10, administrationFeeValue: null };

describe("buildDimobMonths", () => {
  it("aluguel pago em atraso cai no mês do pagamento", () => {
    const r = buildDimobMonths([{ type: "income", amount: 1000, obligation_type: "rent", paid_date: "2025-04-03" }], opts);
    expect(r.months[3].rent).toBe(1000);
    expect(r.months[2].rent).toBe(0);
  });
  it("multa soma no aluguel; IRRF vai para imposto", () => {
    const r = buildDimobMonths(
      [
        { type: "income", amount: 1000, obligation_type: null, paid_date: "2025-01-10" },
        { type: "income", amount: 20, obligation_type: "rent_addition_late_fee", paid_date: "2025-01-10" },
        { type: "expense", amount: 50, obligation_type: "irrf", paid_date: "2025-01-10" },
      ],
      opts
    );
    expect(r.months[0].rent).toBe(1020);
    expect(r.months[0].tax).toBe(50);
  });
  it("abatimento não reduz; desconto reduz", () => {
    const r = buildDimobMonths(
      [
        { type: "income", amount: 1000, obligation_type: "rent", paid_date: "2025-02-10", metadata: { gross_amount: 1200 } },
        { type: "expense", amount: 300, obligation_type: "rent_deduction_iptu", paid_date: "2025-02-10" },
        { type: "expense", amount: 100, obligation_type: "rent_discount", paid_date: "2025-02-10" },
      ],
      opts
    );
    expect(r.months[1].rent).toBe(1100);
    expect(r.deductions).toBe(300);
  });
  it("comissão estimada pelo percentual; real quando há taxa lançada", () => {
    const est = buildDimobMonths([{ type: "income", amount: 1000, paid_date: "2025-05-10" }], opts);
    expect(est.commissionEstimated).toBe(true);
    expect(est.months[4].commission).toBe(100);
    expect(est.months[5].commission).toBe(0);
    const real = buildDimobMonths(
      [
        { type: "income", amount: 1000, paid_date: "2025-05-10" },
        { type: "income", amount: 80, obligation_type: "admin_fee", paid_date: "2025-06-02", category: { name: "Taxa de Administração" } },
      ],
      opts
    );
    expect(real.commissionEstimated).toBe(false);
    expect(real.months[5].commission).toBe(80);
    expect(real.months[5].rent).toBe(0);
  });
});
