import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Lease } from '@/hooks/useLeases';

const normalizeText = (text: string): string => {
  return text.normalize('NFC');
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDateBR = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR');
};

export interface OwnerReportData {
  lease: Lease;
  period: { start: string; end: string };
  rentReceived: number;
  adminFee: number;
  maintenanceExpenses: { description: string; amount: number; date: string }[];
  otherDeductions: { description: string; amount: number }[];
  netTransfer: number;
  incomeTransactions?: { description: string; amount: number; date: string; status: string }[];
}

const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 10;
  
  // Thin line separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
  
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.setFont('helvetica', 'normal');
  
  const dateStr = format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  doc.text(normalizeText(`Documento emitido por SLOTIMOB em ${dateStr}`), 15, footerY);
  doc.text(normalizeText(`Pagina ${pageNumber} de ${totalPages}`), pageWidth - 15, footerY, { align: 'right' });
};

export const generateOwnerReportPDF = (data: OwnerReportData): void => {
  const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const { lease, period, rentReceived, adminFee, maintenanceExpenses, otherDeductions, netTransfer } = data;

  // === HEADER ===
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 38, 'F');
  // Accent line
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 38, pageWidth, 2, 'F');

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SLOTIMOB', margin, 16);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText('Prestacao de Contas ao Proprietario'), margin, 26);

  doc.setFontSize(9);
  doc.setTextColor(180, 200, 220);
  doc.text(normalizeText(`Periodo: ${period.start} a ${period.end}`), margin, 34);

  let y = 48;

  // === PROPERTY & CONTRACT INFO ===
  const colW = (contentWidth - 6) / 2;

  // Left card - Imovel
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, colW, 40, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('helvetica', 'bold');
  doc.text('IMOVEL', margin + 6, y + 9);

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  const unit = lease.unit?.unit_number || 'N/A';
  const prop = lease.unit?.property?.name || 'Imovel Avulso';
  const addr = lease.unit?.address || '-';
  doc.text(normalizeText(`Unidade: ${unit}`), margin + 6, y + 17);
  doc.text(normalizeText(`Condominio: ${prop.length > 30 ? prop.substring(0, 30) + '...' : prop}`), margin + 6, y + 24);
  doc.text(normalizeText(`Endereco: ${addr.length > 30 ? addr.substring(0, 30) + '...' : addr}`), margin + 6, y + 31);
  doc.text(normalizeText(`Inquilino: ${(lease.tenant?.name || 'N/A').substring(0, 30)}`), margin + 6, y + 38);

  // Right card - Contrato
  const rightX = margin + colW + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightX, y, colW, 40, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO', rightX + 6, y + 9);

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText(`Aluguel: ${formatCurrency(lease.rent_amount)}`), rightX + 6, y + 17);
  doc.text(normalizeText(`Taxa Adm.: ${lease.admin_fee_percentage}%`), rightX + 6, y + 24);
  doc.text(normalizeText(`Vencimento: Dia ${lease.due_day}`), rightX + 6, y + 31);
  doc.text(normalizeText(`Inicio: ${formatDateBR(lease.start_date)}`), rightX + 6, y + 38);

  y += 48;

  // === RESUMO FINANCEIRO (Highlight Box) ===
  const totalDeductions = adminFee + maintenanceExpenses.reduce((s, e) => s + e.amount, 0) + otherDeductions.reduce((s, d) => s + d.amount, 0);
  const cardW = (contentWidth - 12) / 3;
  const cardH = 28;

  // Receitas
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin, y, cardW, cardH, 3, 3, 'F');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL ARRECADADO', margin + cardW / 2, y + 8, { align: 'center' });
  doc.setFontSize(13);
  doc.text(formatCurrency(rentReceived), margin + cardW / 2, y + 18, { align: 'center' });

  // Deducoes
  const card2X = margin + cardW + 6;
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(card2X, y, cardW, cardH, 3, 3, 'F');
  doc.setFontSize(7);
  doc.setTextColor(153, 27, 27);
  doc.setFont('helvetica', 'bold');
  doc.text('TAXAS / DEDUCOES', card2X + cardW / 2, y + 8, { align: 'center' });
  doc.setFontSize(13);
  doc.text(`-${formatCurrency(totalDeductions)}`, card2X + cardW / 2, y + 18, { align: 'center' });

  // Repasse
  const card3X = margin + (cardW + 6) * 2;
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(card3X, y, cardW, cardH, 3, 3, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('REPASSE LIQUIDO', card3X + cardW / 2, y + 8, { align: 'center' });
  doc.setFontSize(13);
  doc.text(formatCurrency(netTransfer), card3X + cardW / 2, y + 18, { align: 'center' });

  y += 36;

  // === DETALHAMENTO ===
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('DEMONSTRATIVO FINANCEIRO'), margin, y);
  y += 4;

  const rows: string[][] = [];
  rows.push([normalizeText('Aluguel Recebido'), '', formatCurrency(rentReceived), 'Receita']);
  rows.push([normalizeText(`Taxa de Administracao (${lease.admin_fee_percentage}%)`), '', `-${formatCurrency(adminFee)}`, normalizeText('Deducao')]);

  maintenanceExpenses.forEach((e) => {
    rows.push([normalizeText(`Manutencao: ${e.description.substring(0, 40)}`), formatDateBR(e.date), `-${formatCurrency(e.amount)}`, normalizeText('Deducao')]);
  });

  otherDeductions.forEach((d) => {
    rows.push([normalizeText(d.description.substring(0, 40)), '', `-${formatCurrency(d.amount)}`, normalizeText('Deducao')]);
  });

  if (rows.length === 2 && maintenanceExpenses.length === 0 && otherDeductions.length === 0) {
    rows.push([normalizeText('Nenhuma despesa no periodo'), '', '-', '-']);
  }

  doc.autoTable({
    startY: y,
    head: [[normalizeText('Descricao'), 'Data', 'Valor', 'Tipo']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    didParseCell: (cellData: any) => {
      if (cellData.section === 'body') {
        const tipo = cellData.row.raw[3];
        if (cellData.column.index === 2) {
          if (tipo === 'Receita') {
            cellData.cell.styles.textColor = [22, 101, 52];
            cellData.cell.styles.fontStyle = 'bold';
          } else if (tipo === normalizeText('Deducao')) {
            cellData.cell.styles.textColor = [153, 27, 27];
            cellData.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // === REPASSE DESTAQUE ===
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');
  // Emerald accent on left
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y, 4, 22, 2, 0, 'F');

  doc.setFontSize(10);
  doc.setTextColor(200, 220, 240);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('VALOR LIQUIDO A REPASSAR'), margin + 12, y + 10);
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(netTransfer), pageWidth - margin - 6, y + 14, { align: 'right' });

  y += 30;

  // === DIMOB ===
  if (lease.is_dimob_deductible) {
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(133, 77, 14);
    doc.setFont('helvetica', 'bold');
    doc.text('DIMOB', margin + 6, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizeText(`Imovel deducivel para declaracao DIMOB. CIB: ${lease.cib || 'Nao informado'}`), margin + 30, y + 6);
    y += 20;
  }

  // === PROPRIETARIO ===
  const owner = lease.owner;
  if (owner) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText('PROPRIETARIO'), margin + 6, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(normalizeText(`Nome: ${owner.name || '-'}`), margin + 6, y + 14);
    doc.text(normalizeText(`Contato: ${owner.phone || owner.email || '-'}`), pageWidth / 2, y + 14);
  }

  // === FOOTER ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  const unitClean = (lease.unit?.unit_number || 'Imovel').replace(/[^a-zA-Z0-9]/g, '');
  doc.save(`Relatorio_Proprietario_${unitClean}_${period.start.replace(/\//g, '-')}.pdf`);
};
