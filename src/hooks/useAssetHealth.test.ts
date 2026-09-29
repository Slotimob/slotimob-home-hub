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
});
