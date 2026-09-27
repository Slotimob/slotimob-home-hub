import { describe, it, expect } from "vitest";
import { getEffectiveStatus } from "./transaction-status";

const TODAY = "2026-09-27";

describe("getEffectiveStatus", () => {
  it("pago com vencimento passado continua pago", () => {
    expect(getEffectiveStatus({ status: "paid", due_date: "2026-09-05" }, TODAY)).toBe("paid");
  });
  it("pendente vencido ontem vira atrasado", () => {
    expect(getEffectiveStatus({ status: "pending", due_date: "2026-09-26" }, TODAY)).toBe("overdue");
  });
  it("pendente que vence hoje continua pendente", () => {
    expect(getEffectiveStatus({ status: "pending", due_date: TODAY }, TODAY)).toBe("pending");
  });
  it("pendente sem vencimento continua pendente", () => {
    expect(getEffectiveStatus({ status: "pending", due_date: null }, TODAY)).toBe("pending");
  });
  it("cancelado continua cancelado", () => {
    expect(getEffectiveStatus({ status: "cancelled", due_date: "2026-09-01" }, TODAY)).toBe("cancelled");
  });
  it("overdue gravado é atrasado", () => {
    expect(getEffectiveStatus({ status: "overdue", due_date: "2026-12-01" }, TODAY)).toBe("overdue");
  });
});
