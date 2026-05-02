import ExcelJS from 'exceljs';

export interface ReportExcelColumn {
  key: string;
  label: string;
  width?: number; // character width
}

export interface ReportExcelOptions {
  title: string;
  sheetName?: string;
  columns: ReportExcelColumn[];
  rows: Record<string, string | number | null | undefined>[];
  summary?: Array<{ label: string; value: string }>;
  generatedAt?: Date;
  fileName: string;
}

export async function generateReportExcel(options: ReportExcelOptions): Promise<void> {
  const {
    title, sheetName = 'Relatório', columns, rows, summary, generatedAt = new Date(), fileName,
  } = options;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  let currentRow = 1;

  // Title row (merged)
  sheet.mergeCells(currentRow, 1, currentRow, columns.length);
  const titleCell = sheet.getCell(currentRow, 1);
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(currentRow).height = 30;
  currentRow++;

  // Generated at
  sheet.mergeCells(currentRow, 1, currentRow, columns.length);
  const dateCell = sheet.getCell(currentRow, 1);
  dateCell.value = `Gerado em ${generatedAt.toLocaleDateString('pt-BR')} às ${generatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por SLOTIMOB`;
  dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF999999' } };
  dateCell.alignment = { horizontal: 'center' };
  currentRow++;

  // Summary KPIs
  if (summary && summary.length > 0) {
    currentRow++; // blank row
    for (const s of summary) {
      const labelCell = sheet.getCell(currentRow, 1);
      labelCell.value = s.label;
      labelCell.font = { name: 'Arial', size: 10, bold: true };
      const valCell = sheet.getCell(currentRow, 2);
      valCell.value = s.value;
      valCell.font = { name: 'Arial', size: 10 };
      valCell.alignment = { horizontal: 'right' };
      currentRow++;
    }
  }

  currentRow++; // blank row

  // Header row
  const headerFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
  const headerFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };

  columns.forEach((col, i) => {
    const cell = sheet.getCell(currentRow, i + 1);
    cell.value = col.label;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
  });
  sheet.getRow(currentRow).height = 22;
  currentRow++;

  // Data rows
  const altFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  rows.forEach((row, rowIdx) => {
    columns.forEach((col, i) => {
      const cell = sheet.getCell(currentRow, i + 1);
      cell.value = row[col.key] != null ? row[col.key] : '';
      cell.font = { name: 'Arial', size: 9 };
      if (rowIdx % 2 === 1) cell.fill = altFill;
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      };
    });
    currentRow++;
  });

  // Auto-width columns
  columns.forEach((col, i) => {
    const colRef = sheet.getColumn(i + 1);
    let maxLen = col.label.length;
    rows.forEach(row => {
      const val = String(row[col.key] ?? '');
      if (val.length > maxLen) maxLen = val.length;
    });
    colRef.width = Math.min(Math.max(col.width || maxLen + 2, 10), 50);
  });

  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
