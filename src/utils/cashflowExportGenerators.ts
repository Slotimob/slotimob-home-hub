import { CashflowExportData, CashflowAccountSummary, CashflowMovement } from "@/lib/cashflow-export-data";
import { generateReportPdf, formatCurrency, formatDate } from "./reportPdfGenerator";
import { generateReportCsv, cleanNumericValue, cleanDateValue } from "./reportCsvGenerator";
import { downloadReportDocx, downloadReportExcel } from "./reportMultiFormat";
import { buildReportFileName } from "./reportFileName";
import { format } from "date-fns";

function movementToRow(m: CashflowMovement): (string | number)[] {
  return [
    formatDate(m.date),
    m.description,
    m.category,
    m.type === "income" ? formatCurrency(m.amount) : "",
    m.type === "expense" ? formatCurrency(m.amount) : "",
  ];
}

function movementColumns(): string[] {
  return ["Data", "Descrição", "Categoria", "Entrada (R$)", "Saída (R$)"];
}

function accountSummaryRow(a: CashflowAccountSummary): (string | number)[] {
  const name = a.bank_account.bank_name ? `${a.bank_account.bank_name} · ${a.bank_account.name}` : a.bank_account.name;
  return [name, formatCurrency(a.opening_balance), formatCurrency(a.total_in), formatCurrency(a.total_out), formatCurrency(a.closing_balance)];
}

// PDF
export async function generateCashflowPdf(data: CashflowExportData, mode: "consolidated" | "by_account", userName?: string) {
  const dateRange = data.period;

  if (mode === "consolidated") {
    const tableData = data.consolidated.movements.map(movementToRow);
    const summary = [
      { label: "Saldo Inicial", value: formatCurrency(data.consolidated.opening_balance) },
      { label: "Total Entradas", value: formatCurrency(data.consolidated.total_in) },
      { label: "Total Saídas", value: formatCurrency(data.consolidated.total_out) },
      { label: "Saldo Final", value: formatCurrency(data.consolidated.closing_balance) },
    ];
    await generateReportPdf({
      title: "Fluxo de Caixa",
      subtitle: "Consolidado — Receitas e despesas liquidadas por período",
      userName,
      dateRange,
      columns: movementColumns(),
      data: tableData,
      filename: buildReportFileName({ reportKey: "fluxo-caixa", dateRange }),
      summary,
      landscape: true,
    });
  } else {
    // Build combined data for PDF: summary table + per account sections
    const summaryColumns = ["Conta", "Saldo Inicial", "Entradas", "Saídas", "Saldo Final"];
    const summaryData = data.by_account.map(accountSummaryRow);
    const allTableData = [...summaryData];

    // Add separator and per-account movements
    data.by_account.forEach(account => {
      const name = account.bank_account.bank_name ? `${account.bank_account.bank_name} · ${account.bank_account.name}` : account.bank_account.name;
      allTableData.push([`--- ${name} ---`, "", "", "", ""]);
      account.movements.forEach(m => {
        allTableData.push([
          formatDate(m.date),
          m.description,
          m.category,
          m.type === "income" ? formatCurrency(m.amount) : "",
          m.type === "expense" ? formatCurrency(m.amount) : "",
        ]);
      });
    });

    const summary = [
      { label: "Saldo Inicial Consolidado", value: formatCurrency(data.consolidated.opening_balance) },
      { label: "Total Entradas", value: formatCurrency(data.consolidated.total_in) },
      { label: "Total Saídas", value: formatCurrency(data.consolidated.total_out) },
      { label: "Saldo Final Consolidado", value: formatCurrency(data.consolidated.closing_balance) },
      { label: "Contas Incluídas", value: data.by_account.length.toString() },
    ];

    await generateReportPdf({
      title: "Fluxo de Caixa — Por Banco",
      subtitle: `${data.by_account.length} contas no período`,
      userName,
      dateRange,
      columns: summaryColumns,
      data: allTableData,
      filename: buildReportFileName({ reportKey: "fluxo-caixa-por-banco", dateRange }),
      summary,
      landscape: true,
    });
  }
}

// DOCX
export async function generateCashflowDocx(data: CashflowExportData, mode: "consolidated" | "by_account") {
  const dateRange = data.period;

  if (mode === "consolidated") {
    const columns = movementColumns();
    const tableData = data.consolidated.movements.map(movementToRow);
    const summary = [
      { label: "Saldo Inicial", value: formatCurrency(data.consolidated.opening_balance) },
      { label: "Total Entradas", value: formatCurrency(data.consolidated.total_in) },
      { label: "Total Saídas", value: formatCurrency(data.consolidated.total_out) },
      { label: "Saldo Final", value: formatCurrency(data.consolidated.closing_balance) },
    ];
    await downloadReportDocx({ title: "Fluxo de Caixa", reportKey: "fluxo-caixa", dateRange, columnLabels: columns, data: tableData, summary });
  } else {
    // Combined per-account view
    const allData: (string | number)[][] = [];
    data.by_account.forEach(account => {
      const name = account.bank_account.bank_name ? `${account.bank_account.bank_name} · ${account.bank_account.name}` : account.bank_account.name;
      allData.push([`BANCO: ${name}`, `Abertura: ${formatCurrency(account.opening_balance)}`, `Entradas: ${formatCurrency(account.total_in)}`, `Saídas: ${formatCurrency(account.total_out)}`, `Fechamento: ${formatCurrency(account.closing_balance)}`]);
      account.movements.forEach(m => allData.push(movementToRow(m)));
      allData.push(["", "", "", "", ""]);
    });
    await downloadReportDocx({ title: "Fluxo de Caixa — Por Banco", reportKey: "fluxo-caixa-por-banco", dateRange, columnLabels: movementColumns(), data: allData });
  }
}

// Excel
export async function generateCashflowExcel(data: CashflowExportData, mode: "consolidated" | "by_account") {
  const dateRange = data.period;

  if (mode === "consolidated") {
    const tableData = data.consolidated.movements.map(movementToRow);
    const summary = [
      { label: "Saldo Inicial", value: formatCurrency(data.consolidated.opening_balance) },
      { label: "Total Entradas", value: formatCurrency(data.consolidated.total_in) },
      { label: "Total Saídas", value: formatCurrency(data.consolidated.total_out) },
      { label: "Saldo Final", value: formatCurrency(data.consolidated.closing_balance) },
    ];
    await downloadReportExcel({ title: "Fluxo de Caixa", reportKey: "fluxo-caixa", dateRange, columnLabels: movementColumns(), data: tableData, summary });
  } else {
    // Multi-tab: Resumo + Consolidado + per-account
    // For now, use single-tab approach with per-bank sections since the generic helper is single-tab
    const allData: (string | number)[][] = [];
    // Summary rows
    data.by_account.forEach(a => allData.push(accountSummaryRow(a)));
    allData.push(["", "", "", "", ""]);

    // All movements with bank column
    data.consolidated.movements.forEach(m => {
      const account = data.by_account.find(a => a.bank_account.id === m.bank_account_id);
      const bankName = account ? (account.bank_account.bank_name || account.bank_account.name) : "-";
      allData.push([formatDate(m.date), m.description, bankName, m.type === "income" ? formatCurrency(m.amount) : "", m.type === "expense" ? formatCurrency(m.amount) : ""]);
    });

    await downloadReportExcel({
      title: "Fluxo de Caixa — Por Banco",
      reportKey: "fluxo-caixa-por-banco",
      dateRange,
      columnLabels: ["Data", "Descrição", "Banco", "Entrada (R$)", "Saída (R$)"],
      data: allData,
      summary: [
        { label: "Total Entradas", value: formatCurrency(data.consolidated.total_in) },
        { label: "Total Saídas", value: formatCurrency(data.consolidated.total_out) },
        { label: "Saldo Final", value: formatCurrency(data.consolidated.closing_balance) },
      ],
    });
  }
}

// CSV
export function generateCashflowCsv(data: CashflowExportData, mode: "consolidated" | "by_account") {
  if (mode === "consolidated") {
    generateReportCsv({
      columns: ["Data", "Descrição", "Categoria", "Tipo", "Valor"],
      data: data.consolidated.movements.map(m => [
        cleanDateValue(m.date),
        m.description,
        m.category,
        m.type === "income" ? "Receita" : "Despesa",
        cleanNumericValue(m.amount),
      ]),
      filename: "fluxo-caixa",
    });
  } else {
    // Generate a single CSV with bank column
    generateReportCsv({
      columns: ["Data", "Descrição", "Banco", "Categoria", "Tipo", "Valor"],
      data: data.consolidated.movements.map(m => {
        const account = data.by_account.find(a => a.bank_account.id === m.bank_account_id);
        const bankName = account ? (account.bank_account.bank_name || account.bank_account.name) : "-";
        return [
          cleanDateValue(m.date),
          m.description,
          bankName,
          m.category,
          m.type === "income" ? "Receita" : "Despesa",
          cleanNumericValue(m.amount),
        ];
      }),
      filename: "fluxo-caixa-por-banco",
    });
  }
}
