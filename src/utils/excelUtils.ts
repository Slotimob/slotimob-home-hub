/**
 * Secure Excel utilities using ExcelJS
 * Replaces vulnerable xlsx/SheetJS package
 */
import ExcelJS from 'exceljs';

// Re-export types for convenience
export type Workbook = ExcelJS.Workbook;
export type Worksheet = ExcelJS.Worksheet;

/**
 * Creates a new workbook
 */
export const createWorkbook = (): ExcelJS.Workbook => {
  return new ExcelJS.Workbook();
};

/**
 * Adds a worksheet with data from an array of objects
 */
export const addJsonSheet = (
  workbook: ExcelJS.Workbook,
  data: Record<string, any>[],
  sheetName: string,
  options?: { columnWidths?: number[] }
): ExcelJS.Worksheet => {
  const worksheet = workbook.addWorksheet(sheetName);
  
  if (data.length === 0) {
    return worksheet;
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Add headers as columns
  worksheet.columns = headers.map((header, index) => ({
    header,
    key: header,
    width: options?.columnWidths?.[index] || 15,
  }));
  
  // Add rows
  data.forEach(row => {
    worksheet.addRow(row);
  });
  
  // Style header row
  worksheet.getRow(1).font = { bold: true };
  
  return worksheet;
};

/**
 * Adds a worksheet from array of arrays (like aoa_to_sheet)
 */
export const addAoaSheet = (
  workbook: ExcelJS.Workbook,
  data: any[][],
  sheetName: string
): ExcelJS.Worksheet => {
  const worksheet = workbook.addWorksheet(sheetName);
  
  data.forEach(row => {
    worksheet.addRow(row);
  });
  
  return worksheet;
};

/**
 * Downloads workbook as Excel file
 */
export const downloadWorkbook = async (
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Reads an Excel file and returns data as array of objects
 */
export const readExcelFile = async (
  file: File
): Promise<Record<string, any>[]> => {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in the file');
  }
  
  const data: Record<string, any>[] = [];
  const headers: string[] = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers
      row.eachCell((cell) => {
        headers.push(String(cell.value || ''));
      });
    } else {
      // Data rows
      const rowData: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });
      if (Object.keys(rowData).length > 0) {
        data.push(rowData);
      }
    }
  });
  
  return data;
};

/**
 * Reads an Excel file and returns raw data for flexible header handling
 */
export const readExcelFileRaw = async (
  file: File
): Promise<{ headers: string[]; rows: Record<string, any>[] }> => {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in the file');
  }
  
  const headers: string[] = [];
  const rows: Record<string, any>[] = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        // Preserve original header for flexible matching
        headers[colNumber - 1] = String(cell.value || '');
      });
    } else {
      const rowData: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });
      if (Object.keys(rowData).length > 0) {
        rows.push(rowData);
      }
    }
  });
  
  return { headers, rows };
};
