import { describe, it, expect } from "vitest";
import { computeOwnerReport } from "./owner-report";

describe("computeOwnerReport", () => {
  it("sem IRRF: líquido = bruto", () => {
    const r = computeOwnerReport({
      income: [{ amount: 2000, obligation_type: "rent" }],
      expenses: [{ amount: 100, description: "Manutenção portão", obligation_type: "maintenance" }],
      adminFeePercentage: 10,
    });
    expect(r.rentNet).toBe(2000);
    expect(r.rentReceived).toBe(2000);
    expect(r.adminFee).toBe(200);
    expect(r.maintenanceExpenses).toHaveLength(1);
    expect(r.netTransfer).toBe(1700);
  });

  it("com IRRF + abatimento + multa", () => {
    const r = computeOwnerReport({
      income: [
        { amount: 3000, obligation_type: null },
        { amount: 60, obligation_type: "rent_addition_late_fee" },
      ],
      expenses: [
        { amount: 150, obligation_type: "irrf" },
        { amount: 300, obligation_type: "rent_deduction_iptu" },
        { amount: 50, obligation_type: "rent_discount" },
      ],
      adminFeePercentage: 10,
    });
    expect(r.rentGross).toBe(3000);
    expect(r.rentAdditions).toBe(60);
    expect(r.rentNet).toBe(2560);
    expect(r.adminFee).toBe(306);
    expect(r.totalExpenses).toBe(0);
    expect(r.otherDeductions).toHaveLength(0);
    expect(r.netTransfer).toBe(2254);
  });

  it("com encargo repassado: outra receita fora da taxa", () => {
    const r = computeOwnerReport({
      income: [
        { amount: 1000, obligation_type: "rent" },
        { amount: 200, obligation_type: "condominium" },
      ],
      expenses: [{ amount: 200, description: "Condomínio", obligation_type: "condominium" }],
      adminFeePercentage: 10,
    });
    expect(r.otherIncome).toBe(200);
    expect(r.adminFee).toBe(100);
    expect(r.otherDeductions).toHaveLength(1);
    expect(r.netTransfer).toBe(900);
  });
});
