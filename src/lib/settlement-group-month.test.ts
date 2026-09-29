import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { rentMonthSummary, collectRentMonthLines, type SettlementLine } from "./settlement-group";

describe("rentMonthSummary", () => {
  it("junta âncora parcial + saldo pago depois", () => {
    const anchor: SettlementLine = { id: "A", type: "income", amount: 1640, obligation_type: "rent", status: "paid", paid_date: "2026-09-28", settlement_group_id: "G1", metadata: { original_amount: 2000, partial_payment: true } };
    const g1: SettlementLine[] = [
      anchor,
      { id: "L", type: "income", amount: 50, obligation_type: "rent_addition_late_fee", status: "paid", paid_date: "2026-09-28", settlement_group_id: "G1" },
      { id: "D", type: "expense", amount: 600, obligation_type: "rent_deduction_x", status: "paid", paid_date: "2026-09-28", settlement_group_id: "G1" },
      { id: "I", type: "expense", amount: 90, obligation_type: "irrf", status: "paid", paid_date: "2026-09-28", settlement_group_id: "G1" },
    ];
    const bal: SettlementLine[] = [
      { id: "B", type: "income", amount: 360, obligation_type: "rent_balance", status: "paid", paid_date: "2026-10-20", settlement_group_id: "G2", metadata: { balance_of: "A" } },
      { id: "X", type: "income", amount: 40, obligation_type: "rent_addition_other", status: "paid", paid_date: "2026-10-20", settlement_group_id: "G2" },
    ];
    const s = rentMonthSummary(anchor, collectRentMonthLines(anchor, g1, bal));
    expect(s.gross).toBe(2000);
    expect(s.net).toBe(1400);
    expect(s.receipts).toEqual([
      { date: "2026-09-28", amount: 1000 },
      { date: "2026-10-20", amount: 400 },
    ]);
    expect(s.openBalance).toBe(0);
  });
});
