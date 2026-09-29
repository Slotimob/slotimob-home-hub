import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { firstDueOnOrAfter, buildRentInstallments } from "@/lib/lease-projection";

const d = (s: string) => new Date(`${s}T00:00:00`);
const f = (x: Date) => format(x, "yyyy-MM-dd");

describe("firstDueOnOrAfter", () => {
  it("início 01/10, dia 10", () => expect(f(firstDueOnOrAfter(d("2026-10-01"), 10))).toBe("2026-10-10"));
  it("início 29/09, dia 10 vai para outubro", () => expect(f(firstDueOnOrAfter(d("2026-09-29"), 10))).toBe("2026-10-10"));
  it("início no próprio dia", () => expect(f(firstDueOnOrAfter(d("2026-09-10"), 10))).toBe("2026-09-10"));
  it("clamp de fevereiro", () => expect(f(firstDueOnOrAfter(d("2027-01-31"), 30))).toBe("2027-02-28"));
});

describe("buildRentInstallments — 1º vencimento >= início", () => {
  const run = (start: string, dueDay: number) => buildRentInstallments({ startDate: start, months: 3, amount: 1000, dueDay });
  it("início 01/10/2026, dia 10", () => {
    const [a] = run("2026-10-01", 10);
    expect([a.competencyPeriod, a.issueDate, a.dueDate]).toEqual(["2026-10", "2026-10-01", "2026-10-10"]);
  });
  it("início 29/09/2026, dia 10", () => {
    const [a, b] = run("2026-09-29", 10);
    expect([a.competencyPeriod, a.issueDate, a.dueDate]).toEqual(["2026-09", "2026-09-29", "2026-10-10"]);
    expect([b.competencyPeriod, b.dueDate]).toEqual(["2026-10", "2026-11-10"]);
    expect(b.issueDate <= b.dueDate).toBe(true);
  });
  it("início 10/09/2026, dia 10", () => expect(run("2026-09-10", 10)[0].dueDate).toBe("2026-09-10"));
  it("início 31/01/2027, dia 30 (clamp, depois volta ao dia 30)", () => {
    const [a, b] = run("2027-01-31", 30);
    expect(a.dueDate).toBe("2027-02-28");
    expect(b.dueDate).toBe("2027-03-30");
  });
  it("pró-rata do 1º mês", () => {
    const [a, b] = buildRentInstallments({ startDate: "2026-09-29", months: 2, amount: 3000, dueDay: 10, proRataFirst: true });
    expect(a.amount).toBe(200);
    expect(b.amount).toBe(3000);
  });
});

import { nextDueFromConfig } from "@/lib/lease-special-conditions";
describe("nextDueFromConfig", () => {
  it("pula competência isenta de carência", () => {
    const r = nextDueFromConfig(
      { start_date: "2026-10-01", due_day: 10, rent_grace: { enabled: true, tiers: [{ months: 1, mode: "free", value: 0 }] } as any },
      "2026-09-29",
    );
    expect(r).toEqual({ competency: "2026-11", dueDate: "2026-11-10" });
  });
  it("início 29/09 dia 10 → 10/10 (competência set)", () => {
    expect(nextDueFromConfig({ start_date: "2026-09-29", due_day: 10 }, "2026-09-29")).toEqual({ competency: "2026-09", dueDate: "2026-10-10" });
  });
});
