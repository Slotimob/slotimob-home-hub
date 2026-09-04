import type jsPDF from 'jspdf';
import { formatDateOnly } from "@/lib/date-only";
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Lease } from '@/hooks/useLeases';
import { pdfSafeText, pdfSafeLabel } from '@/utils/pdfSafeText';

const normalizeText = (text: string): string => text.normalize('NFC');

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDateBR = (value: string): string => formatDateOnly(value, "dd/MM/yyyy", "");

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
  period: { start: string; end: string };
}

const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number): void => {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const fy = ph - 10;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, fy - 5, pw - 15, fy - 5);

  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.setFont('helvetica', 'normal');

  const dateStr = format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  doc.text(normalizeText(`Documento emitido por SLOTIMOB em ${dateStr}`), 15, fy);
  doc.text(normalizeText(`Pagina ${pageNumber} de ${totalPages}`), pw - 15, fy, { align: 'right' });
};

export const generateTenantStatementPDF = async (data: TenantStatementData): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 15;
  const cw = pw - margin * 2;
  const { lease, payments, period } = data;

  // === HEADER ===
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pw, 38, 'F');
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(0, 38, pw, 2, 'F');

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SLOTIMOB', margin, 16);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(normalizeText('Extrato Financeiro do Inquilino'), margin, 26);

  doc.setFontSize(9);
  doc.setTextColor(180, 200, 220);
  doc.text(normalizeText(`Periodo: ${period.start} a ${period.end}`), margin, 34);

  let y = 48;

  // === INFO CARDS ===
  const colW = (cw - 6) / 2;

  // Left - Inquilino
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, colW, 40, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('INQUILINO', margin + 6, y + 9);

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(pdfSafeText(`Nome: ${lease.tenant?.name || 'N/A'}`), margin + 6, y + 17);
  doc.text(pdfSafeText(`CPF/CNPJ: ${(lease.tenant as any)?.document_number || '-'}`), margin + 6, y + 24);
  doc.text(pdfSafeText(`Telefone: ${lease.tenant?.phone || '-'}`), margin + 6, y + 31);
  doc.text(pdfSafeText(`E-mail: ${(lease.tenant?.email || '-').substring(0, 30)}`), margin + 6, y + 38);

  // Right - Imovel
  const rx = margin + colW + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rx, y, colW, 40, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('IMOVEL', rx + 6, y + 9);

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(pdfSafeText(`Unidade: ${lease.unit?.unit_number || 'N/A'}`), rx + 6, y + 17);
  doc.text(pdfSafeText(`Condominio: ${(lease.unit?.property?.name || 'Imovel Avulso').substring(0, 28)}`), rx + 6, y + 24);
  doc.text(pdfSafeText(`Endereco: ${(lease.unit?.address || '-').substring(0, 28)}`), rx + 6, y + 31);
  doc.text(normalizeText(`Vencimento: Dia ${lease.due_day}`), rx + 6, y + 38);

  y += 48;

  // === STATUS DE CONTA (Summary Cards) ===
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.totalPaid, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const overdueCount = payments.filter(p => p.status === 'overdue').length;
  const saldoDevedor = totalPending + totalOverdue;

  const cardW2 = (cw - 18) / 4;
  const cardH = 26;

  // Paid
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin, y, cardW2, cardH, 3, 3, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('PAGO', margin + cardW2 / 2, y + 7, { align: 'center' });
  doc.setFontSize(11);
  doc.text(formatCurrency(totalPaid), margin + cardW2 / 2, y + 16, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${paidCount} parcela(s)`, margin + cardW2 / 2, y + 22, { align: 'center' });

  // Pending
  const c2 = margin + cardW2 + 6;
  doc.setFillColor(254, 249, 195);
  doc.roundedRect(c2, y, cardW2, cardH, 3, 3, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(133, 77, 14);
  doc.setFont('helvetica', 'bold');
  doc.text('PENDENTE', c2 + cardW2 / 2, y + 7, { align: 'center' });
  doc.setFontSize(11);
  doc.text(formatCurrency(totalPending), c2 + cardW2 / 2, y + 16, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${pendingCount} parcela(s)`, c2 + cardW2 / 2, y + 22, { align: 'center' });

  // Overdue
  const c3 = margin + (cardW2 + 6) * 2;
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(c3, y, cardW2, cardH, 3, 3, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(153, 27, 27);
  doc.setFont('helvetica', 'bold');
  doc.text('ATRASADO', c3 + cardW2 / 2, y + 7, { align: 'center' });
  doc.setFontSize(11);
  doc.text(formatCurrency(totalOverdue), c3 + cardW2 / 2, y + 16, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${overdueCount} parcela(s)`, c3 + cardW2 / 2, y + 22, { align: 'center' });

  // Saldo Devedor
  const c4 = margin + (cardW2 + 6) * 3;
  doc.setFillColor(saldoDevedor > 0 ? 254 : 220, saldoDevedor > 0 ? 226 : 252, saldoDevedor > 0 ? 226 : 231);
  doc.roundedRect(c4, y, cardW2, cardH, 3, 3, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(saldoDevedor > 0 ? 153 : 22, saldoDevedor > 0 ? 27 : 101, saldoDevedor > 0 ? 27 : 52);
  doc.setFont('helvetica', 'bold');
  doc.text('SALDO DEVEDOR', c4 + cardW2 / 2, y + 7, { align: 'center' });
  doc.setFontSize(11);
  doc.text(formatCurrency(saldoDevedor), c4 + cardW2 / 2, y + 16, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(saldoDevedor > 0 ? 'Em aberto' : 'Quitado', c4 + cardW2 / 2, y + 22, { align: 'center' });

  y += 34;

  // === HISTORICO DE PAGAMENTOS ===
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('HISTORICO DE PAGAMENTOS'), margin, y);
  y += 4;

  if (payments.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'italic');
    doc.text(normalizeText('Nenhum lancamento financeiro registrado para este periodo.'), margin, y + 8);
    y += 20;
  } else {
    const tableRows = payments.map((p) => [
      normalizeText(p.month),
      formatDateBR(p.dueDate),
      p.paidDate ? formatDateBR(p.paidDate) : '-',
      formatCurrency(p.amount),
      p.status === 'paid' ? formatCurrency(p.totalPaid) : '-',
      p.status === 'paid' ? 'Pago' : p.status === 'pending' ? 'Pendente' : 'Atrasado',
    ]);

    autoTable(doc, {
      startY: y,
      head: [[normalizeText('Referencia'), 'Vencimento', 'Pagamento', 'Valor', 'Pago', 'Status']],
      body: tableRows,
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
        0: { cellWidth: 38 },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 24, halign: 'center' },
      },
      margin: { left: margin, right: margin },
      didParseCell: (cellData: any) => {
        if (cellData.section === 'body' && cellData.column.index === 5) {
          const val = cellData.cell.raw;
          if (val === 'Pago') {
            cellData.cell.styles.textColor = [22, 101, 52];
            cellData.cell.styles.fontStyle = 'bold';
          } else if (val === 'Pendente') {
            cellData.cell.styles.textColor = [133, 77, 14];
            cellData.cell.styles.fontStyle = 'bold';
          } else if (val === 'Atrasado') {
            cellData.cell.styles.textColor = [153, 27, 27];
            cellData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // === PROXIMOS VENCIMENTOS ===
  const nextPayments: { month: string; dueDate: string; amount: number }[] = [];
  const now = new Date();
  for (let i = 1; i <= 2; i++) {
    const nextDate = addMonths(now, i);
    const dueDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), lease.due_day);
    const monthStr = format(nextDate, "MMMM/yyyy", { locale: ptBR });
    nextPayments.push({
      month: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
      dueDate: format(dueDate, 'dd/MM/yyyy'),
      amount: lease.rent_amount,
    });
  }

  // Check if we need a new page
  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, cw, 10 + nextPayments.length * 8, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText('PROXIMOS VENCIMENTOS'), margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  nextPayments.forEach((np, i) => {
    const lineY = y + 16 + i * 8;
    doc.text(normalizeText(np.month), margin + 6, lineY);
    doc.text(normalizeText(`Venc: ${np.dueDate}`), pw / 2 - 10, lineY);
    doc.text(formatCurrency(np.amount), pw - margin - 6, lineY, { align: 'right' });
  });

  // === FOOTER ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  const name = (lease.tenant?.name || 'Inquilino').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Extrato_${name}_${period.start.replace(/\//g, '-')}_${period.end.replace(/\//g, '-')}.pdf`);
};
