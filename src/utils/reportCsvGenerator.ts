import Papa from 'papaparse';
import { format } from 'date-fns';

interface CsvOptions {
  columns: string[];
  data: (string | number | null | undefined)[][];
  filename: string;
}

export const generateReportCsv = (options: CsvOptions) => {
  const { columns, data, filename } = options;
  
  // Combine headers with data
  const csvData = [columns, ...data];
  
  // Generate CSV using PapaParse
  const csv = Papa.unparse(csvData, {
    delimiter: ';', // Use semicolon for better Excel compatibility in pt-BR
    quotes: true,
  });
  
  // Add BOM for UTF-8 encoding (Excel compatibility)
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper to clean data for CSV export (raw values without formatting)
export const cleanNumericValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return value.toString().replace('.', ','); // Use comma for decimals in pt-BR
};

export const cleanDateValue = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd');
};
