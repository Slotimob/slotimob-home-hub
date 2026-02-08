 import jsPDF from 'jspdf';
 import 'jspdf-autotable';
 import { format } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import type { Lease } from '@/hooks/useLeases';
 
 // Extend jsPDF type for autoTable
 declare module 'jspdf' {
   interface jsPDF {
     autoTable: (options: any) => jsPDF;
     lastAutoTable: { finalY: number };
   }
 }
 
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
 
 export const generateTenantStatementPDF = (data: TenantStatementData): void => {
   const doc = new jsPDF({
     putOnlyUsedFonts: true,
     compress: true,
   });
   
   const pageWidth = doc.internal.pageSize.getWidth();
   const { lease, payments, period } = data;
   
   // Clean professional header - dark slate
   doc.setFillColor(51, 65, 85);
   doc.rect(0, 0, pageWidth, 32, 'F');
   
   // Title - centered
   doc.setFontSize(16);
   doc.setTextColor(255, 255, 255);
   doc.setFont('helvetica', 'bold');
   doc.text(normalizeText('EXTRATO FINANCEIRO DO INQUILINO'), pageWidth / 2, 14, { align: 'center' });
   
   doc.setFontSize(9);
   doc.setFont('helvetica', 'normal');
   doc.text(normalizeText(`Período: ${period.start} a ${period.end}`), pageWidth / 2, 23, { align: 'center' });
   
   let currentY = 40;
   
   // Two-column info section
   const colWidth = (pageWidth - 30) / 2;
   
   // Left Column - Tenant Info
   doc.setFillColor(248, 250, 252);
   doc.roundedRect(10, currentY, colWidth, 42, 2, 2, 'F');
   
   doc.setFontSize(9);
   doc.setTextColor(71, 85, 105);
   doc.setFont('helvetica', 'bold');
   doc.text(normalizeText('INQUILINO'), 15, currentY + 8);
   
   doc.setFontSize(8);
   doc.setTextColor(30, 41, 59);
   doc.setFont('helvetica', 'normal');
   
   const tenantName = lease.tenant?.name || 'N/A';
   const tenantEmail = lease.tenant?.email || '-';
   const tenantPhone = lease.tenant?.phone || '-';
  const tenantDoc = (lease.tenant as any)?.document_number || '-';
   
   doc.text(normalizeText(`Nome: ${tenantName}`), 15, currentY + 16);
   doc.text(normalizeText(`CPF/CNPJ: ${tenantDoc}`), 15, currentY + 23);
   doc.text(normalizeText(`Telefone: ${tenantPhone}`), 15, currentY + 30);
   doc.text(normalizeText(`E-mail: ${tenantEmail.length > 28 ? tenantEmail.substring(0, 28) + '...' : tenantEmail}`), 15, currentY + 37);
   
   // Right Column - Property Info
   doc.setFillColor(248, 250, 252);
   doc.roundedRect(15 + colWidth, currentY, colWidth, 42, 2, 2, 'F');
   
   doc.setFontSize(9);
   doc.setTextColor(71, 85, 105);
   doc.setFont('helvetica', 'bold');
   doc.text(normalizeText('IMÓVEL'), 20 + colWidth, currentY + 8);
   
   doc.setFontSize(8);
   doc.setTextColor(30, 41, 59);
   doc.setFont('helvetica', 'normal');
   
   const unitName = lease.unit?.unit_number || 'N/A';
   const propertyName = lease.unit?.property?.name || 'Imóvel Avulso';
   const address = lease.unit?.address || '-';
  const city = (lease.unit as any)?.city || '';
  const state = (lease.unit as any)?.state || '';
   const location = city && state ? `${city}/${state}` : city || state || '-';
   
   doc.text(normalizeText(`Unidade: ${unitName}`), 20 + colWidth, currentY + 16);
   doc.text(normalizeText(`Condomínio: ${propertyName.length > 30 ? propertyName.substring(0, 30) + '...' : propertyName}`), 20 + colWidth, currentY + 23);
   doc.text(normalizeText(`Endereço: ${address.length > 30 ? address.substring(0, 30) + '...' : address}`), 20 + colWidth, currentY + 30);
   doc.text(normalizeText(`Localização: ${location}`), 20 + colWidth, currentY + 37);
   
   currentY += 50;
   
   // Contract summary row
   doc.setFillColor(241, 245, 249);
   doc.roundedRect(10, currentY, pageWidth - 20, 18, 2, 2, 'F');
   
   doc.setFontSize(8);
   doc.setTextColor(71, 85, 105);
   doc.setFont('helvetica', 'bold');
   
   const contractCol1 = 15;
   const contractCol2 = pageWidth / 4;
   const contractCol3 = pageWidth / 2;
   const contractCol4 = (pageWidth / 4) * 3;
   
   doc.text(normalizeText('Aluguel:'), contractCol1, currentY + 7);
   doc.text(normalizeText('Vencimento:'), contractCol2, currentY + 7);
   doc.text(normalizeText('Início:'), contractCol3, currentY + 7);
   doc.text(normalizeText('Término:'), contractCol4, currentY + 7);
   
   doc.setFont('helvetica', 'normal');
   doc.setTextColor(30, 41, 59);
   doc.text(formatCurrency(lease.rent_amount), contractCol1, currentY + 14);
   doc.text(`Dia ${lease.due_day}`, contractCol2, currentY + 14);
   doc.text(formatDateBR(lease.start_date), contractCol3, currentY + 14);
   doc.text(lease.end_date ? formatDateBR(lease.end_date) : '-', contractCol4, currentY + 14);
   
   currentY += 26;
   
   // Summary Cards Section
   const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalPaid, 0);
   const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
   const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
   const paidCount = payments.filter(p => p.status === 'paid').length;
   const pendingCount = payments.filter(p => p.status === 'pending').length;
   const overdueCount = payments.filter(p => p.status === 'overdue').length;
   
   const cardWidth = (pageWidth - 40) / 3;
   const cardHeight = 22;
   
   // Paid Card
   doc.setFillColor(220, 252, 231);
   doc.roundedRect(10, currentY, cardWidth, cardHeight, 2, 2, 'F');
   doc.setFontSize(7);
   doc.setTextColor(22, 101, 52);
   doc.setFont('helvetica', 'bold');
   doc.text(normalizeText('PAGO'), 10 + cardWidth / 2, currentY + 6, { align: 'center' });
   doc.setFontSize(11);
   doc.text(formatCurrency(totalPaid), 10 + cardWidth / 2, currentY + 14, { align: 'center' });
   doc.setFontSize(7);
   doc.setFont('helvetica', 'normal');
   doc.text(`${paidCount} parcela(s)`, 10 + cardWidth / 2, currentY + 19, { align: 'center' });
   
   // Pending Card
   doc.setFillColor(254, 249, 195);
   doc.roundedRect(15 + cardWidth, currentY, cardWidth, cardHeight, 2, 2, 'F');
   doc.setFontSize(7);
   doc.setTextColor(133, 77, 14);
   doc.setFont('helvetica', 'bold');
   doc.text(normalizeText('PENDENTE'), 15 + cardWidth + cardWidth / 2, currentY + 6, { align: 'center' });
   doc.setFontSize(11);
   doc.text(formatCurrency(totalPending), 15 + cardWidth + cardWidth / 2, currentY + 14, { align: 'center' });
   doc.setFontSize(7);
   doc.setFont('helvetica', 'normal');
   doc.text(`${pendingCount} parcela(s)`, 15 + cardWidth + cardWidth / 2, currentY + 19, { align: 'center' });
   
   // Overdue Card
   doc.setFillColor(254, 226, 226);
   doc.roundedRect(20 + cardWidth * 2, currentY, cardWidth, cardHeight, 2, 2, 'F');
   doc.setFontSize(7);
   doc.setTextColor(153, 27, 27);
   doc.setFont('helvetica', 'bold');
   doc.text(normalizeText('ATRASADO'), 20 + cardWidth * 2 + cardWidth / 2, currentY + 6, { align: 'center' });
   doc.setFontSize(11);
   doc.text(formatCurrency(totalOverdue), 20 + cardWidth * 2 + cardWidth / 2, currentY + 14, { align: 'center' });
   doc.setFontSize(7);
   doc.setFont('helvetica', 'normal');
   doc.text(`${overdueCount} parcela(s)`, 20 + cardWidth * 2 + cardWidth / 2, currentY + 19, { align: 'center' });
   
   currentY += 30;
   
   // Table Title
   doc.setFontSize(10);
   doc.setTextColor(51, 65, 85);
   doc.setFont('helvetica', 'bold');
   doc.text(normalizeText('HISTÓRICO DE PARCELAS'), 15, currentY);
   currentY += 4;
   
   const tableData = payments.map((payment) => [
     normalizeText(payment.month),
     formatDateBR(payment.dueDate),
     payment.paidDate ? formatDateBR(payment.paidDate) : '-',
     formatCurrency(payment.amount),
     payment.status === 'paid' ? formatCurrency(payment.totalPaid) : '-',
     payment.status === 'paid' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : 'Atrasado',
   ]);
   
   doc.autoTable({
     startY: currentY,
     head: [[
       normalizeText('Referência'),
       normalizeText('Vencimento'),
       normalizeText('Pagto'),
       normalizeText('Valor'),
       normalizeText('Pago'),
       normalizeText('Status'),
     ]],
     body: tableData,
     theme: 'striped',
     headStyles: {
       fillColor: [51, 65, 85],
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
       0: { cellWidth: 40 },
       1: { cellWidth: 28, halign: 'center' },
       2: { cellWidth: 28, halign: 'center' },
       3: { cellWidth: 32, halign: 'right' },
       4: { cellWidth: 32, halign: 'right' },
       5: { cellWidth: 28, halign: 'center' },
     },
     margin: { left: 10, right: 10 },
     didParseCell: (data: any) => {
       if (data.section === 'body' && data.column.index === 5) {
         const status = data.cell.raw;
         if (status === 'Pago') {
           data.cell.styles.textColor = [22, 101, 52];
           data.cell.styles.fontStyle = 'bold';
         } else if (status === 'Pendente') {
           data.cell.styles.textColor = [133, 77, 14];
           data.cell.styles.fontStyle = 'bold';
         } else if (status === 'Atrasado') {
           data.cell.styles.textColor = [153, 27, 27];
           data.cell.styles.fontStyle = 'bold';
         }
       }
     },
   });
   
   currentY = doc.lastAutoTable.finalY + 15;
   
   // Final Balance Summary
   const grandTotal = totalPaid + totalPending + totalOverdue;
   
   doc.setFillColor(241, 245, 249);
   doc.roundedRect(10, currentY, pageWidth - 20, 24, 2, 2, 'F');
   
   doc.setFontSize(9);
   doc.setTextColor(51, 65, 85);
   doc.setFont('helvetica', 'bold');
   doc.text(normalizeText('TOTAL DO PERÍODO'), 15, currentY + 10);
   
   const summaryCol1 = pageWidth / 4;
   const summaryCol2 = pageWidth / 2;
   const summaryCol3 = (pageWidth / 4) * 3;
   
   doc.setFontSize(8);
   doc.setFont('helvetica', 'normal');
   doc.text(normalizeText('Total Previsto:'), summaryCol1, currentY + 8);
   doc.setFont('helvetica', 'bold');
   doc.text(formatCurrency(grandTotal), summaryCol1, currentY + 15);
   
   doc.setFont('helvetica', 'normal');
   doc.text(normalizeText('Já Pago:'), summaryCol2, currentY + 8);
   doc.setFont('helvetica', 'bold');
   doc.setTextColor(22, 101, 52);
   doc.text(formatCurrency(totalPaid), summaryCol2, currentY + 15);
   
   doc.setFont('helvetica', 'normal');
   doc.setTextColor(51, 65, 85);
   doc.text(normalizeText('Saldo Devedor:'), summaryCol3, currentY + 8);
   doc.setFont('helvetica', 'bold');
   const saldoDevedor = totalPending + totalOverdue;
   if (saldoDevedor > 0) {
     doc.setTextColor(153, 27, 27);
   } else {
     doc.setTextColor(22, 101, 52);
   }
   doc.text(formatCurrency(saldoDevedor), summaryCol3, currentY + 15);
   
   // Add clean footer (no logo)
   const totalPages = doc.getNumberOfPages();
   for (let i = 1; i <= totalPages; i++) {
     doc.setPage(i);
     addCleanFooter(doc, i, totalPages);
   }
   
   // Save
   const tenantNameClean = (lease.tenant?.name || 'Inquilino').replace(/[^a-zA-Z0-9]/g, '_');
   const fileName = `Extrato_${tenantNameClean}_${period.start.replace(/\//g, '-')}_${period.end.replace(/\//g, '-')}.pdf`;
   doc.save(fileName);
 };