import { describe, expect, it } from "vitest";
import {
  buildRentInstallments,
  resolveAnniversaryCompetency,
  resolveFirstAdjustedDueDate,
  resolveRentDueOffset,
} from "./lease-projection";
import { format } from "date-fns";

describe("resolveAnniversaryCompetency", () => {
  it("primeiro dia do mês do aniversário", () => {
    expect(format(resolveAnniversaryCompetency("2027-03-01"), "yyyy-MM")).toBe("2027-03");
  });

  it("dia no meio do mês aponta para o próprio mês", () => {
    expect(format(resolveAnniversaryCompetency("2027-03-15"), "yyyy-MM")).toBe("2027-03");
  });

  it("último dia do mês aponta para o próprio mês", () => {
    expect(format(resolveAnniversaryCompetency("2026-08-31"), "yyyy-MM")).toBe("2026-08");
  });
});

describe("resolveRentDueOffset", () => {
  it("aluguel vencido (padrão legal): vence no mês seguinte à competência", () => {
    expect(resolveRentDueOffset({ competencyPeriod: "2027-02", dueDate: "2027-03-10" })).toBe(1);
  });

  it("aluguel antecipado: vence no mesmo mês da competência", () => {
    expect(resolveRentDueOffset({ competencyPeriod: "2027-02", dueDate: "2027-02-10" })).toBe(0);
  });

  it("sem série retorna 1 (vencido)", () => {
    expect(resolveRentDueOffset(null)).toBe(1);
    expect(resolveRentDueOffset(undefined)).toBe(1);
    expect(resolveRentDueOffset({})).toBe(1);
  });

  it("fora da faixa 0..2 retorna 1", () => {
    expect(resolveRentDueOffset({ competencyPeriod: "2027-02", dueDate: "2027-08-10" })).toBe(1);
  });
});

describe("resolveFirstAdjustedDueDate", () => {
  it("vencido: competência março/2027, dia 10 → 10/04/2027", () => {
    expect(format(resolveFirstAdjustedDueDate(new Date(2027, 2, 1), 10, 1), "yyyy-MM-dd")).toBe(
      "2027-04-10"
    );
  });

  it("antecipado: competência março/2027, dia 10 → 10/03/2027", () => {
    expect(format(resolveFirstAdjustedDueDate(new Date(2027, 2, 1), 10, 0), "yyyy-MM-dd")).toBe(
      "2027-03-10"
    );
  });

  it("dia 31 em mês curto → 28/02/2027", () => {
    expect(format(resolveFirstAdjustedDueDate(new Date(2027, 0, 1), 31, 1), "yyyy-MM-dd")).toBe(
      "2027-02-28"
    );
  });
});

describe("buildRentInstallments com existingRentCompetencies", () => {
  it("marca como já lançada a competência existente mesmo com vencimento diferente", () => {
    const result = buildRentInstallments({
      startDate: "2027-02-01",
      months: 2,
      amount: 1000,
      dueDay: 15,
      existingRentCompetencies: new Set(["2027-03"]),
    });

    const fevereiro = result.find((r) => r.competencyPeriod === "2027-02");
    const marco = result.find((r) => r.competencyPeriod === "2027-03");

    expect(fevereiro?.alreadyExists).toBe(false);
    expect(marco?.alreadyExists).toBe(true);
    // A parcela de março tem vencimento diferente do que geraria por padrão (competência != vencimento).
    expect(marco?.dueDate).toBe("2027-03-15");
  });
});
