import { describe, it, expect } from "vitest";
import { buildSpecialConditionsClauses, buildRenewalClause } from "./lease-contract-clauses";

describe("lease-contract-clauses", () => {
  it("gera as 4 subcláusulas", () => {
    const c = buildSpecialConditionsClauses(
      {
        carencia: { enabled: true, first_competency: "2026-09", tiers: [{ months: 1, mode: "free" }, { months: 1, mode: "percent", value: 50 }] } as any,
        abatimentos: [{ id: "a", enabled: true, label: "condomínio extra", reason: "condominium_extra", amount: 300, recurrence: "installments", installments: 2, first_competency: "2026-09" }],
        retencaoIrrf: { enabled: true, tax: "irrf", mode: "percent", percent: 5, base_deductions: { iptu: false, condominium: false, admin_fee: false } },
        rateio: [{ imovel: "Casa", percentual: 60 }, { imovel: "Galpão — Loja B", percentual: 40 }],
        locatarioTipoDocumento: "CNPJ",
      },
      "2026-09-01"
    );
    expect(c).toHaveLength(4);
    expect(c[0]).toContain("isento");
    expect(c[0]).toContain("50% de desconto");
    expect(c[1]).toContain("2 parcelas a partir de 09/2026");
    expect(c[2]).toContain("(5%)");
    expect(c[3]).toContain("Casa 60%; Galpão — Loja B 40%");
  });
  it("IRRF não entra com locatário pessoa física ou sem documento", () => {
    const w = { enabled: true, tax: "irrf", mode: "percent", percent: 5, base_deductions: { iptu: false, condominium: false, admin_fee: false } } as any;
    expect(buildSpecialConditionsClauses({ retencaoIrrf: w, locatarioTipoDocumento: "CPF" }, "2026-09-01")).toEqual([]);
    expect(buildSpecialConditionsClauses({ retencaoIrrf: w }, "2026-09-01")).toEqual([]);
    expect(buildSpecialConditionsClauses({ retencaoIrrf: w, locatarioTipoDocumento: "CNPJ" }, "2026-09-01")).toHaveLength(1);
  });
  it("sem condições", () => {
    expect(buildSpecialConditionsClauses({}, "2026-09-01")).toEqual([]);
  });
  it("prorrogação", () => {
    expect(buildRenewalClause("residencial", 30)).toContain("artigo 46");
    expect(buildRenewalClause("residencial", 12)).toContain("artigo 47");
    expect(buildRenewalClause("comercial", 12)).toContain("artigo 56, parágrafo único");
  });
});
