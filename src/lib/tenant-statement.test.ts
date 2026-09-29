import { describe, it, expect } from "vitest";
import { buildTenantStatementMonths, rowInStatementRange } from "./tenant-statement";

const periods = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
const grace: any = { enabled: true, tiers: [{ months: 1, mode: "free", value: 0 }] };

describe("buildTenantStatementMonths", () => {
  it("contrato novo com carência isenta: só setembro, status grace", () => {
    const r = buildTenantStatementMonths({
      periods, lease: { start_date: "2026-09-01", due_day: 5, rent_grace: grace }, rows: [], groups: {}, today: "2026-09-28",
    });
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe("grace");
    expect(r[0].amount).toBe(0);
  });
  it("mês passado sem linhas fora da carência vira not_launched", () => {
    const r = buildTenantStatementMonths({
      periods, lease: { start_date: "2026-08-01", due_day: 5, rent_grace: grace }, rows: [], groups: {}, today: "2026-09-28",
    });
    expect(r.map((x) => x.status)).toEqual(["grace", "not_launched"]);
    expect(r.some((x) => x.status === "overdue")).toBe(false);
  });
  it("linha de aluguel pendente vencida continua overdue", () => {
    const r = buildTenantStatementMonths({
      periods, lease: { start_date: "2026-09-01", due_day: 5 },
      rows: [{ id: "1", type: "income", obligation_type: "rent", amount: 4000, status: "pending", due_date: "2026-09-05", competency_period: "2026-09" }],
      groups: {}, today: "2026-09-28",
    });
    expect(r[0].status).toBe("overdue");
    expect(r[0].amount).toBe(4000);
  });
  it("pagamento antecipado (pago no período, vence depois) entra no extrato", () => {
    const r = buildTenantStatementMonths({
      periods, lease: { start_date: "2026-09-01", due_day: 10 },
      rows: [
        { id: "1", type: "income", obligation_type: "rent", amount: 2900, status: "paid", paid_date: "2026-09-20", due_date: "2026-09-10", competency_period: "2026-09" },
        { id: "2", type: "income", obligation_type: "rent", amount: 2900, status: "paid", paid_date: "2026-09-20", due_date: "2026-10-10", competency_period: "2026-10" },
      ],
      groups: {}, today: "2026-09-28", range: { start: "2026-04-01", end: "2026-09-30" },
    });
    expect(r.map((x) => x.reference)).toEqual(["09/2026", "10/2026"]);
    expect(r.reduce((s, x) => s + x.totalPaid, 0)).toBe(5800);
  });
  it("vencimento futuro em aberto fora do período não entra", () => {
    const r = buildTenantStatementMonths({
      periods, lease: { start_date: "2026-09-01", due_day: 10 },
      rows: [{ id: "2", type: "income", obligation_type: "rent", amount: 2900, status: "pending", due_date: "2026-10-10", competency_period: "2026-10" }],
      groups: {}, today: "2026-09-28", range: { start: "2026-04-01", end: "2026-09-30" },
    });
    expect(r.map((x) => x.reference)).toEqual(["09/2026"]);
  });
  it("rowInStatementRange: paga por paid_date, aberta por due_date", () => {
    const range = { start: "2026-09-01", end: "2026-09-30" };
    expect(rowInStatementRange({ status: "paid", paid_date: "2026-09-02", due_date: "2026-11-10" }, range)).toBe(true);
    expect(rowInStatementRange({ status: "paid", paid_date: "2026-08-30", due_date: "2026-09-10" }, range)).toBe(false);
    expect(rowInStatementRange({ status: "pending", due_date: "2026-09-10" }, range)).toBe(true);
  });
});
