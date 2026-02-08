import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PdfOptions {
  title: string;
  subtitle?: string;
  userName?: string;
  dateRange: { from: Date; to: Date };
  columns: string[];
  data: (string | number)[][];
  filename: string;
  summary?: { label: string; value: string }[];
  landscape?: boolean;
  groupBy?: string;
  highlightCondition?: (row: (string | number)[]) => boolean;
  footerTotals?: (string | number)[];
  insights?: string[];
  selectedUnit?: string;
}

// Normalize text for helvetica font compatibility (removes encoding issues)
const normalizeText = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFC')
    .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') // Remove emojis
    .replace(/[Ø=Ü¡]/g, '') // Remove encoding artifacts
    .trim();
};

export const generateReportPdf = async (options: PdfOptions) => {
  const { 
    title, 
    subtitle, 
    userName, 
    dateRange, 
    columns, 
    data, 
    filename, 
    summary, 
    landscape = false,
    highlightCondition,
    footerTotals,
    insights,
    selectedUnit,
  } = options;
  
  // Auto-detect landscape for tables with 7+ columns
  const shouldUseLandscape = landscape || columns.length >= 7;
  
  const doc = new jsPDF({ orientation: shouldUseLandscape ? 'landscape' : 'portrait' });
  doc.setFont('helvetica', 'normal');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background - professional dark gray
  doc.setFillColor(55, 65, 81);
  doc.rect(0, 0, pageWidth, 48, 'F');
  
  // Centered Logo and Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SLOTIMOB', pageWidth / 2, 14, { align: 'center' });
  
  // Report Title - centered
  doc.setFontSize(14);
  doc.text(normalizeText(title.toUpperCase()), pageWidth / 2, 26, { align: 'center' });
  
  // Period and Unit - centered
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const periodText = `Periodo: ${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
  doc.text(normalizeText(periodText), pageWidth / 2, 35, { align: 'center' });
  
  // Show selected unit if provided
  if (selectedUnit) {
    doc.text(normalizeText(`Unidade: ${selectedUnit}`), pageWidth / 2, 42, { align: 'center' });
  }
  
  // User name on right
  if (userName) {
    doc.setFontSize(8);
    doc.text(normalizeText(`Gerado por: ${userName}`), pageWidth - 14, 42, { align: 'right' });
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let yPos = 58;
  
  // Subtitle description
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 14, yPos);
    yPos += 10;
  }
  
  // Summary cards if provided
  if (summary && summary.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo', 14, yPos);
    yPos += 8;
    
    const summaryData = summary.map(s => [s.label, s.value]);
    
    autoTable(doc, {
      startY: yPos,
      body: summaryData,
      theme: 'plain',
      styles: { 
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'right' },
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // Insights section (clean text without emojis)
  if (insights && insights.length > 0) {
    doc.setFillColor(240, 253, 244); // Light green background
    doc.roundedRect(14, yPos, pageWidth - 28, 10 + insights.length * 7, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('ANALISE ESTRATEGICA:', 18, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    insights.forEach((insight, idx) => {
      const cleanInsight = normalizeText(insight);
      const splitInsight = doc.splitTextToSize(cleanInsight, pageWidth - 40);
      splitInsight.forEach((line: string, lineIdx: number) => {
        doc.text(lineIdx === 0 ? `- ${line}` : `  ${line}`, 18, yPos + 14 + idx * 7 + lineIdx * 5);
      });
    });
    yPos += 18 + insights.length * 7;
    doc.setTextColor(0, 0, 0);
  }
  
  // Main data table
  if (data.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [columns],
      body: data,
      foot: footerTotals ? [footerTotals] : undefined,
      theme: 'striped',
      headStyles: { 
        fillColor: [55, 65, 81],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      footStyles: {
        fillColor: [229, 231, 235],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        cellPadding: 4,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      columnStyles: columns.reduce((acc, col, idx) => {
        const numericKeywords = ['valor', 'total', 'saldo', 'quantidade', 'qtd', 'r$', '%', 'taxa', 'bruto', 'líquido', 'dedução', 'multa', 'juros', 'perda', 'acumulado'];
        const isNumeric = numericKeywords.some(kw => col.toLowerCase().includes(kw));
        if (isNumeric) {
          acc[idx] = { halign: 'right' };
        }
        return acc;
      }, {} as Record<number, { halign: 'right' }>),
      didParseCell: (data) => {
        if (highlightCondition && data.section === 'body') {
          const rowData = data.row.raw as (string | number)[];
          if (highlightCondition(rowData)) {
            data.cell.styles.fillColor = [254, 226, 226]; // Red highlight
            data.cell.styles.textColor = [153, 27, 27];
          }
        }
      },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text('Nenhum dado encontrado para o período selecionado.', 14, yPos);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    
    const footerText = `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Página ${i} de ${pageCount}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    doc.text('SLOTIMOB - Intelligence Center', 14, pageHeight - 10);
  }
  
  doc.save(`${filename}.pdf`);
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const formatDate = (date: string | Date): string => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
};

// Helper to calculate penalty and interest (2% + 0.033% per day - approximately 1% per month)
export const calculatePenaltyAndInterest = (originalValue: number, daysOverdue: number): { penalty: number; interest: number; total: number } => {
  const penalty = originalValue * 0.02; // 2% fixed penalty
  const dailyInterestRate = 0.00033; // 0.033% per day (approximately 1% per month)
  const interest = originalValue * dailyInterestRate * daysOverdue;
  return {
    penalty,
    interest,
    total: originalValue + penalty + interest,
  };
};
