import { describe, it, expect } from "vitest";
import { reconciliationRefDate } from "@/lib/reconciliation-order";
import { readStoredRange } from "@/hooks/useReconciliationDateRange";

describe("reconciliationRefDate", () => {
  it("pago usa a data do pagamento", () => {
    expect(reconciliationRefDate({ status: "paid", paid_date: "2026-09-29", due_date: "2026-10-10" })).toBe("2026-09-29");
  });
  it("pendente usa o vencimento", () => {
    expect(reconciliationRefDate({ status: "pending", paid_date: null, due_date: "2026-10-10", transaction_date: "2026-09-01" })).toBe("2026-10-10");
  });
  it("pago sem paid_date cai no vencimento", () => {
    expect(reconciliationRefDate({ status: "paid", due_date: "2026-10-10" })).toBe("2026-10-10");
  });
});

describe("readStoredRange", () => {
  const now = new Date(2026, 8, 29, 15);
  it("formato antigo (datas soltas) migra para last30 recalculado", () => {
    const r = readStoredRange(JSON.stringify({ from: "2026-08-29T03:00:00Z", to: "2026-09-28T03:00:00Z" }), now);
    expect(r.preset).toBe("last30");
    expect(r.range.to.getDate()).toBe(29);
  });
  it("custom mantém as datas", () => {
    const r = readStoredRange(JSON.stringify({ preset: "custom", from: "2026-01-01T03:00:00Z", to: "2026-01-31T03:00:00Z" }), now);
    expect(r.preset).toBe("custom");
  });
  it("thisMonth recalcula", () => {
    const r = readStoredRange(JSON.stringify({ preset: "thisMonth" }), now);
    expect(r.range.from.getDate()).toBe(1);
    expect(r.range.from.getMonth()).toBe(8);
  });
});
