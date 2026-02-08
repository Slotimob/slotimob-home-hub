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

// ============================================================================
// CONFIGURAÇÕES DE LAYOUT
// ============================================================================

const MARGINS = {
  left: 20,
  right: 20,
  top: 25,
  bottom: 25,
};

const COLORS = {
  primary: [99, 102, 241] as [number, number, number],
  primaryDark: [79, 70, 229] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  textMuted: [100, 100, 100] as [number, number, number],
  divider: [200, 200, 200] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// ============================================================================
// LOGO HELPERS
// ============================================================================

const drawSlotiLogo = (doc: jsPDF, x: number, y: number, size: number): void => {
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(x, y, size, size, 3, 3, 'F');
  
  doc.setFontSize(size * 0.6);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('S', x + size / 2, y + size * 0.7, { align: 'center' });
};

const drawSlotiLogoWatermark = (doc: jsPDF, x: number, y: number, size: number): void => {
  doc.setFillColor(...COLORS.primary);
  doc.saveGraphicsState();
  // @ts-ignore
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.roundedRect(x, y, size, size, 3, 3, 'F');
  doc.setFontSize(size * 0.6);
  doc.setTextColor(...COLORS.primary);
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
  // Se o valor estiver vazio, retorna linha pontilhada
  if (!value || value.trim() === '') {
    return '..............................';
  }
  
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

// Processa variáveis não preenchidas no conteúdo
const processEmptyVariables = (content: string): string => {
  // Substitui variáveis não preenchidas por linha pontilhada
  return content.replace(/\{\{[^}]+\}\}/g, '..............................');
};

export const fillTemplateContent = (
  template: DocumentTemplate,
  filledFields: Record<string, string>
): string => {
  let content = template.templateContent;
  
  // Primeiro, substitui as variáveis com valores preenchidos
  template.fields.forEach((field) => {
    const value = filledFields[field.id] || '';
    const formattedValue = formatFieldValue(field, value);
    const regex = new RegExp(`\\{\\{${field.id}\\}\\}`, 'g');
    content = content.replace(regex, formattedValue);
  });
  
  // Depois, processa quaisquer variáveis restantes que não foram mapeadas
  content = processEmptyVariables(content);
  
  return content;
};

// ============================================================================
// DESENHO DE ELEMENTOS
// ============================================================================

const drawHorizontalDivider = (doc: jsPDF, y: number, style: 'solid' | 'dashed' = 'solid'): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...COLORS.divider);
  doc.setLineWidth(0.3);
  
  if (style === 'dashed') {
    // Desenha linha tracejada manualmente
    const startX = MARGINS.left;
    const endX = pageWidth - MARGINS.right;
    const dashLength = 3;
    const gapLength = 2;
    let currentX = startX;
    
    while (currentX < endX) {
      const dashEnd = Math.min(currentX + dashLength, endX);
      doc.line(currentX, y, dashEnd, y);
      currentX = dashEnd + gapLength;
    }
  } else {
    doc.line(MARGINS.left, y, pageWidth - MARGINS.right, y);
  }
};

const drawSectionHeader = (doc: jsPDF, text: string, y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Linha decorativa antes do título
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(MARGINS.left, y - 1, MARGINS.left + 30, y - 1);
  
  // Título da seção
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(text, MARGINS.left, y + 4);
  
  return y + 10;
};

// ============================================================================
// RENDERIZAÇÃO DE TEXTO
// ============================================================================

interface TextStyle {
  fontSize: number;
  fontStyle: 'normal' | 'bold';
  textColor: [number, number, number];
  indent: number;
}

const normalizeText = (text: string): string => {
  return text.normalize('NFC');
};

const getLineStyle = (line: string): { style: TextStyle; processedLine: string; isHeader: boolean; isDivider: boolean } => {
  const trimmed = line.trim();
  
  // Detecta divisores (linhas com símbolos repetidos)
  if (trimmed.match(/^[━═─\-_]+$/) || trimmed.match(/^[█▓▒░]+$/)) {
    return { 
      style: { fontSize: 10, fontStyle: 'normal', textColor: COLORS.text, indent: 0 },
      processedLine: '',
      isHeader: false,
      isDivider: true,
    };
  }
  
  // Headers de cláusula
  if (trimmed.startsWith('CLÁUSULA') || trimmed.match(/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+$/) && trimmed.length > 10 && !trimmed.includes(':')) {
    return {
      style: { fontSize: 11, fontStyle: 'bold', textColor: COLORS.text, indent: 0 },
      processedLine: trimmed,
      isHeader: true,
      isDivider: false,
    };
  }
  
  // Seções com dois pontos (LOCADOR:, LOCATÁRIO:, etc)
  if (trimmed.match(/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]+:$/)) {
    return {
      style: { fontSize: 10, fontStyle: 'bold', textColor: COLORS.text, indent: 0 },
      processedLine: trimmed,
      isHeader: true,
      isDivider: false,
    };
  }
  
  // Subseções numeradas (1.1, 1.2, etc.)
  if (trimmed.match(/^\d+\.\d+\.?\s/)) {
    return {
      style: { fontSize: 10, fontStyle: 'normal', textColor: COLORS.text, indent: 0 },
      processedLine: trimmed.replace(/\*\*/g, ''),
      isHeader: false,
      isDivider: false,
    };
  }
  
  // Itens com numeração romana
  if (trimmed.match(/^[IVXLC]+\.\s/)) {
    return {
      style: { fontSize: 10, fontStyle: 'normal', textColor: COLORS.text, indent: 10 },
      processedLine: trimmed,
      isHeader: false,
      isDivider: false,
    };
  }
  
  // Itens com letras
  if (trimmed.match(/^[a-z]\)\s/i)) {
    return {
      style: { fontSize: 10, fontStyle: 'normal', textColor: COLORS.text, indent: 10 },
      processedLine: trimmed,
      isHeader: false,
      isDivider: false,
    };
  }
  
  // Assinaturas
  if (trimmed.startsWith('_____') || trimmed.match(/^Assinatura/i)) {
    return {
      style: { fontSize: 10, fontStyle: 'normal', textColor: COLORS.text, indent: 0 },
      processedLine: trimmed,
      isHeader: false,
      isDivider: false,
    };
  }
  
  // Texto padrão
  return {
    style: { fontSize: 10, fontStyle: 'normal', textColor: COLORS.text, indent: 0 },
    processedLine: trimmed,
    isHeader: false,
    isDivider: false,
  };
};

const renderTextWithBold = (
  doc: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number,
  baseStyle: TextStyle
): number => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  let currentX = x;
  let currentY = y;
  const lineHeight = 5;
  
  doc.setFontSize(baseStyle.fontSize);
  doc.setTextColor(...baseStyle.textColor);
  
  for (const part of parts) {
    if (!part) continue;
    
    const isBold = part.startsWith('**') && part.endsWith('**');
    const cleanText = normalizeText(isBold ? part.slice(2, -2) : part);
    
    doc.setFont('helvetica', isBold ? 'bold' : baseStyle.fontStyle);
    
    const textWidth = doc.getTextWidth(cleanText);
    if (currentX + textWidth > x + maxWidth && currentX > x) {
      currentY += lineHeight;
      currentX = x;
    }
    
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
// WATERMARK E FOOTER
// ============================================================================

const addWatermarkAndFooter = (doc: jsPDF, pageNumber: number, totalPages: number): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Watermark logo
  const logoSize = 18;
  const logoX = pageWidth - logoSize - 15;
  const logoY = pageHeight - logoSize - 20;
  drawSlotiLogoWatermark(doc, logoX, logoY, logoSize);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont('helvetica', 'normal');
  
  const footerY = pageHeight - 10;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  doc.text('Documento gerado por SLOTIMOB', MARGINS.left, footerY);
  doc.text(dateStr, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - MARGINS.right, footerY, { align: 'right' });
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
  const maxWidth = pageWidth - MARGINS.left - MARGINS.right;
  
  // Header com gradiente
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 22, 'F');
  
  // Logo no header
  drawSlotiLogo(doc, 12, 4, 14);
  
  // Título no header
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  
  const headerTitle = normalizeText(template.name.toUpperCase());
  doc.text(headerTitle, 30, 12);
  
  // Subtítulo
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Lei nº 8.245/91 - Lei do Inquilinato', 30, 18);
  
  // Reset para conteúdo
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  
  let currentY = 32;
  const lineSpacing = 5;
  
  // Processa conteúdo
  const content = blank
    ? processEmptyVariables(template.templateContent)
    : fillTemplateContent(template, filledFields);
  
  const lines = content.trim().split('\n');
  
  for (const line of lines) {
    const { style, processedLine, isHeader, isDivider } = getLineStyle(line);
    
    // Desenha divisor
    if (isDivider) {
      drawHorizontalDivider(doc, currentY);
      currentY += 6;
      continue;
    }
    
    // Linha vazia
    if (!processedLine) {
      currentY += 3;
      continue;
    }
    
    // Verifica necessidade de nova página
    if (currentY > pageHeight - MARGINS.bottom - 10) {
      doc.addPage();
      currentY = MARGINS.top;
    }
    
    const xPosition = MARGINS.left + style.indent;
    
    // Renderiza cabeçalhos de seção
    if (isHeader) {
      currentY += 2;
      currentY = drawSectionHeader(doc, processedLine, currentY);
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
      if (currentY > pageHeight - MARGINS.bottom - 10) {
        doc.addPage();
        currentY = MARGINS.top;
      }
      doc.text(textLine, xPosition, currentY);
      currentY += lineSpacing;
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
// GERADOR DE PDF PARA CONTRATOS COMPLETOS
// ============================================================================

export const generateFullContractPDF = (contractContent: string, fileName?: string): void => {
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true,
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - MARGINS.left - MARGINS.right;
  
  // Header profissional
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 24, 'F');
  
  // Linha decorativa inferior
  doc.setFillColor(...COLORS.primaryDark);
  doc.rect(0, 24, pageWidth, 2, 'F');
  
  // Logo
  drawSlotiLogo(doc, 12, 4, 16);
  
  // Títulos
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE LOCAÇÃO', 32, 12);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Lei nº 8.245/91 - Lei do Inquilinato | SLOTIMOB', 32, 19);
  
  // Reset
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  
  let currentY = 35;
  const lineSpacing = 4.5;
  
  // Processa variáveis não preenchidas
  const processedContent = processEmptyVariables(contractContent);
  const lines = processedContent.trim().split('\n');
  
  for (const line of lines) {
    const { style, processedLine, isHeader, isDivider } = getLineStyle(line);
    
    // Divisores
    if (isDivider) {
      drawHorizontalDivider(doc, currentY, 'dashed');
      currentY += 6;
      continue;
    }
    
    // Linhas vazias
    if (!processedLine) {
      currentY += 2.5;
      continue;
    }
    
    // Nova página se necessário
    if (currentY > pageHeight - MARGINS.bottom - 10) {
      doc.addPage();
      currentY = MARGINS.top;
    }
    
    const xPos = MARGINS.left + style.indent;
    
    // Headers de seção
    if (isHeader) {
      currentY += 3;
      
      // Background suave
      doc.setFillColor(248, 248, 252);
      doc.rect(MARGINS.left - 2, currentY - 4, maxWidth + 4, 8, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 100);
      doc.text(normalizeText(processedLine), xPos, currentY);
      
      currentY += 10;
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
    
    const splitLines = doc.splitTextToSize(normalizeText(processedLine), maxWidth - style.indent);
    
    for (const textLine of splitLines) {
      if (currentY > pageHeight - MARGINS.bottom - 10) {
        doc.addPage();
        currentY = MARGINS.top;
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
  const maxWidth = pageWidth - MARGINS.left - MARGINS.right;
  
  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 22, 'F');
  drawSlotiLogo(doc, 12, 4, 14);
  
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text(normalizeText(template.name.toUpperCase()), 30, 12);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Lei nº 8.245/91 - Lei do Inquilinato', 30, 18);
  
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  
  let currentY = 32;
  const content = fillTemplateContent(template, filledFields);
  const lines = content.trim().split('\n');
  
  for (const line of lines) {
    const { style, processedLine, isHeader, isDivider } = getLineStyle(line);
    
    if (isDivider) {
      drawHorizontalDivider(doc, currentY);
      currentY += 6;
      continue;
    }
    
    if (!processedLine) {
      currentY += 3;
      continue;
    }
    
    if (currentY > pageHeight - MARGINS.bottom - 10) {
      doc.addPage();
      currentY = MARGINS.top;
    }
    
    const xPos = MARGINS.left + style.indent;
    
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
      if (currentY > pageHeight - MARGINS.bottom - 10) {
        doc.addPage();
        currentY = MARGINS.top;
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
  const maxWidth = pageWidth - MARGINS.left - MARGINS.right;
  
  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFillColor(...COLORS.primaryDark);
  doc.rect(0, 24, pageWidth, 2, 'F');
  
  drawSlotiLogo(doc, 12, 4, 16);
  
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE LOCAÇÃO', 32, 12);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Lei nº 8.245/91 | SLOTIMOB', 32, 19);
  
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  
  let currentY = 35;
  const processedContent = processEmptyVariables(contractContent);
  const lines = processedContent.trim().split('\n');
  
  for (const line of lines) {
    const { style, processedLine, isDivider } = getLineStyle(line);
    
    if (isDivider) {
      drawHorizontalDivider(doc, currentY, 'dashed');
      currentY += 6;
      continue;
    }
    
    if (!processedLine) {
      currentY += 2.5;
      continue;
    }
    
    if (currentY > pageHeight - MARGINS.bottom - 10) {
      doc.addPage();
      currentY = MARGINS.top;
    }
    
    const xPos = MARGINS.left + style.indent;
    
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
      if (currentY > pageHeight - MARGINS.bottom - 10) {
        doc.addPage();
        currentY = MARGINS.top;
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
