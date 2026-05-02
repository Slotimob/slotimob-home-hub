import { generateReportDocx, type ReportDocxColumn, type ReportDocxOptions } from './reportDocxGenerator';
import { generateReportExcel, type ReportExcelColumn, type ReportExcelOptions } from './reportExcelGenerator';
import { buildReportFileName } from './reportFileName';

/**
 * Convenience wrapper: converts column-label + row-array format (like PDF/CSV)
 * into the keyed-object format expected by DOCX/Excel generators.
 */
export interface ReportMultiFormatParams {
  title: string;
  subtitle?: string;
  reportKey: string;
  dateRange?: { from: Date; to: Date };
  columnLabels: string[];
  data: (string | number | null | undefined)[][];
  summary?: Array<{ label: string; value: string }>;
}

function toKeyedRows(columnLabels: string[], data: (string | number | null | undefined)[][]): {
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null | undefined>[];
} {
  const columns = columnLabels.map((label, i) => ({ key: `col_${i}`, label }));
  const rows = data.map(row => {
    const obj: Record<string, string | number | null | undefined> = {};
    columns.forEach((col, i) => { obj[col.key] = row[i]; });
    return obj;
  });
  return { columns, rows };
}

export async function downloadReportDocx(params: ReportMultiFormatParams): Promise<void> {
  const { columns, rows } = toKeyedRows(params.columnLabels, params.data);
  await generateReportDocx({
    title: params.title,
    subtitle: params.subtitle,
    columns,
    rows,
    summary: params.summary,
    fileName: buildReportFileName({ reportKey: params.reportKey, dateRange: params.dateRange }),
  });
}

export async function downloadReportExcel(params: ReportMultiFormatParams): Promise<void> {
  const { columns, rows } = toKeyedRows(params.columnLabels, params.data);
  await generateReportExcel({
    title: params.title,
    columns,
    rows,
    summary: params.summary,
    fileName: buildReportFileName({ reportKey: params.reportKey, dateRange: params.dateRange }),
  });
}
