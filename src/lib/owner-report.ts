/**
 * Relatório do proprietário: aluguel LÍQUIDO recebido com o detalhe
 * (bruto + acréscimos − IRRF − abatimentos − descontos).
 * As linhas já chegam filtradas como pagas no período.
 */
export interface OwnerReportTx {
  description?: string | null;
  amount: number | string;
  obligation_type?: string | null;
  paid_date?: string | null;
  transaction_date?: string | null;
}

export interface OwnerReportResult {
  rentGross: number;
  rentAdditions: number;
  rentIrrf: number;
  rentDeductions: number;
  rentDiscounts: number;
  rentNet: number;
  otherIncome: number;
  adminFee: number;
  maintenanceExpenses: { description: string; amount: number; date: string }[];
  otherDeductions: { description: string; amount: number }[];
  totalExpenses: number;
  netTransfer: number;
  /** Compatibilidade: igual a `rentNet`. */
  rentReceived: number;
}

const RENT_TYPES = new Set(["rent", "rent_balance"]);
export const isRentIncome = (t: OwnerReportTx) => !t.obligation_type || RENT_TYPES.has(t.obligation_type);
export const isRentAddition = (t: OwnerReportTx) => !!t.obligation_type?.startsWith("rent_addition");
export const isIrrf = (t: OwnerReportTx) => t.obligation_type === "irrf";
export const isRentDeduction = (t: OwnerReportTx) => !!t.obligation_type?.startsWith("rent_deduction");
export const isRentDiscount = (t: OwnerReportTx) => t.obligation_type === "rent_discount";

const num = (v: unknown) => Number(v) || 0;
const sum = (list: OwnerReportTx[]) => list.reduce((s, t) => s + num(t.amount), 0);
const round = (v: number) => Math.round(v * 100) / 100;
const isMaintenance = (t: OwnerReportTx) =>
  t.obligation_type === "maintenance" || (t.description || "").toLowerCase().includes("manutenção");

export function computeOwnerReport({
  income,
  expenses,
  adminFeePercentage,
}: {
  income: OwnerReportTx[];
  expenses: OwnerReportTx[];
  adminFeePercentage: number;
}): OwnerReportResult {
  const rentGross = sum(income.filter((t) => isRentIncome(t)));
  const rentAdditions = sum(income.filter((t) => !isRentIncome(t) && isRentAddition(t)));
  const otherIncome = sum(income.filter((t) => !isRentIncome(t) && !isRentAddition(t)));
  const rentIrrf = sum(expenses.filter(isIrrf));
  const rentDeductions = sum(expenses.filter(isRentDeduction));
  const rentDiscounts = sum(expenses.filter(isRentDiscount));
  const rentNet = round(rentGross + rentAdditions - rentIrrf - rentDeductions - rentDiscounts);

  const adminFee = round(((rentGross + rentAdditions) * (Number(adminFeePercentage) || 0)) / 100);

  const plain = expenses.filter((t) => !isIrrf(t) && !isRentDeduction(t) && !isRentDiscount(t));
  const maintenanceExpenses = plain.filter(isMaintenance).map((t) => ({
    description: t.description || "",
    amount: num(t.amount),
    date: t.paid_date || t.transaction_date || "",
  }));
  const otherDeductions = plain
    .filter((t) => !isMaintenance(t))
    .map((t) => ({ description: t.description || "", amount: num(t.amount) }));
  const totalExpenses = round(sum(plain));
  const netTransfer = round(rentNet + otherIncome - adminFee - totalExpenses);

  return {
    rentGross: round(rentGross),
    rentAdditions: round(rentAdditions),
    rentIrrf: round(rentIrrf),
    rentDeductions: round(rentDeductions),
    rentDiscounts: round(rentDiscounts),
    rentNet,
    otherIncome: round(otherIncome),
    adminFee,
    maintenanceExpenses,
    otherDeductions,
    totalExpenses,
    netTransfer,
    rentReceived: rentNet,
  };
}
