import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { defaultBusinessType, suggestedDealValue } from "./CreateDealDialog";
describe("CRM defaults", () => {
  it("tipo pelo histórico ou nome do funil", () => {
    expect(defaultBusinessType(["rental", "sale", "rental"], "X")).toBe("rental");
    expect(defaultBusinessType([], "Aluguel")).toBe("rental");
    expect(defaultBusinessType([], "LOCAÇÃO")).toBe("rental");
    expect(defaultBusinessType([], "Vendas")).toBe("sale");
  });
  it("valor pelo tipo", () => {
    const u: any = { price: 500000, rent_price: 3000, free_fractions: [] };
    expect(suggestedDealValue(u, "sale")).toBe(500000);
    expect(suggestedDealValue(u, "rental")).toBe(3000);
    expect(suggestedDealValue({ ...u, free_fractions: [{ label: "Loja A", rent_price: 1200 }] }, "rental")).toBe(1200);
  });
});
