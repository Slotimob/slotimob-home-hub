import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { settlementNet, settlementBreakdown } from "./settlement-group";

const line = (type: string, amount: number, obligation_type: string | null = null, status = "pending") => ({
  id: Math.random().toString(),
  type,
  amount,
  obligation_type,
  status,
});

describe("settlementNet", () => {
  it("receitas − despesas", () => {
    expect(
      settlementNet([line("income", 3000, "rent"), line("expense", 500, "rent_deduction_x"), line("expense", 120.55, "irrf")])
    ).toBe(2379.45);
  });
  it("ignora canceladas", () => {
    expect(settlementNet([line("income", 1000), line("expense", 200, "irrf", "cancelled")])).toBe(1000);
  });
  it("grupo vazio = 0", () => {
    expect(settlementNet([])).toBe(0);
  });
  it("breakdown separa abatimentos e IRRF", () => {
    const b = settlementBreakdown([
      line("income", 2000, "rent"),
      line("expense", 300, "rent_deduction_repair"),
      line("expense", 50, "irrf"),
    ]);
    expect(b).toEqual({ rent: 2000, deductions: 300, irrf: 50, otherExpenses: 0, net: 1650 });
  });
});
