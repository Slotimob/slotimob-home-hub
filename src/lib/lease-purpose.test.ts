import { describe, it, expect } from "vitest";
import { defaultLeasePurpose, resolveLeasePurpose, leaseTermMonths } from "./lease-purpose";

describe("lease-purpose", () => {
  it("padrão pelos tipos", () => {
    expect(defaultLeasePurpose(["casa", "galpao"])).toBe("comercial");
    expect(defaultLeasePurpose(["apartamento", null])).toBe("residencial");
  });
  it("metadata.purpose tem prioridade", () => {
    expect(resolveLeasePurpose({ metadata: { purpose: "residencial" }, unit: { property_type: "loja" } })).toBe("residencial");
    expect(resolveLeasePurpose({ unit: { property_type: "casa" }, lease_units: [{ unit: { property_type: "galpao" } }] })).toBe("comercial");
  });
  it("prazo em meses", () => {
    expect(leaseTermMonths("2026-09-01", "2027-08-31")).toBe(12);
    expect(leaseTermMonths("2026-03-15", "2027-03-14")).toBe(12);
    expect(leaseTermMonths("2026-09-01", "2026-09-30")).toBe(1);
    expect(leaseTermMonths("2026-09-01", "2029-08-31")).toBe(36);
  });
});
