import jsPDF from 'jspdf';
import { DREData } from '@/hooks/useDREReport';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { pdfSafeText, pdfSafeLabel } from '@/utils/pdfSafeText';

const SLOTI_LOGO_BASE64 = 'data:image/png;base64,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';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function addWatermarkAndFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add semi-transparent logo watermark at bottom right corner
  const logoWidth = 30;
  const logoHeight = 30;
  const logoX = pageWidth - logoWidth - 15;
  const logoY = pageHeight - logoHeight - 25;
  
  // Set opacity for watermark
  doc.saveGraphicsState();
  // @ts-ignore - setGState is available
  doc.setGState(new doc.GState({ opacity: 0.15 }));
  doc.addImage(SLOTI_LOGO_BASE64, 'PNG', logoX, logoY, logoWidth, logoHeight);
  doc.restoreGraphicsState();
  
  // Add footer text
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  
  const footerY = pageHeight - 10;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  
  doc.text('Documento gerado por SLOTIMOB', 15, footerY);
  doc.text(dateStr, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, footerY, { align: 'right' });
}

interface DRELineConfig {
  label: string;
  value: number;
  items?: { categoryName: string; total: number }[];
  isTotal?: boolean;
  operator?: '+' | '-' | '=';
}

export function exportDREtoPDF(dre: DREData, periodLabel: string, unitName?: string): void {
  const fullPeriodLabel = unitName ? `${periodLabel} - ${unitName}` : periodLabel;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(99, 102, 241); // Primary color
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  // Add logo to header
  doc.addImage(SLOTI_LOGO_BASE64, 'PNG', 10, 7, 16, 16);
  
  // Title in header
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO', 32, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${fullPeriodLabel}`, 32, 22);
  
  // Reset for content
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  let currentY = 45;
  
  const lines: DRELineConfig[] = [
    { operator: '+', label: 'RECEITA BRUTA', value: dre.grossRevenue.total, items: dre.grossRevenue.items },
    { operator: '-', label: 'DEDUÇÕES (Impostos)', value: dre.taxDeductions.total, items: dre.taxDeductions.items },
    { operator: '=', label: 'RECEITA LÍQUIDA', value: dre.netRevenue, isTotal: true },
    { operator: '-', label: 'CUSTOS VARIÁVEIS', value: dre.variableCosts.total, items: dre.variableCosts.items },
    { operator: '=', label: 'LUCRO BRUTO', value: dre.grossProfit, isTotal: true },
    { operator: '-', label: 'DESPESAS COMERCIAIS', value: dre.salesExpenses.total, items: dre.salesExpenses.items },
    { operator: '-', label: 'DESPESAS ADMINISTRATIVAS', value: dre.adminExpenses.total, items: dre.adminExpenses.items },
    { operator: '-', label: 'DESPESAS FINANCEIRAS', value: dre.financialExpenses.total, items: dre.financialExpenses.items },
    { operator: '=', label: 'LUCRO OPERACIONAL', value: dre.operatingProfit, isTotal: true },
    { operator: '+', label: 'RECEITAS FINANCEIRAS', value: dre.financialRevenue.total, items: dre.financialRevenue.items },
    { operator: '-', label: 'DISTRIBUIÇÃO DE LUCROS', value: dre.profitDistribution.total, items: dre.profitDistribution.items },
  ];
  
  lines.forEach((line) => {
    // Check if we need a new page
    if (currentY > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      currentY = 20;
    }
    
    // Draw separator line for totals
    if (line.isTotal) {
      doc.setDrawColor(200, 200, 200);
      doc.line(15, currentY - 2, pageWidth - 15, currentY - 2);
    }
    
    // Operator
    if (line.operator) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      if (line.operator === '+') doc.setTextColor(16, 185, 129);
      else if (line.operator === '-') doc.setTextColor(239, 68, 68);
      else doc.setTextColor(0, 0, 0);
      doc.text(`(${line.operator})`, 15, currentY);
    }
    
    // Label
    doc.setFontSize(line.isTotal ? 11 : 10);
    doc.setFont('helvetica', line.isTotal ? 'bold' : 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(line.label, 28, currentY);
    
    // Value
    const valueColor = line.value >= 0 ? [16, 185, 129] : [239, 68, 68];
    if (line.isTotal) {
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    }
    doc.text(formatCurrency(line.value), pageWidth - 15, currentY, { align: 'right' });
    
    currentY += 7;
    
    // Items
    if (line.items && line.items.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      
      line.items.forEach((item) => {
        doc.text(`• ${item.categoryName}`, 32, currentY);
        doc.text(formatCurrency(item.total), pageWidth - 15, currentY, { align: 'right' });
        currentY += 5;
      });
      
      currentY += 3;
    }
  });
  
  // Final result with highlight
  currentY += 5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(15, currentY - 2, pageWidth - 15, currentY - 2);
  doc.line(15, currentY, pageWidth - 15, currentY);
  
  currentY += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('(=)', 15, currentY);
  doc.text('RESULTADO LÍQUIDO', 28, currentY);
  
  const resultColor = dre.netResult >= 0 ? [16, 185, 129] : [239, 68, 68];
  doc.setTextColor(resultColor[0], resultColor[1], resultColor[2]);
  doc.text(formatCurrency(dre.netResult), pageWidth - 15, currentY, { align: 'right' });
  
  // Add watermark and footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermarkAndFooter(doc, i, totalPages);
  }
  
  // Save the PDF
  const fileName = `DRE - ${fullPeriodLabel.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}

export function exportDREtoCSV(dre: DREData, periodLabel: string, unitName?: string): void {
  const fullPeriodLabel = unitName ? `${periodLabel} - ${unitName}` : periodLabel;
  const lines: string[] = [];
  
  // Header
  lines.push('DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO');
  lines.push(`Período:;${fullPeriodLabel}`);
  lines.push('');
  lines.push('Tipo;Descrição;Valor');
  
  // Helper function
  const addSection = (operator: string, label: string, total: number, items?: { categoryName: string; total: number }[]) => {
    lines.push(`(${operator});${label};${total.toFixed(2).replace('.', ',')}`);
    if (items && items.length > 0) {
      items.forEach((item) => {
        lines.push(`;  • ${item.categoryName};${item.total.toFixed(2).replace('.', ',')}`);
      });
    }
  };
  
  // Data
  addSection('+', 'RECEITA BRUTA', dre.grossRevenue.total, dre.grossRevenue.items);
  addSection('-', 'DEDUÇÕES (Impostos)', dre.taxDeductions.total, dre.taxDeductions.items);
  lines.push(`(=);RECEITA LÍQUIDA;${dre.netRevenue.toFixed(2).replace('.', ',')}`);
  
  addSection('-', 'CUSTOS VARIÁVEIS', dre.variableCosts.total, dre.variableCosts.items);
  lines.push(`(=);LUCRO BRUTO;${dre.grossProfit.toFixed(2).replace('.', ',')}`);
  
  addSection('-', 'DESPESAS COMERCIAIS', dre.salesExpenses.total, dre.salesExpenses.items);
  addSection('-', 'DESPESAS ADMINISTRATIVAS', dre.adminExpenses.total, dre.adminExpenses.items);
  addSection('-', 'DESPESAS FINANCEIRAS', dre.financialExpenses.total, dre.financialExpenses.items);
  lines.push(`(=);LUCRO OPERACIONAL;${dre.operatingProfit.toFixed(2).replace('.', ',')}`);
  
  addSection('+', 'RECEITAS FINANCEIRAS', dre.financialRevenue.total, dre.financialRevenue.items);
  addSection('-', 'DISTRIBUIÇÃO DE LUCROS', dre.profitDistribution.total, dre.profitDistribution.items);
  
  lines.push('');
  lines.push(`(=);RESULTADO LÍQUIDO;${dre.netResult.toFixed(2).replace('.', ',')}`);
  
  // Create and download file
  const csvContent = lines.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `DRE - ${fullPeriodLabel.replace(/\//g, '-')}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
