import { graceSummary } from "./lease-special-conditions";
import type { RentDeductionConfig, RentGraceConfig, RentWithholdingConfig } from "@/hooks/useLeases";

export interface ContractSpecialConditions {
  carencia?: RentGraceConfig | null;
  abatimentos?: RentDeductionConfig[] | null;
  retencaoIrrf?: RentWithholdingConfig | null;
  rateio?: { imovel: string; percentual: number }[] | null;
  /** Tipo de documento do LOCATÁRIO: a retenção de IRRF só entra com CNPJ. */
  locatarioTipoDocumento?: "CPF" | "CNPJ" | null;
}

/** "CPF" | "CNPJ" pelos dígitos (11 ou 14); senão null. */
export function documentTypeOf(...docs: (string | null | undefined)[]): "CPF" | "CNPJ" | null {
  for (const d of docs) {
    const n = (d || "").replace(/\D/g, "").length;
    if (n === 14) return "CNPJ";
    if (n === 11) return "CPF";
  }
  return null;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const mmYYYY = (c: string) => `${c.slice(5, 7)}/${c.slice(0, 4)}`;

/** Textos das subcláusulas de condições especiais (sem numeração). */
export function buildSpecialConditionsClauses(c: ContractSpecialConditions, startDate: string): string[] {
  const out: string[] = [];
  const g = graceSummary(c.carencia, startDate);
  if (g.label) out.push(`Fica concedida carência no pagamento do aluguel: ${g.label}.`);

  const deds = (c.abatimentos || []).filter((d) => d.enabled && Number(d.amount) > 0);
  if (deds.length) {
    const parts = deds.map((d) => {
      const rec =
        d.recurrence === "once"
          ? `em parcela única em ${mmYYYY(d.first_competency)}`
          : d.recurrence === "installments"
            ? `por mês em ${Math.max(1, d.installments || 1)} parcelas a partir de ${mmYYYY(d.first_competency)}`
            : `por mês a partir de ${mmYYYY(d.first_competency)}`;
      return `${d.label}, ${brl(Number(d.amount))} ${rec}`;
    });
    out.push(
      `Serão abatidos do aluguel, por serem encargos do LOCADOR, os seguintes valores: ${parts.join("; ")}. A parcela que coincidir com mês de carência será abatida no mês seguinte.`
    );
  }

  const w = c.retencaoIrrf;
  if (w?.enabled && c.locatarioTipoDocumento === "CNPJ") {
    const forma =
      w.mode === "percent" ? `${Number(w.percent || 0).toLocaleString("pt-BR")}%`
      : w.mode === "fixed" ? `${brl(Number(w.fixed_amount || 0))} por mês`
      : "tabela progressiva";
    out.push(
      `Sendo o LOCATÁRIO pessoa jurídica, reterá na fonte o Imposto de Renda devido pelo LOCADOR sobre o aluguel, na forma da legislação vigente (${forma}), entregando ao LOCADOR o comprovante de retenção. O valor retido é considerado pagamento do aluguel.`
    );
  }

  const r = (c.rateio || []).filter((x) => x.percentual > 0);
  if (r.length > 1) {
    out.push(
      `O aluguel total corresponde aos imóveis objeto deste contrato na seguinte proporção: ${r
        .map((x) => `${x.imovel} ${x.percentual.toLocaleString("pt-BR")}%`)
        .join("; ")}.`
    );
  }
  return out;
}

/** Cláusula de prorrogação conforme finalidade e prazo. Texto a ser revisado por advogado. */
export function buildRenewalClause(finalidade: "residencial" | "comercial", prazoMeses: number): string {
  const base =
    "Findo o prazo estipulado, se o LOCATÁRIO continuar na posse do imóvel, sem oposição do LOCADOR, a locação prorroga-se automaticamente por prazo indeterminado, nas mesmas condições ora contratadas, ressalvado o disposto no ";
  if (finalidade === "comercial") return `${base}artigo 56, parágrafo único, da Lei 8.245/91.`;
  return `${base}artigo ${prazoMeses >= 30 ? 46 : 47} da Lei 8.245/91.`;
}
