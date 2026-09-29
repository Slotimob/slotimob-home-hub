import { describe, it, expect } from "vitest";
import { unitAvailability } from "@/lib/unit-availability";

describe("unitAvailability", () => {
  const u = { status: "rented", has_subdivisions: true };
  it("algumas frações ocupadas = partial", () => {
    const a = unitAvailability(u, [{ status: "rented", tenant_contact_id: "x" }, { status: "available", tenant_contact_id: null }]);
    expect(a.kind).toBe("partial");
    expect(a.label).toBe("Parcialmente alugado (1 de 2 frações)");
    expect(a.freeCount).toBe(1);
  });
  it("todas livres = available", () => {
    expect(unitAvailability({ status: "available", has_subdivisions: true }, [{ status: "available" }]).kind).toBe("available");
  });
  it("todas ocupadas = rented", () => {
    expect(unitAvailability(u, [{ tenant_contact_id: "a" }, { tenant_contact_id: "b" }]).kind).toBe("rented");
  });
  it("sem frações segue o status", () => {
    expect(unitAvailability({ status: "rented", has_subdivisions: false }).kind).toBe("rented");
    expect(unitAvailability({ status: "sold", has_subdivisions: true }, [{ status: "available" }]).kind).toBe("sold");
  });
});
