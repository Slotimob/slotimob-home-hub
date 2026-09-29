import { describe, it, expect } from "vitest";
import { settlementBreakdown, type SettlementLine } from "@/lib/settlement-group";

describe("settlementBreakdown — parcial + saldo + multa + IRRF (T8)", () => {
  // Aluguel 3.000 com IRRF 150: parcial (1.000 recebidos + 150 retidos) e saldo 1.850 pago com 1.950 (100 de multa).
  const lines: SettlementLine[] = [
    { id: "a", type: "income", amount: 1150, obligation_type: "rent", status: "paid", settlement_group_id: "g1" },
    { id: "i", type: "expense", amount: 150, obligation_type: "irrf", status: "paid", settlement_group_id: "g1" },
    { id: "b", type: "income", amount: 1850, obligation_type: "rent_balance", status: "paid", settlement_group_id: "g2" },
    { id: "m", type: "income", amount: 100, obligation_type: "rent_addition_late_fee", status: "paid", settlement_group_id: "g2" },
  ];

  it("líquido 2.950 descontando o IRRF", () => {
    const b = settlementBreakdown(lines);
    expect(b.rent).toBe(3000);
    expect(b.additions).toBe(100);
    expect(b.irrf).toBe(150);
    expect(b.net).toBe(2950);
  });

  it("grupo incompleto (sem a linha do IRRF) dá o número errado 3.100 — por isso a tela espera o grupo", () => {
    expect(settlementBreakdown(lines.filter((l) => l.id !== "i")).net).toBe(3100);
  });
});
