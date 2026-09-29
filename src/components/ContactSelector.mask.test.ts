import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { maskDocumentTail } from "./ContactSelector";
describe("maskDocumentTail", () => {
  it("mascara CPF e CNPJ", () => {
    expect(maskDocumentTail("123.456.789-25".replace("789-25","747-25"))).toBe("CPF •••.•••.•47-25");
    expect(maskDocumentTail("12.345.678/0001-25")).toBe("CNPJ ••.•••.•••/••01-25");
    expect(maskDocumentTail("")).toBeNull();
  });
});
