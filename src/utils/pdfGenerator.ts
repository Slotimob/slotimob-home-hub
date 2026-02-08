import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DocumentTemplate, TemplateField } from './documentTemplates';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

// Use a simple drawn logo instead of base64 PNG to avoid jspdf decoding issues
const drawSlotiLogo = (doc: jsPDF, x: number, y: number, size: number): void => {
  // Draw a simple "S" shape representing Sloti logo
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(x, y, size, size, 3, 3, 'F');
  
  // White "S" letter
  doc.setFontSize(size * 0.6);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('S', x + size / 2, y + size * 0.7, { align: 'center' });
};

const drawSlotiLogoWatermark = (doc: jsPDF, x: number, y: number, size: number): void => {
  // Draw a subtle watermark version
  doc.setFillColor(99, 102, 241);
  doc.saveGraphicsState();
  // @ts-ignore
  doc.setGState(new doc.GState({ opacity: 0.1 }));
  doc.roundedRect(x, y, size, size, 3, 3, 'F');
  doc.setFontSize(size * 0.6);
  doc.setTextColor(99, 102, 241);
  doc.setFont('helvetica', 'bold');
  doc.text('S', x + size / 2, y + size * 0.7, { align: 'center' });
  doc.restoreGraphicsState();
};

// ============================================================================
// FORMATAÇÃO DE VALORES
// ============================================================================

export const formatCurrency = (value: string | number): string => {
  if (!value) return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) / 100 : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

export const formatDate = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR');
};

export const formatCPF = (value: string): string => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatPhone = (value: string): string => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};

const formatFieldValue = (field: TemplateField, value: string): string => {
  if (!value) return '____________________';
  
  switch (field.type) {
    case 'currency':
      return formatCurrency(value);
    case 'date':
      return formatDate(value);
    case 'cpf':
      return formatCPF(value);
    case 'phone':
      return formatPhone(value);
    default:
      return value;
  }
};

export const fillTemplateContent = (
  template: DocumentTemplate,
  filledFields: Record<string, string>
): string => {
  let content = template.templateContent;
  
  template.fields.forEach((field) => {
    const value = filledFields[field.id] || '';
    const formattedValue = formatFieldValue(field, value);
    const regex = new RegExp(`{{${field.id}}}`, 'g');
    content = content.replace(regex, formattedValue);
  });
  
  return content;
};

// ============================================================================
// RENDERIZAÇÃO DE PDF APRIMORADA
// ============================================================================

interface PDFStyle {
  fontSize: number;
  fontStyle: 'normal' | 'bold' | 'italic' | 'bolditalic';
  textColor: [number, number, number];
  indent: number;
}

const STYLES: Record<string, PDFStyle> = {
  title: { fontSize: 14, fontStyle: 'bold', textColor: [99, 102, 241], indent: 0 },
  subtitle: { fontSize: 11, fontStyle: 'bold', textColor: [60, 60, 60], indent: 0 },
  clauseHeader: { fontSize: 11, fontStyle: 'bold', textColor: [0, 0, 0], indent: 0 },
  clauseSubheader: { fontSize: 10, fontStyle: 'bold', textColor: [40, 40, 40], indent: 0 },
  body: { fontSize: 10, fontStyle: 'normal', textColor: [0, 0, 0], indent: 0 },
  indented: { fontSize: 10, fontStyle: 'normal', textColor: [0, 0, 0], indent: 10 },
  romanItem: { fontSize: 10, fontStyle: 'normal', textColor: [0, 0, 0], indent: 15 },
  letterItem: { fontSize: 10, fontStyle: 'normal', textColor: [0, 0, 0], indent: 15 },
  signature: { fontSize: 10, fontStyle: 'normal', textColor: [0, 0, 0], indent: 0 },
  footer: { fontSize: 8, fontStyle: 'normal', textColor: [128, 128, 128], indent: 0 },
};

const addWatermarkAndFooter = (doc: jsPDF, pageNumber: number, totalPages: number): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Watermark logo no canto inferior direito (semi-transparente)
  const logoSize = 20;
  const logoX = pageWidth - logoSize - 12;
  const logoY = pageHeight - logoSize - 22;
  
  drawSlotiLogoWatermark(doc, logoX, logoY, logoSize);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  
  const footerY = pageHeight - 8;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  
  doc.text('Documento gerado por SLOTIMOB | Lei 8.245/91', 15, footerY);
  doc.text(dateStr, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, footerY, { align: 'right' });
};

// Normaliza texto para suporte UTF-8
const normalizeText = (text: string): string => {
  return text.normalize('NFC');
};

// Detecta o tipo de linha e retorna o estilo apropriado
const getLineStyle = (line: string): { style: PDFStyle; processedLine: string; skipLine?: boolean } => {
  const trimmed = line.trim();
  
  // Linhas de separação (█ ou ━)
  if (trimmed.match(/^[█━]+$/)) {
    return { style: STYLES.body, processedLine: '', skipLine: true };
  }
  
  // Títulos principais (████)
  if (trimmed.includes('████') || trimmed.includes('CONTRATO DE LOCAÇÃO')) {
    return { style: STYLES.title, processedLine: trimmed.replace(/█/g, '').trim() };
  }
  
  // Headers de seção (━━━ seguido de texto ━━━)
  if (trimmed.startsWith('CLÁUSULA') || (trimmed.match(/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+$/) && trimmed.length > 10 && !trimmed.includes(':'))) {
    return { style: STYLES.clauseHeader, processedLine: trimmed };
  }
  
  // Subseções numeradas (1.1, 1.2, etc.)
  if (trimmed.match(/^\d+\.\d+\.?\s/)) {
    const hasBold = trimmed.includes('**');
    return { 
      style: hasBold ? STYLES.clauseSubheader : STYLES.body, 
      processedLine: trimmed.replace(/\*\*/g, '') 
    };
  }
  
  // Itens com numeração romana (I., II., III., etc.)
  if (trimmed.match(/^[IVXLC]+\.\s/)) {
    return { style: STYLES.romanItem, processedLine: trimmed };
  }
  
  // Itens com letras (a), b), etc.)
  if (trimmed.match(/^[a-z]\)\s/i)) {
    return { style: STYLES.letterItem, processedLine: trimmed };
  }
  
  // Linhas com checkbox
  if (trimmed.startsWith('□')) {
    return { style: STYLES.indented, processedLine: trimmed };
  }
  
  // Assinaturas
  if (trimmed.startsWith('_____') || trimmed.startsWith('**LOCADOR') || trimmed.startsWith('**LOCATÁRIO') || 
      trimmed.startsWith('**FIADOR') || trimmed.startsWith('**CÔNJUGE') || trimmed.startsWith('**TESTEMUNHAS')) {
    return { style: STYLES.signature, processedLine: trimmed.replace(/\*\*/g, '') };
  }
  
  // Parágrafos com **negrito**
  if (trimmed.includes('**')) {
    return { style: STYLES.body, processedLine: trimmed };
  }
  
  // Parágrafo único ou observações
  if (trimmed.startsWith('Parágrafo') || trimmed.startsWith('Observação')) {
    return { style: STYLES.indented, processedLine: trimmed };
  }
  
  // Texto normal
  return { style: STYLES.body, processedLine: trimmed };
};

// Renderiza texto com suporte a **negrito**
const renderTextWithBold = (
  doc: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number,
  baseStyle: PDFStyle
): number => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  let currentX = x;
  let currentY = y;
  let lineHeight = 5;
  
  doc.setFontSize(baseStyle.fontSize);
  doc.setTextColor(...baseStyle.textColor);
  
  for (const part of parts) {
    if (!part) continue;
    
    const isBold = part.startsWith('**') && part.endsWith('**');
    const cleanText = normalizeText(isBold ? part.slice(2, -2) : part);
    
    doc.setFont('helvetica', isBold ? 'bold' : baseStyle.fontStyle);
    
    // Verifica se precisa quebrar linha
    const textWidth = doc.getTextWidth(cleanText);
    if (currentX + textWidth > x + maxWidth && currentX > x) {
      currentY += lineHeight;
      currentX = x;
    }
    
    // Quebra texto longo em múltiplas linhas
    if (textWidth > maxWidth) {
      const splitLines = doc.splitTextToSize(cleanText, maxWidth);
      for (let i = 0; i < splitLines.length; i++) {
        if (i > 0) {
          currentY += lineHeight;
          currentX = x;
        }
        doc.text(splitLines[i], currentX, currentY);
        currentX = x + doc.getTextWidth(splitLines[i]);
      }
    } else {
      doc.text(cleanText, currentX, currentY);
      currentX += textWidth;
    }
  }
  
  return currentY;
};

// ============================================================================
// GERADOR DE PDF PRINCIPAL
// ============================================================================

export const generateDocumentPDF = (
  template: DocumentTemplate,
  filledFields: Record<string, string>,
  blank: boolean = false
): void => {
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true,
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  
  // Header com gradiente
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 22, 'F');
  
  // Logo no header (drawn)
  drawSlotiLogo(doc, 10, 4, 14);
  
  // Título no header
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  
  const headerTitle = normalizeText(template.name.toUpperCase());
  doc.text(headerTitle, 28, 13);
  
  // Subtítulo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Lei nº 8.245/91 - Lei do Inquilinato', 28, 18);
  
  // Reset para conteúdo
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  let currentY = 32;
  const lineSpacing = 5;
  const sectionSpacing = 8;
  
  // Processa conteúdo
  const content = blank
    ? template.templateContent
    : fillTemplateContent(template, filledFields);
  
  const lines = content.trim().split('\n');
  
  for (const line of lines) {
    const { style, processedLine, skipLine } = getLineStyle(line);
    
    if (skipLine) {
      // Desenha linha de separação
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 4;
      continue;
    }
    
    if (!processedLine) {
      currentY += 3;
      continue;
    }
    
    // Verifica necessidade de nova página
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 20;
    }
    
    const xPosition = margin + style.indent;
    
    // Renderiza cabeçalhos de cláusula com destaque
    if (style === STYLES.clauseHeader) {
      currentY += 3;
      
      // Linha decorativa antes
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY - 2, margin + 40, currentY - 2);
      
      doc.setFontSize(style.fontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...style.textColor);
      
      const clauseText = normalizeText(processedLine);
      const splitClause = doc.splitTextToSize(clauseText, maxWidth);
      doc.text(splitClause, xPosition, currentY);
      
      currentY += (splitClause.length * lineSpacing) + 3;
      continue;
    }
    
    // Renderiza texto com suporte a negrito inline
    if (processedLine.includes('**')) {
      currentY = renderTextWithBold(doc, processedLine, xPosition, currentY, maxWidth - style.indent, style);
      currentY += lineSpacing;
      continue;
    }
    
    // Texto normal
    doc.setFontSize(style.fontSize);
    doc.setFont('helvetica', style.fontStyle);
    doc.setTextColor(...style.textColor);
    
    const normalizedText = normalizeText(processedLine);
    const splitText = doc.splitTextToSize(normalizedText, maxWidth - style.indent);
    
    for (const textLine of splitText) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(textLine, xPosition, currentY);
      currentY += lineSpacing;
    }
    
    // Espaço extra após cláusulas
    if (processedLine.match(/^\d+\.\d+\./)) {
      currentY += 1;
    }
  }
  
  // Adiciona watermark e footer em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermarkAndFooter(doc, i, totalPages);
  }
  
  // Salva o PDF
  const fileName = blank
    ? `${template.name} - Modelo.pdf`
    : `${template.name} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  
  doc.save(fileName);
};

export const generateBlankTemplatePDF = (template: DocumentTemplate): void => {
  generateDocumentPDF(template, {}, true);
};

// ============================================================================
// GERADOR DE PDF PARA CONTRATOS COMPLETOS (Lei 8.245/91)
// ============================================================================

export const generateFullContractPDF = (contractContent: string, fileName?: string): void => {
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true,
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  
  // Header profissional
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  // Linha decorativa inferior
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 25, pageWidth, 2, 'F');
  
  // Logo (drawn)
  drawSlotiLogo(doc, 12, 5, 16);
  
  // Títulos
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE LOCAÇÃO', 32, 13);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Lei nº 8.245/91 - Lei do Inquilinato | Documento gerado por SLOTIMOB', 32, 20);
  
  // Reset
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  let currentY = 35;
  const lineSpacing = 4.5;
  
  const lines = contractContent.trim().split('\n');
  
  for (const line of lines) {
    const { style, processedLine, skipLine } = getLineStyle(line);
    
    // Separadores
    if (skipLine || line.trim().match(/^[━═]+$/)) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 5;
      continue;
    }
    
    // Linhas vazias
    if (!processedLine) {
      currentY += 2.5;
      continue;
    }
    
    // Nova página se necessário
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 18;
    }
    
    const xPos = margin + style.indent;
    
    // Headers de cláusula
    if (style === STYLES.clauseHeader || processedLine.startsWith('CLÁUSULA')) {
      currentY += 4;
      
      doc.setFillColor(245, 245, 250);
      doc.rect(margin - 2, currentY - 4, maxWidth + 4, 7, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 100);
      
      const clauseText = normalizeText(processedLine);
      doc.text(clauseText, xPos, currentY);
      
      currentY += 8;
      continue;
    }
    
    // Títulos principais
    if (style === STYLES.title || processedLine.includes('CONTRATO DE LOCAÇÃO')) {
      currentY += 3;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      
      const titleText = normalizeText(processedLine.replace(/[█]/g, '').trim());
      doc.text(titleText, pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 8;
      continue;
    }
    
    // Texto com negrito
    if (processedLine.includes('**')) {
      currentY = renderTextWithBold(doc, processedLine, xPos, currentY, maxWidth - style.indent, style);
      currentY += lineSpacing;
      continue;
    }
    
    // Texto padrão
    doc.setFontSize(style.fontSize);
    doc.setFont('helvetica', style.fontStyle);
    doc.setTextColor(...style.textColor);
    
    const normalizedText = normalizeText(processedLine);
    const splitLines = doc.splitTextToSize(normalizedText, maxWidth - style.indent);
    
    for (const textLine of splitLines) {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 18;
      }
      doc.text(textLine, xPos, currentY);
      currentY += lineSpacing;
    }
  }
  
  // Watermark e footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermarkAndFooter(doc, i, totalPages);
  }
  
  // Salva
  const finalFileName = fileName || `Contrato de Locação - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(finalFileName);
};

// ============================================================================
// GERADOR DE PDF COMO BASE64 (para envio por email/WhatsApp)
// ============================================================================

export const generateDocumentPDFBlob = async (
  template: DocumentTemplate,
  filledFields: Record<string, string>
): Promise<string> => {
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true,
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  
  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 22, 'F');
  drawSlotiLogo(doc, 10, 4, 14);
  
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText(template.name.toUpperCase()), 28, 13);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Lei nº 8.245/91 - Lei do Inquilinato', 28, 18);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  let currentY = 32;
  const content = fillTemplateContent(template, filledFields);
  const lines = content.trim().split('\n');
  
  for (const line of lines) {
    const { style, processedLine, skipLine } = getLineStyle(line);
    
    if (skipLine) {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 4;
      continue;
    }
    
    if (!processedLine) {
      currentY += 3;
      continue;
    }
    
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 20;
    }
    
    const xPos = margin + style.indent;
    
    if (processedLine.includes('**')) {
      currentY = renderTextWithBold(doc, processedLine, xPos, currentY, maxWidth - style.indent, style);
      currentY += 5;
      continue;
    }
    
    doc.setFontSize(style.fontSize);
    doc.setFont('helvetica', style.fontStyle);
    doc.setTextColor(...style.textColor);
    
    const splitText = doc.splitTextToSize(normalizeText(processedLine), maxWidth - style.indent);
    for (const textLine of splitText) {
      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(textLine, xPos, currentY);
      currentY += 5;
    }
  }
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermarkAndFooter(doc, i, totalPages);
  }
  
  return doc.output('datauristring').split(',')[1];
};

export const generateFullContractPDFBlob = async (contractContent: string): Promise<string> => {
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true,
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  
  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 25, pageWidth, 2, 'F');
  
  drawSlotiLogo(doc, 12, 5, 16);
  
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE LOCAÇÃO', 32, 13);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Lei nº 8.245/91 | SLOTIMOB', 32, 20);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  let currentY = 35;
  const lines = contractContent.trim().split('\n');
  
  for (const line of lines) {
    const { style, processedLine, skipLine } = getLineStyle(line);
    
    if (skipLine) {
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 5;
      continue;
    }
    
    if (!processedLine) {
      currentY += 2.5;
      continue;
    }
    
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 18;
    }
    
    const xPos = margin + style.indent;
    
    if (processedLine.includes('**')) {
      currentY = renderTextWithBold(doc, processedLine, xPos, currentY, maxWidth - style.indent, style);
      currentY += 4.5;
      continue;
    }
    
    doc.setFontSize(style.fontSize);
    doc.setFont('helvetica', style.fontStyle);
    doc.setTextColor(...style.textColor);
    
    const splitLines = doc.splitTextToSize(normalizeText(processedLine), maxWidth - style.indent);
    for (const textLine of splitLines) {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 18;
      }
      doc.text(textLine, xPos, currentY);
      currentY += 4.5;
    }
  }
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermarkAndFooter(doc, i, totalPages);
  }
  
  return doc.output('datauristring').split(',')[1];
};
