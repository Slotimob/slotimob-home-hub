import { describe, it, expect } from "vitest";
import { orderDueDateGroups } from "./reconciliation-order";
describe("orderDueDateGroups", () => {
  it("atrasados, período, futuros", () => {
    const g = ["2027-09-10", "2026-08-01", "2026-09-05", "2026-07-01", "2026-10-10", "2026-09-20"].map((date) => ({ date, items: [] }));
    expect(orderDueDateGroups(g, "2026-09-01", "2026-09-30").map((x) => x.date)).toEqual([
      "2026-08-01", "2026-07-01", "2026-09-05", "2026-09-20", "2026-10-10", "2027-09-10",
    ]);
  });
});
