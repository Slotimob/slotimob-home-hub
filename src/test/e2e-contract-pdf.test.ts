// jsdom (setup global exige window)
/**
 * Gera o PDF do contrato de TESTE com a Matriz de Responsabilidades preenchida
 * (seguro incêndio = proprietário, condomínio = imobiliária) e grava em /tmp
 * para inspeção visual.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import type { LegalContractData } from "@/utils/legalContractPdfGenerator";

const OUT = "/tmp/browser/contrato-teste.pdf";
const OUT_EMPTY = "/tmp/browser/contrato-teste-sem-encargos.pdf";

async function generate(data: LegalContractData, out: string) {
  const { default: jsPDF } = await import("jspdf");
  (jsPDF as any).prototype.save = function (this: any) {
    fs.writeFileSync(out, Buffer.from(this.output("arraybuffer")));
    return this;
  };
  const { generateLegalContractPDF } = await import("@/utils/legalContractPdfGenerator");
  await generateLegalContractPDF(data, "contrato-teste.pdf");
}

const base: LegalContractData = {
  locador: {
    nome: "ZZ TESTE Proprietario Agente",
    cpf: "111.222.333-44",
    endereco: "Rua Teste 1",
    cidade: "Sao Paulo",
    estado: "SP",
    email: "zz.owner.teste@example.com",
    nacionalidade: "brasileiro(a)",
  } as any,
  locatario: {
    nome: "ZZ TESTE Inquilino Agente",
    cpf: "222.333.444-55",
    endereco: "Rua Teste 2",
    cidade: "Sao Paulo",
    estado: "SP",
    email: "zz.tenant.teste@example.com",
    nacionalidade: "brasileiro(a)",
  } as any,
  imovel: {
    endereco: "Rua do Teste Automatizado, 999",
    numero: "999",
    cidade: "Sao Paulo",
    estado: "SP",
    tipo: "apartamento",
  } as any,
  contrato: {
    valorAluguel: 3000,
    diaVencimento: 10,
    dataInicio: "2026-09-01",
    dataFim: "2027-08-31",
    prazoMeses: 12,
    indiceReajuste: "IPCA",
    garantia: "nenhuma",
    finalidade: "residencial",
  },
};

const comEncargos: LegalContractData = {
  ...base,
  imobiliaria: {
    nome: "ZZ TESTE Imobiliaria Agente LTDA",
    cnpj: "12.345.678/0001-99",
    endereco: "Av Teste 3000",
    cidade: "Sao Paulo",
    estado: "SP",
    email: "zz.agency.teste@example.com",
  },
  encargos: [
    {
      key: "admin_fee",
      label: "Taxa de administração imobiliária",
      responsavelTipo: "owner",
      responsavelNome: "ZZ TESTE Proprietario Agente",
      valor: 3000 * 0.08,
      periodicidade: "mensal, equivalente a 8% do aluguel",
      observacao:
        "devida à administradora ZZ TESTE Imobiliaria Agente LTDA e retida do repasse ao LOCADOR",
    },
    {
      key: "insurance",
      label: "Seguro contra incêndio",
      responsavelTipo: "owner",
      responsavelNome: "ZZ TESTE Proprietario Agente",
      valor: 50,
      periodicidade: "12 parcelas",
    },
    {
      key: "condominium",
      label: "Condomínio (despesas ordinárias)",
      responsavelTipo: "agency",
      responsavelNome: "ZZ TESTE Imobiliaria Agente LTDA",
      valor: 450,
      periodicidade: "mensal",
    },
  ],
};

describe("PDF do contrato de teste", () => {
  it("gera com a Matriz de Responsabilidades", async () => {
    await generate(comEncargos, OUT);
    expect(fs.existsSync(OUT)).toBe(true);
    expect(fs.statSync(OUT).size).toBeGreaterThan(10000);
  });

  it("gera sem nenhum encargo configurado (fallback estático)", async () => {
    await generate(base, OUT_EMPTY);
    expect(fs.existsSync(OUT_EMPTY)).toBe(true);
  });
});
