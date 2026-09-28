import { describe, it, expect } from "vitest";
import { buildRentInstallments } from "./lease-projection";
import {
  resolveGraceSchedule,
  graceSummary,
  resolveDeductionCompetencies,
  buildRentDeductionInstallments,
  buildWithholdingInstallments,
  summarizeSettlement,
} from "./lease-special-conditions";
import type { RentDeductionConfig, RentGraceConfig, RentWithholdingConfig } from "@/hooks/useLeases";

const grace: RentGraceConfig = {
  enabled: true,
  first_competency: "2026-10",
  tiers: [
    { months: 2, mode: "free" },
    { months: 1, mode: "percent", value: 50 },
  ],
};

const rents = (amount = 2000, graceCfg: RentGraceConfig | null = null, months = 6) =>
  buildRentInstallments({
    startDate: "2026-10-01",
    months,
    amount,
    dueDay: 10,
    graceSchedule: resolveGraceSchedule(graceCfg, "2026-10-01"),
  });

const ded = (over: Partial<RentDeductionConfig>): RentDeductionConfig => ({
  id: "abcdef12-0000-0000-0000-000000000000",
  enabled: true,
  label: "Pintura",
  reason: "repair",
  amount: 300,
  recurrence: "once",
  first_competency: "2026-10",
  ...over,
});

describe("carência", () => {
  it("2 meses isentos + 1 a 50%", () => {
    const r = rents(2000, grace);
    expect(r[0]).toMatchObject({ amount: 0, isGrace: true, description: "Aluguel Outubro/2026 (carência: isento)" });
    expect(r[1]).toMatchObject({ amount: 0, isGrace: true });
    expect(r[2]).toMatchObject({ amount: 1000, description: "Aluguel Dezembro/2026 (carência)", meta: { kind: "grace", gross_amount: 2000 } });
    expect(r[2].isGrace).toBeUndefined();
    expect(r[3]).toMatchObject({ amount: 2000, description: "Aluguel Janeiro/2027", meta: { kind: "rent" }, settlementKey: "2027-01" });
  });
  it("resumo", () => {
    const s = graceSummary(grace, "2026-10-01");
    expect(s).toMatchObject({ lastCompetency: "2026-12", freeMonths: 2, reducedMonths: 1 });
    expect(s.label).toBe("Out/2026 a Nov/2026 isento; Dez/2026 com 50% de desconto");
  });
  it("desabilitada gera mapa vazio", () => {
    expect(resolveGraceSchedule({ ...grace, enabled: false }, "2026-10-01").size).toBe(0);
  });
});

describe("abatimentos", () => {
  it("once / installments / monthly", () => {
    const avail = ["2026-10", "2026-11", "2026-12", "2027-01"];
    expect(resolveDeductionCompetencies(ded({}), avail)).toEqual(["2026-10"]);
    expect(resolveDeductionCompetencies(ded({ recurrence: "installments", installments: 3 }), avail)).toEqual([
      "2026-10", "2026-11", "2026-12",
    ]);
    expect(resolveDeductionCompetencies(ded({ recurrence: "monthly", first_competency: "2026-12" }), avail)).toEqual([
      "2026-12", "2027-01",
    ]);
  });

  it("gera parcela com mesmo vencimento e settlementKey do aluguel", () => {
    const r = rents();
    const { installments, skipped } = buildRentDeductionInstallments({
      deductions: [ded({ recurrence: "installments", installments: 3 })],
      rentInstallments: r,
      ownerContactId: "owner",
    });
    expect(skipped).toBe(0);
    expect(installments).toHaveLength(3);
    expect(installments[0]).toMatchObject({
      obligationType: "rent_deduction_abcdef12",
      dueDate: r[0].dueDate,
      settlementKey: "2026-10",
      description: "Abatimento: Pintura (Outubro/2026)",
      contactId: "owner",
      transactionType: "expense",
      meta: { kind: "rent_deduction", deduction_id: "abcdef12-0000-0000-0000-000000000000" },
    });
    expect(installments[0].dedupKey).toBe(`rent_deduction_abcdef12:2026-10:${r[0].dueDate}`);
  });

  it("teto empurra excedente, inclusive de mês isento", () => {
    const r = rents(2000, grace);
    const { installments } = buildRentDeductionInstallments({
      deductions: [ded({ amount: 2500 })],
      rentInstallments: r,
    });
    // Out e Nov isentos (0), Dez paga 1000 -> 1000 em Dez, 1500 em Jan
    expect(installments.map((i) => [i.competencyPeriod, i.amount])).toEqual([
      ["2026-12", 1000],
      ["2027-01", 1500],
    ]);
  });

  it("excedente após o fim da janela vira unallocated", () => {
    const r = rents(1000, null, 2);
    const { installments, unallocated } = buildRentDeductionInstallments({
      deductions: [ded({ amount: 2500 })],
      rentInstallments: r,
    });
    expect(installments.map((i) => i.amount)).toEqual([1000, 1000]);
    expect(unallocated).toBe(500);
  });

  it("competência fora da janela é ignorada e contada", () => {
    const { installments, skipped } = buildRentDeductionInstallments({
      deductions: [ded({ first_competency: "2030-01" })],
      rentInstallments: rents(),
    });
    expect(installments).toHaveLength(0);
    expect(skipped).toBe(1);
  });
});

describe("IRRF", () => {
  const wh = (over: Partial<RentWithholdingConfig>): RentWithholdingConfig => ({
    enabled: true,
    tax: "irrf",
    mode: "fixed",
    fixed_amount: 150,
    base_deductions: { iptu: false, condominium: false, admin_fee: false },
    ...over,
  });

  it("fixed / percent / table", () => {
    const r = rents(10000, null, 1);
    expect(buildWithholdingInstallments({ withholding: wh({}), rentInstallments: r, baseDeductions: {} })[0].amount).toBe(150);
    expect(
      buildWithholdingInstallments({ withholding: wh({ mode: "percent", percent: 1.5 }), rentInstallments: r, baseDeductions: {} })[0].amount
    ).toBe(150);
    const t = buildWithholdingInstallments({ withholding: wh({ mode: "table" }), rentInstallments: r, baseDeductions: {} })[0];
    expect(t.amount).toBeCloseTo(10000 * 0.275 - 908.73, 2);
    expect(t).toMatchObject({ obligationType: "irrf", description: "IRRF retido (Outubro/2026)", settlementKey: "2026-10" });
  });

  it("base com deduções", () => {
    const r = rents(10000, null, 1);
    const [i] = buildWithholdingInstallments({
      withholding: wh({ mode: "table", base_deductions: { iptu: true, condominium: true, admin_fee: true } }),
      rentInstallments: r,
      baseDeductions: { iptu: 200, condominium: 800, adminFeePercent: 10 },
      tenantContactId: "tenant",
    });
    expect(i.meta).toEqual({ kind: "irrf", base: 8000 });
    expect(i.amount).toBeCloseTo(8000 * 0.275 - 908.73, 2);
    expect(i.contactId).toBe("tenant");
  });

  it("não gera em mês isento", () => {
    const r = rents(10000, grace, 3);
    const out = buildWithholdingInstallments({ withholding: wh({}), rentInstallments: r, baseDeductions: {} });
    expect(out.map((i) => i.competencyPeriod)).toEqual(["2026-12"]);
  });
});

describe("summarizeSettlement", () => {
  it("net = aluguel − carência − abatimentos − IRRF", () => {
    const r = rents(2000, null, 1);
    const { installments: d } = buildRentDeductionInstallments({ deductions: [ded({})], rentInstallments: r });
    const w = buildWithholdingInstallments({
      withholding: { enabled: true, tax: "irrf", mode: "fixed", fixed_amount: 100, base_deductions: { iptu: false, condominium: false, admin_fee: false } },
      rentInstallments: r,
      baseDeductions: {},
    });
    expect(summarizeSettlement([...r, ...d, ...w])).toEqual([
      { competency: "2026-10", gross: 2000, grace: 0, deductions: 300, irrf: 100, net: 1600 },
    ]);
  });
});

import { suggestSubscriptionStart } from "./lease-special-conditions";

describe("suggestSubscriptionStart", () => {
  const base = {
    id: "l1",
    rent_amount: 4000,
    due_day: 10,
    start_date: "2026-09-01",
  };

  it("pula carência parcial e abatimentos parcelados", () => {
    const s = suggestSubscriptionStart(
      {
        ...base,
        rent_grace: {
          enabled: true,
          first_competency: "2026-09",
          tiers: [
            { months: 1, mode: "free" },
            { months: 1, mode: "percent", value: 50 },
          ],
        },
        rent_deductions: [
          ded({ label: "condomínio extra", reason: "condominium_extra", recurrence: "installments", installments: 2, first_competency: "2026-09" }),
        ],
        rent_withholding: {
          enabled: true,
          tax: "irrf",
          mode: "percent",
          percent: 5,
          base_deductions: { iptu: false, condominium: false, admin_fee: false },
        },
      },
      "2026-09-28"
    );
    expect(s.firstDue).toBe("2026-11-10");
    expect(s.amount).toBe(3800);
    expect(s.differentMonths).toEqual([
      { competency: "2026-09", net: 0 },
      { competency: "2026-10", net: 1300 },
    ]);
  });

  it("contrato sem condições especiais", () => {
    const s = suggestSubscriptionStart(base, "2026-09-28");
    expect(s.firstDue).toBe("2026-10-10");
    expect(s.amount).toBe(4000);
    expect(s.differentMonths).toEqual([]);
  });
});
