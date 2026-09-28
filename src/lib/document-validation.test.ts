import { describe, it, expect } from "vitest";
import { isValidCPF, isValidCNPJ, isValidCpfCnpj, onlyDigits } from "./document-validation";

describe("document-validation", () => {
  it("CPF", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("123.456.789-00")).toBe(false);
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });
  it("CNPJ", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11.222.333/0001-00")).toBe(false);
  });
  it("isValidCpfCnpj sem tipo", () => {
    expect(isValidCpfCnpj("529.982.247-25")).toBe(true);
    expect(isValidCpfCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCpfCnpj("12345")).toBe(false);
    expect(isValidCpfCnpj("529.982.247-25", "CNPJ")).toBe(false);
    expect(onlyDigits("a1.2-3")).toBe("123");
  });
});
