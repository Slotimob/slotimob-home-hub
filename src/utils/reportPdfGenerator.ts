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
}

export const generateReportPdf = async (options: PdfOptions) => {
  const { title, subtitle, userName, dateRange, columns, data, filename, summary } = options;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(99, 102, 241); // Primary indigo
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Logo placeholder (text fallback)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SLOTIMOB', 14, 18);
  
  // Title
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), 14, 30);
  
  // Subtitle/Period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const periodText = `Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
  doc.text(periodText, 14, 38);
  
  // User name on right
  if (userName) {
    doc.setFontSize(9);
    doc.text(`Gerado por: ${userName}`, pageWidth - 14, 38, { align: 'right' });
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let yPos = 55;
  
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
  
  // Main data table
  if (data.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [columns],
      body: data,
      theme: 'striped',
      headStyles: { 
        fillColor: [99, 102, 241],
        textColor: 255,
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
        // Right-align numeric columns (detect by checking if column name contains currency or number keywords)
        const numericKeywords = ['valor', 'total', 'saldo', 'quantidade', 'qtd', 'r$', '%', 'taxa'];
        const isNumeric = numericKeywords.some(kw => col.toLowerCase().includes(kw));
        if (isNumeric) {
          acc[idx] = { halign: 'right' };
        }
        return acc;
      }, {} as Record<number, { halign: 'right' }>),
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
    
    // Date and page number
    const footerText = `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Página ${i} de ${pageCount}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // System name
    doc.text('SLOTIMOB - Intelligence Center', 14, pageHeight - 10);
  }
  
  doc.save(`${filename}.pdf`);
};

export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
};
