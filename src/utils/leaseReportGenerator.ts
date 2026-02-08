import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Lease } from '@/hooks/useLeases';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

const SLOTI_LOGO_BASE64 = 'data:image/png;base64,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';

// Helper to normalize accented characters for helvetica font compatibility
const normalizeText = (text: string): string => {
  return text.normalize('NFC');
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR');
};

export interface PaymentHistoryItem {
  month: string;
  dueDate: string;
  paidDate: string | null;
  amount: number;
  lateFee: number;
  totalPaid: number;
  status: 'paid' | 'pending' | 'overdue';
  reference: string;
}

export interface TenantStatementData {
  lease: Lease;
  payments: PaymentHistoryItem[];
  period: {
    start: string;
    end: string;
  };
}

const addWatermarkAndFooter = (doc: jsPDF, pageNumber: number, totalPages: number): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const logoWidth = 25;
  const logoHeight = 25;
  const logoX = pageWidth - logoWidth - 15;
  const logoY = pageHeight - logoHeight - 20;
  
  doc.saveGraphicsState();
  // @ts-ignore
  doc.setGState(new doc.GState({ opacity: 0.15 }));
  doc.addImage(SLOTI_LOGO_BASE64, 'PNG', logoX, logoY, logoWidth, logoHeight);
  doc.restoreGraphicsState();
  
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  
  const footerY = pageHeight - 10;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  
  doc.text('Documento gerado por SLOTIMOB', 15, footerY);
  doc.text(dateStr, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, footerY, { align: 'right' });
};

export const generateTenantStatementPDF = (data: TenantStatementData): void => {
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true,
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const { lease, payments, period } = data;
  
  // Header with gradient effect
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Logo
  doc.addImage(SLOTI_LOGO_BASE64, 'PNG', 12, 8, 20, 20);
  
  // Title
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('EXTRATO DO INQUILINO'), 40, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText(`Período: ${period.start} a ${period.end}`), 40, 27);
  
  let currentY = 45;
  
  // Tenant Info Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, currentY, pageWidth - 20, 35, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(99, 102, 241);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('DADOS DO INQUILINO'), 15, currentY + 8);
  
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  
  const tenantName = lease.tenant?.name || 'N/A';
  const tenantEmail = lease.tenant?.email || 'N/A';
  const tenantPhone = lease.tenant?.phone || 'N/A';
  
  doc.text(normalizeText(`Nome: ${tenantName}`), 15, currentY + 17);
  doc.text(normalizeText(`E-mail: ${tenantEmail}`), 15, currentY + 24);
  doc.text(normalizeText(`Telefone: ${tenantPhone}`), 15, currentY + 31);
  
  // Property info on right side
  const unitName = lease.unit?.unit_number || 'N/A';
  const propertyName = lease.unit?.property?.name || 'Imóvel Avulso';
  const address = lease.unit?.address || '';
  
  doc.text(normalizeText(`Imóvel: ${unitName}`), pageWidth / 2 + 5, currentY + 17);
  doc.text(normalizeText(`Condomínio: ${propertyName}`), pageWidth / 2 + 5, currentY + 24);
  if (address) {
    doc.text(normalizeText(`Endereço: ${address.substring(0, 40)}...`), pageWidth / 2 + 5, currentY + 31);
  }
  
  currentY += 45;
  
  // Contract Summary Card
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(10, currentY, pageWidth - 20, 25, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(34, 197, 94);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('RESUMO DO CONTRATO'), 15, currentY + 8);
  
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  
  doc.text(normalizeText(`Aluguel: ${formatCurrency(lease.rent_amount)}`), 15, currentY + 17);
  doc.text(normalizeText(`Vencimento: Dia ${lease.due_day}`), pageWidth / 3, currentY + 17);
  doc.text(normalizeText(`Início: ${formatDate(lease.start_date)}`), (pageWidth / 3) * 2, currentY + 17);
  
  currentY += 35;
  
  // Payment History Table
  doc.setFontSize(11);
  doc.setTextColor(99, 102, 241);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('HISTÓRICO DE PAGAMENTOS'), 15, currentY);
  
  currentY += 5;
  
  const tableData = payments.map((payment) => [
    payment.month,
    payment.reference,
    formatDate(payment.dueDate),
    payment.paidDate ? formatDate(payment.paidDate) : '-',
    formatCurrency(payment.amount),
    payment.lateFee > 0 ? formatCurrency(payment.lateFee) : '-',
    formatCurrency(payment.totalPaid),
    payment.status === 'paid' ? '✓ Pago' : payment.status === 'pending' ? '⏳ Pendente' : '⚠ Atrasado',
  ]);
  
  doc.autoTable({
    startY: currentY,
    head: [['Mês', 'Ref.', 'Vencimento', 'Pagamento', 'Valor', 'Multa/Juros', 'Total', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [60, 60, 60],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 24, halign: 'center' },
    },
    margin: { left: 10, right: 10 },
  });
  
  currentY = doc.lastAutoTable.finalY + 15;
  
  // Summary Box
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalPaid, 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalLateFees = payments.reduce((sum, p) => sum + p.lateFee, 0);
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, currentY, pageWidth - 20, 30, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(99, 102, 241);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('RESUMO FINANCEIRO'), 15, currentY + 8);
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const col1X = 15;
  const col2X = pageWidth / 3 + 5;
  const col3X = (pageWidth / 3) * 2 + 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText('Total Pago:'), col1X, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text(formatCurrency(totalPaid), col1X, currentY + 25);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(normalizeText('Pendente:'), col2X, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(totalPending > 0 ? 239 : 60, totalPending > 0 ? 68 : 60, totalPending > 0 ? 68 : 60);
  doc.text(formatCurrency(totalPending), col2X, currentY + 25);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(normalizeText('Multas/Juros:'), col3X, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(totalLateFees), col3X, currentY + 25);
  
  // Add watermark and footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermarkAndFooter(doc, i, totalPages);
  }
  
  // Save
  const tenantNameClean = (lease.tenant?.name || 'Inquilino').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Extrato_${tenantNameClean}_${period.start.replace(/\//g, '-')}_${period.end.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};

export interface OwnerReportData {
  lease: Lease;
  period: {
    start: string;
    end: string;
  };
  rentReceived: number;
  adminFee: number;
  maintenanceExpenses: {
    description: string;
    amount: number;
    date: string;
  }[];
  otherDeductions: {
    description: string;
    amount: number;
  }[];
  netTransfer: number;
  incomeTransactions?: {
    description: string;
    amount: number;
    date: string;
    status: string;
  }[];
}

const addCleanFooter = (doc: jsPDF, pageNumber: number, totalPages: number): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  
  const footerY = pageHeight - 10;
  const now = new Date();
  const dateStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  
  doc.text(normalizeText(`Emitido em: ${dateStr}`), 15, footerY);
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, footerY, { align: 'right' });
};

export const generateOwnerReportPDF = (data: OwnerReportData): void => {
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true,
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const { lease, period, rentReceived, adminFee, maintenanceExpenses, otherDeductions, netTransfer, incomeTransactions = [] } = data;
  
  // Clean professional header - emerald/teal
  doc.setFillColor(5, 150, 105); // Emerald-600
  doc.rect(0, 0, pageWidth, 32, 'F');
  
  // Title - centered, no logo
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('RELATÓRIO DO PROPRIETÁRIO'), pageWidth / 2, 14, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText(`Período: ${period.start} a ${period.end}`), pageWidth / 2, 23, { align: 'center' });
  
  let currentY = 40;
  
  // Two-column info section
  const colWidth = (pageWidth - 30) / 2;
  
  // Left Column - Property Info
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, currentY, colWidth, 42, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('IMÓVEL'), 15, currentY + 8);
  
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  
  const unitName = lease.unit?.unit_number || 'N/A';
  const propertyName = lease.unit?.property?.name || 'Imóvel Avulso';
  const address = lease.unit?.address || '-';
  const tenantName = lease.tenant?.name || 'N/A';
  
  doc.text(normalizeText(`Unidade: ${unitName}`), 15, currentY + 16);
  doc.text(normalizeText(`Condomínio: ${propertyName.length > 28 ? propertyName.substring(0, 28) + '...' : propertyName}`), 15, currentY + 23);
  doc.text(normalizeText(`Endereço: ${address.length > 28 ? address.substring(0, 28) + '...' : address}`), 15, currentY + 30);
  doc.text(normalizeText(`Inquilino: ${tenantName.length > 28 ? tenantName.substring(0, 28) + '...' : tenantName}`), 15, currentY + 37);
  
  // Right Column - Contract Info
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15 + colWidth, currentY, colWidth, 42, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('CONTRATO'), 20 + colWidth, currentY + 8);
  
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  
  doc.text(normalizeText(`Aluguel: ${formatCurrency(lease.rent_amount)}`), 20 + colWidth, currentY + 16);
  doc.text(normalizeText(`Taxa Admin.: ${lease.admin_fee_percentage}%`), 20 + colWidth, currentY + 23);
  doc.text(normalizeText(`Vencimento: Dia ${lease.due_day}`), 20 + colWidth, currentY + 30);
  doc.text(normalizeText(`Início: ${formatDate(lease.start_date)}`), 20 + colWidth, currentY + 37);
  
  currentY += 50;
  
  // Summary Cards
  const cardWidth = (pageWidth - 40) / 3;
  const cardHeight = 22;
  
  const totalDeductions = adminFee + maintenanceExpenses.reduce((sum, e) => sum + e.amount, 0) + otherDeductions.reduce((sum, d) => sum + d.amount, 0);
  
  // Receitas Card
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(10, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('RECEITAS'), 10 + cardWidth / 2, currentY + 6, { align: 'center' });
  doc.setFontSize(11);
  doc.text(formatCurrency(rentReceived), 10 + cardWidth / 2, currentY + 14, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText('Aluguel recebido'), 10 + cardWidth / 2, currentY + 19, { align: 'center' });
  
  // Deduções Card
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(15 + cardWidth, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(153, 27, 27);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('DEDUÇÕES'), 15 + cardWidth + cardWidth / 2, currentY + 6, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`-${formatCurrency(totalDeductions)}`, 15 + cardWidth + cardWidth / 2, currentY + 14, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText('Taxa + despesas'), 15 + cardWidth + cardWidth / 2, currentY + 19, { align: 'center' });
  
  // Repasse Card
  doc.setFillColor(209, 250, 229);
  doc.roundedRect(20 + cardWidth * 2, currentY, cardWidth, cardHeight, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('REPASSE LÍQUIDO'), 20 + cardWidth * 2 + cardWidth / 2, currentY + 6, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70);
  doc.text(formatCurrency(netTransfer), 20 + cardWidth * 2 + cardWidth / 2, currentY + 14, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText('Valor a transferir'), 20 + cardWidth * 2 + cardWidth / 2, currentY + 19, { align: 'center' });
  
  currentY += 30;
  
  // Financial Breakdown Table
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('DEMONSTRATIVO FINANCEIRO'), 15, currentY);
  currentY += 4;
  
  // Build table data
  const financialData: string[][] = [];
  
  // Add income
  financialData.push([normalizeText('Aluguel Recebido'), '', formatCurrency(rentReceived), 'Receita']);
  
  // Add deductions
  financialData.push([normalizeText(`Taxa de Administração (${lease.admin_fee_percentage}%)`), '', `-${formatCurrency(adminFee)}`, normalizeText('Dedução')]);
  
  maintenanceExpenses.forEach((expense) => {
    financialData.push([normalizeText(`Manutenção: ${expense.description.length > 35 ? expense.description.substring(0, 35) + '...' : expense.description}`), formatDate(expense.date), `-${formatCurrency(expense.amount)}`, normalizeText('Dedução')]);
  });
  
  otherDeductions.forEach((deduction) => {
    financialData.push([normalizeText(deduction.description.length > 35 ? deduction.description.substring(0, 35) + '...' : deduction.description), '', `-${formatCurrency(deduction.amount)}`, normalizeText('Dedução')]);
  });
  
  if (financialData.length === 2 && maintenanceExpenses.length === 0 && otherDeductions.length === 0) {
    financialData.push([normalizeText('Nenhuma despesa de manutenção no período'), '', '-', '-']);
  }
  
  doc.autoTable({
    startY: currentY,
    head: [[normalizeText('Descrição'), normalizeText('Data'), normalizeText('Valor'), normalizeText('Tipo')]],
    body: financialData,
    theme: 'striped',
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 30, halign: 'center' },
    },
    margin: { left: 10, right: 10 },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const tipo = data.row.raw[3];
        if (data.column.index === 2) {
          if (tipo === 'Receita') {
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.fontStyle = 'bold';
          } else if (tipo === normalizeText('Dedução')) {
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.column.index === 3) {
          if (tipo === 'Receita') {
            data.cell.styles.textColor = [22, 101, 52];
          } else if (tipo === normalizeText('Dedução')) {
            data.cell.styles.textColor = [153, 27, 27];
          }
        }
      }
    },
  });
  
  currentY = doc.lastAutoTable.finalY + 10;
  
  // Final Summary Box - Repasse Líquido Destacado
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(10, currentY, pageWidth - 20, 24, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('REPASSE LÍQUIDO AO PROPRIETÁRIO'), 15, currentY + 10);
  
  doc.setFontSize(14);
  doc.text(formatCurrency(netTransfer), pageWidth - 15, currentY + 14, { align: 'right' });
  
  currentY += 32;
  
  // DIMOB Info (if applicable)
  if (lease.is_dimob_deductible) {
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(10, currentY, pageWidth - 20, 16, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(133, 77, 14);
    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText('DIMOB'), 15, currentY + 7);
    
    doc.setFont('helvetica', 'normal');
    const dimobText = `Imóvel dedutível para declaração DIMOB. CIB: ${lease.cib || 'Não informado'}`;
    doc.text(normalizeText(dimobText), 40, currentY + 7);
    
    currentY += 22;
  }
  
  // Owner payment info (if available)
  const owner = lease.owner;
  if (owner) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(10, currentY, pageWidth - 20, 20, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText('PROPRIETÁRIO'), 15, currentY + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(normalizeText(`Nome: ${owner.name || '-'}`), 15, currentY + 14);
    doc.text(normalizeText(`Contato: ${owner.phone || owner.email || '-'}`), pageWidth / 2, currentY + 14);
  }
  
  // Add clean footer (no logo)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addCleanFooter(doc, i, totalPages);
  }
  
  // Save
  const unitNameClean = (lease.unit?.unit_number || 'Imovel').replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `Relatorio_Proprietario_${unitNameClean}_${period.start.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};
