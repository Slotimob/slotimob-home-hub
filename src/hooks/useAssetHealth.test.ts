import { describe, it, expect } from "vitest";
import { calculateObligationStatus } from "./useAssetHealth";

const cfg = { active: true, due_day: 10 };
const past = new Date(2020, 0, 15);

describe("calculateObligationStatus", () => {
  it("sem transação em mês passado → not_launched", () => {
    expect(calculateObligationStatus(cfg, null, past)).toBe("not_launched");
  });
  it("transação pendente vencida → overdue", () => {
    expect(
      calculateObligationStatus(cfg, { status: "pending", transaction_date: "2020-01-10", due_date: "2020-01-10" }, past)
    ).toBe("overdue");
  });
  it("mês futuro sem transação → pending", () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    expect(calculateObligationStatus(cfg, null, future)).toBe("pending");
  });
  it("competência antes do início do contrato → before_contract", () => {
    expect(calculateObligationStatus(cfg, null, new Date(2026, 7, 15), "2026-09-29")).toBe("before_contract");
  });
  it("mês do início sem transação → not_launched", () => {
    expect(calculateObligationStatus(cfg, null, new Date(2026, 8, 15), "2026-09-29")).not.toBe("before_contract");
  });
  it("pago antes do início continua pago", () => {
    expect(
      calculateObligationStatus(cfg, { status: "paid", transaction_date: "2026-08-10" }, new Date(2026, 7, 15), "2026-09-29")
    ).toBe("paid");
  });
});
