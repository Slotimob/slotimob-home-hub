import type jsPDF from 'jspdf';
import { pdfSafeText, pdfSafeLabel } from '@/utils/pdfSafeText';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

// ============================================================================
// CONFIGURAÇÕES DO DOCUMENTO JURÍDICO
// ============================================================================

const CONFIG = {
  // Margens em mm (2,5cm = 25mm)
  margins: {
    top: 25,
    bottom: 25,
    left: 25,
    right: 25,
  },
  // Tipografia
  fonts: {
    body: { size: 11, lineHeight: 1.5 },
    title: { size: 12, lineHeight: 1.3 },
    clauseHeader: { size: 11, lineHeight: 1.4 },
    footer: { size: 8, lineHeight: 1.2 },
    signature: { size: 10, lineHeight: 1.3 },
  },
  // Cores (preto e branco apenas)
  colors: {
    black: [0, 0, 0] as [number, number, number],
    gray: [100, 100, 100] as [number, number, number],
    lightGray: [180, 180, 180] as [number, number, number],
  },
};

// ============================================================================
// FORMATAÇÃO DE VALORES
// ============================================================================

export const formatCurrency = (value: string | number): string => {
  if (!value && value !== 0) return '_______________';
  const num = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) / 100 : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

export const formatDate = (value: string): string => {
  if (!value) return '___/___/______';
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR');
};

export const formatDateExtended = (value: string): string => {
  if (!value) return '___ de _______________ de ______';
  const date = new Date(value);
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
};

export const formatCPF = (value: string): string => {
  if (!value) return '___.___.___-__';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return value;
};

export const formatCNPJ = (value: string): string => {
  if (!value) return '__.___.___/____-__';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};

export const formatRG = (value: string): string => {
  if (!value) return '_______________';
  return value;
};

// Função para tratar campos vazios
const safeField = (value: string | null | undefined, placeholder: string = '_______________'): string => {
  if (!value || value.trim() === '' || value.toLowerCase() === 'não informado' || value.toLowerCase() === 'n/a') {
    return placeholder;
  }
  return value;
};

// Normaliza texto para suporte UTF-8
const normalizeText = (text: string): string => {
  return text.normalize('NFC');
};

// ============================================================================
// INTERFACE DE DADOS DO CONTRATO
// ============================================================================

export interface LegalContractData {
  // Locador
  locador: {
    nome: string;
    nacionalidade?: string;
    estadoCivil?: string;
    profissao?: string;
    rg?: string;
    cpf?: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    email?: string;
    telefone?: string;
  };
  // Locatário
  locatario: {
    nome: string;
    nacionalidade?: string;
    estadoCivil?: string;
    profissao?: string;
    rg?: string;
    cpf?: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    email?: string;
    telefone?: string;
  };
  // Cônjuge do Locador (se casado)
  conjugeLocador?: {
    nome?: string;
    nacionalidade?: string;
    profissao?: string;
    rg?: string;
    cpf?: string;
  };
  // Cônjuge do Locatário (se casado)
  conjugeLocatario?: {
    nome?: string;
    nacionalidade?: string;
    profissao?: string;
    rg?: string;
    cpf?: string;
  };
  // Fiador
  fiador?: {
    nome?: string;
    nacionalidade?: string;
    estadoCivil?: string;
    profissao?: string;
    rg?: string;
    cpf?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    email?: string;
    telefone?: string;
  };
  // Cônjuge do Fiador
  conjugeFiador?: {
    nome?: string;
    nacionalidade?: string;
    profissao?: string;
    rg?: string;
    cpf?: string;
  };
  // Imóvel
  imovel: {
    endereco: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade: string;
    estado: string;
    cep?: string;
    tipo?: string;
    descricao?: string;
    matricula?: string;
    cib?: string;
  };
  // Contrato
  contrato: {
    valorAluguel: number;
    diaVencimento: number;
    dataInicio: string;
    dataFim?: string;
    prazoMeses: number;
    indiceReajuste: string;
    garantia: 'fiador' | 'caucao' | 'seguro_fianca' | 'titulo_capitalizacao' | 'nenhuma';
    valorCaucao?: number;
    finalidade: 'residencial' | 'comercial';
  };
  // Pagamento
  pagamento?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    tipoConta?: string;
    pix?: string;
    beneficiario?: string;
  };
  billingContact?: {
    name?: string;
    email?: string;
    whatsapp?: string;
  };
}

// ============================================================================
// GERADOR DE PDF DE CONTRATO JURÍDICO
// ============================================================================

export const generateLegalContractPDF = async (data: LegalContractData, fileName?: string): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true,
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { margins, fonts, colors } = CONFIG;
  const contentWidth = pageWidth - margins.left - margins.right;

  let currentY = margins.top;
  let pageNumber = 1;
  const allPages: number[] = [];

  // =========================================================================
  // FUNÇÕES AUXILIARES
  // =========================================================================

  const checkPageBreak = (neededSpace: number): void => {
    if (currentY + neededSpace > pageHeight - margins.bottom - 15) {
      doc.addPage();
      pageNumber++;
      allPages.push(pageNumber);
      currentY = margins.top;
    }
  };

  const addParagraph = (text: string, options?: { 
    bold?: boolean; 
    align?: 'left' | 'center' | 'justify'; 
    indent?: number;
    fontSize?: number;
  }): void => {
    const { bold = false, align = 'justify', indent = 0, fontSize = fonts.body.size } = options || {};
    
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...colors.black);

    const effectiveWidth = contentWidth - indent;
    const normalizedText = normalizeText(text);
    const lines = doc.splitTextToSize(normalizedText, effectiveWidth);
    const lineHeight = fontSize * fonts.body.lineHeight * 0.352778; // pt to mm

    for (const line of lines) {
      checkPageBreak(lineHeight + 2);
      
      if (align === 'center') {
        doc.text(line, pageWidth / 2, currentY, { align: 'center' });
      } else if (align === 'justify') {
        // Justificação manual para linhas completas
        doc.text(line, margins.left + indent, currentY);
      } else {
        doc.text(line, margins.left + indent, currentY);
      }
      currentY += lineHeight;
    }
  };

  const addClauseHeader = (number: string, title: string): void => {
    checkPageBreak(15);
    currentY += 6; // Espaço extra antes da cláusula
    
    doc.setFontSize(fonts.clauseHeader.size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.black);
    
    const headerText = normalizeText(`CLÁUSULA ${number} – ${title.toUpperCase()}`);
    doc.text(headerText, margins.left, currentY);
    currentY += fonts.clauseHeader.size * fonts.clauseHeader.lineHeight * 0.352778 + 2;
  };

  const addSubClause = (number: string, text: string): void => {
    checkPageBreak(10);
    
    const prefix = `${number} `;
    doc.setFontSize(fonts.body.size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.black);
    
    const prefixWidth = doc.getTextWidth(prefix);
    doc.text(prefix, margins.left, currentY);
    
    doc.setFont('helvetica', 'normal');
    const remainingText = normalizeText(text);
    const lines = doc.splitTextToSize(remainingText, contentWidth - prefixWidth);
    const lineHeight = fonts.body.size * fonts.body.lineHeight * 0.352778;
    
    let firstLine = true;
    for (const line of lines) {
      if (firstLine) {
        doc.text(line, margins.left + prefixWidth, currentY);
        firstLine = false;
      } else {
        checkPageBreak(lineHeight + 1);
        doc.text(line, margins.left, currentY);
      }
      currentY += lineHeight;
    }
  };

  const addRomanItem = (numeral: string, text: string): void => {
    checkPageBreak(8);
    
    const indent = 8;
    const prefix = `${numeral} – `;
    
    doc.setFontSize(fonts.body.size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.black);
    
    const prefixWidth = doc.getTextWidth(prefix);
    doc.text(prefix, margins.left + indent, currentY);
    
    const remainingText = normalizeText(text);
    const lines = doc.splitTextToSize(remainingText, contentWidth - indent - prefixWidth);
    const lineHeight = fonts.body.size * fonts.body.lineHeight * 0.352778;
    
    let firstLine = true;
    for (const line of lines) {
      if (firstLine) {
        doc.text(line, margins.left + indent + prefixWidth, currentY);
        firstLine = false;
      } else {
        checkPageBreak(lineHeight + 1);
        doc.text(line, margins.left + indent + prefixWidth, currentY);
      }
      currentY += lineHeight;
    }
  };

  const addSignatureBlock = (): void => {
    checkPageBreak(80);
    currentY += 15;

    // Data e local
    doc.setFontSize(fonts.body.size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.black);

    const cidade = safeField(data.imovel.cidade, '_______________');
    const dataAssinatura = formatDateExtended(new Date().toISOString());
    doc.text(normalizeText(`${cidade}, ${dataAssinatura}.`), margins.left, currentY);
    currentY += 20;

    // Assinaturas das partes (duas colunas)
    const colWidth = (contentWidth - 20) / 2;
    const lineWidth = colWidth - 10;

    // LOCADOR
    doc.setDrawColor(...colors.black);
    doc.setLineWidth(0.3);
    doc.line(margins.left, currentY, margins.left + lineWidth, currentY);
    currentY += 4;
    
    doc.setFont('helvetica', 'bold');
    doc.text('LOCADOR', margins.left, currentY);
    currentY += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fonts.signature.size);
    doc.text(normalizeText(data.locador.nome.toUpperCase()), margins.left, currentY);
    currentY += 4;
    doc.text(`CPF: ${formatCPF(data.locador.cpf || '')}`, margins.left, currentY);

    // LOCATÁRIO (mesma linha que locador)
    const col2X = margins.left + colWidth + 20;
    currentY -= 12; // Volta para alinhar

    doc.line(col2X, currentY, col2X + lineWidth, currentY);
    currentY += 4;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fonts.body.size);
    doc.text('LOCATÁRIO', col2X, currentY);
    currentY += 4;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fonts.signature.size);
    doc.text(normalizeText(data.locatario.nome.toUpperCase()), col2X, currentY);
    currentY += 4;
    doc.text(`CPF: ${formatCPF(data.locatario.cpf || '')}`, col2X, currentY);

    currentY += 20;

    // Cônjuges (se aplicável)
    const hasConjugeLocador = data.conjugeLocador?.nome;
    const hasConjugeLocatario = data.conjugeLocatario?.nome;

    if (hasConjugeLocador || hasConjugeLocatario) {
      if (hasConjugeLocador) {
        doc.line(margins.left, currentY, margins.left + lineWidth, currentY);
        currentY += 4;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fonts.body.size);
        doc.text('CÔNJUGE DO LOCADOR', margins.left, currentY);
        currentY += 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fonts.signature.size);
        doc.text(normalizeText((data.conjugeLocador?.nome || '').toUpperCase()), margins.left, currentY);
        currentY += 4;
        doc.text(`CPF: ${formatCPF(data.conjugeLocador?.cpf || '')}`, margins.left, currentY);
      }

      if (hasConjugeLocatario) {
        if (hasConjugeLocador) currentY -= 12;
        
        doc.line(col2X, currentY, col2X + lineWidth, currentY);
        currentY += 4;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fonts.body.size);
        doc.text('CÔNJUGE DO LOCATÁRIO', col2X, currentY);
        currentY += 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fonts.signature.size);
        doc.text(normalizeText((data.conjugeLocatario?.nome || '').toUpperCase()), col2X, currentY);
        currentY += 4;
        doc.text(`CPF: ${formatCPF(data.conjugeLocatario?.cpf || '')}`, col2X, currentY);
      }
      currentY += 20;
    }

    // Fiador (se aplicável)
    if (data.contrato.garantia === 'fiador' && data.fiador?.nome) {
      doc.line(margins.left, currentY, margins.left + lineWidth, currentY);
      currentY += 4;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fonts.body.size);
      doc.text('FIADOR', margins.left, currentY);
      currentY += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fonts.signature.size);
      doc.text(normalizeText(data.fiador.nome.toUpperCase()), margins.left, currentY);
      currentY += 4;
      doc.text(`CPF: ${formatCPF(data.fiador.cpf || '')}`, margins.left, currentY);

      // Cônjuge do fiador
      if (data.conjugeFiador?.nome) {
        currentY -= 12;
        
        doc.line(col2X, currentY, col2X + lineWidth, currentY);
        currentY += 4;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fonts.body.size);
        doc.text('CÔNJUGE DO FIADOR', col2X, currentY);
        currentY += 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fonts.signature.size);
        doc.text(normalizeText(data.conjugeFiador.nome.toUpperCase()), col2X, currentY);
        currentY += 4;
        doc.text(`CPF: ${formatCPF(data.conjugeFiador.cpf || '')}`, col2X, currentY);
      }
      currentY += 20;
    }

    // Testemunhas
    checkPageBreak(30);
    currentY += 5;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fonts.body.size);
    doc.text('TESTEMUNHAS:', margins.left, currentY);
    currentY += 12;

    // Testemunha 1
    doc.line(margins.left, currentY, margins.left + lineWidth, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fonts.signature.size);
    doc.text('Nome: _______________________________________________', margins.left, currentY);
    currentY += 5;
    doc.text('CPF: ___.___.___-__', margins.left, currentY);

    // Testemunha 2 (mesma linha)
    currentY -= 9;
    doc.line(col2X, currentY, col2X + lineWidth, currentY);
    currentY += 4;
    doc.text('Nome: _______________________________________________', col2X, currentY);
    currentY += 5;
    doc.text('CPF: ___.___.___-__', col2X, currentY);
  };

  const addFooter = (pageNum: number, totalPages: number): void => {
    doc.setFontSize(fonts.footer.size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.gray);
    
    const footerY = pageHeight - 10;
    doc.text('SLOTIMOB | Lei Federal nº 8.245/91', margins.left, footerY);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margins.right, footerY, { align: 'right' });
  };

  // =========================================================================
  // INÍCIO DO DOCUMENTO
  // =========================================================================
  
  allPages.push(1);

  // TÍTULO PRINCIPAL
  doc.setFontSize(fonts.title.size);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.black);
  
  const tipoContrato = data.contrato.finalidade === 'residencial' 
    ? 'CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL' 
    : 'CONTRATO DE LOCAÇÃO DE IMÓVEL COMERCIAL';
  
  doc.text(tipoContrato, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  
  doc.setFontSize(fonts.body.size - 1);
  doc.setFont('helvetica', 'normal');
  doc.text('Regido pela Lei Federal nº 8.245/91', pageWidth / 2, currentY, { align: 'center' });
  currentY += 12;

  // =========================================================================
  // QUALIFICAÇÃO DAS PARTES
  // =========================================================================

  // LOCADOR
  let locadorQualificacao = `LOCADOR: **${pdfSafeText(data.locador.nome).toUpperCase()}**, ${safeField(data.locador.nacionalidade, '_______________')}, ${safeField(data.locador.estadoCivil, '_______________')}, ${safeField(data.locador.profissao, '_______________')}, portador(a) do RG nº ${formatRG(data.locador.rg || '')}, inscrito(a) no CPF sob o nº ${formatCPF(data.locador.cpf || '')}`;
  
  if (data.locador.endereco) {
    locadorQualificacao += `, residente e domiciliado(a) em ${data.locador.endereco}${data.locador.cidade ? `, ${data.locador.cidade}` : ''}${data.locador.estado ? `/${data.locador.estado}` : ''}${data.locador.cep ? `, CEP ${data.locador.cep}` : ''}`;
  }
  
  if (data.locador.email) {
    locadorQualificacao += `, e-mail: ${data.locador.email}`;
  }
  
  locadorQualificacao += '.';
  
  // Renderiza com negrito inline
  renderParagraphWithBold(doc, locadorQualificacao, margins.left, currentY, contentWidth, fonts.body.size, colors.black);
  currentY += calculateTextHeight(doc, locadorQualificacao, contentWidth, fonts.body.size) + 4;

  // LOCATÁRIO
  let locatarioQualificacao = `LOCATÁRIO: **${pdfSafeText(data.locatario.nome).toUpperCase()}**, ${safeField(data.locatario.nacionalidade, '_______________')}, ${safeField(data.locatario.estadoCivil, '_______________')}, ${safeField(data.locatario.profissao, '_______________')}, portador(a) do RG nº ${formatRG(data.locatario.rg || '')}, inscrito(a) no CPF sob o nº ${formatCPF(data.locatario.cpf || '')}`;
  
  if (data.locatario.endereco) {
    locatarioQualificacao += `, residente e domiciliado(a) em ${data.locatario.endereco}${data.locatario.cidade ? `, ${data.locatario.cidade}` : ''}${data.locatario.estado ? `/${data.locatario.estado}` : ''}${data.locatario.cep ? `, CEP ${data.locatario.cep}` : ''}`;
  }
  
  if (data.locatario.email) {
    locatarioQualificacao += `, e-mail: ${data.locatario.email}`;
  }
  
  locatarioQualificacao += '.';
  
  checkPageBreak(20);
  renderParagraphWithBold(doc, locatarioQualificacao, margins.left, currentY, contentWidth, fonts.body.size, colors.black);
  currentY += calculateTextHeight(doc, locatarioQualificacao, contentWidth, fonts.body.size) + 4;

  // FIADOR (se aplicável)
  if (data.contrato.garantia === 'fiador' && data.fiador?.nome) {
    let fiadorQualificacao = `FIADOR: **${pdfSafeText(data.fiador.nome).toUpperCase()}**, ${safeField(data.fiador.nacionalidade, '_______________')}, ${safeField(data.fiador.estadoCivil, '_______________')}, ${safeField(data.fiador.profissao, '_______________')}, portador(a) do RG nº ${formatRG(data.fiador.rg || '')}, inscrito(a) no CPF sob o nº ${formatCPF(data.fiador.cpf || '')}`;
    
    if (data.fiador.endereco) {
      fiadorQualificacao += `, residente e domiciliado(a) em ${data.fiador.endereco}${data.fiador.cidade ? `, ${data.fiador.cidade}` : ''}${data.fiador.estado ? `/${data.fiador.estado}` : ''}${data.fiador.cep ? `, CEP ${data.fiador.cep}` : ''}`;
    }
    
    fiadorQualificacao += '.';
    
    checkPageBreak(20);
    renderParagraphWithBold(doc, fiadorQualificacao, margins.left, currentY, contentWidth, fonts.body.size, colors.black);
    currentY += calculateTextHeight(doc, fiadorQualificacao, contentWidth, fonts.body.size) + 4;
  }

  currentY += 4;
  addParagraph('As partes acima qualificadas têm entre si, justo e contratado, o presente CONTRATO DE LOCAÇÃO, que se regerá pelas cláusulas e condições a seguir estipuladas, bem como pelas disposições da Lei Federal nº 8.245, de 18 de outubro de 1991:');
  currentY += 6;

  // =========================================================================
  // CLÁUSULAS
  // =========================================================================

  // CLÁUSULA PRIMEIRA - DO OBJETO
  addClauseHeader('PRIMEIRA', 'DO OBJETO');
  
  const enderecoCompleto = `${data.imovel.endereco}${data.imovel.numero ? `, nº ${data.imovel.numero}` : ''}${data.imovel.complemento ? `, ${data.imovel.complemento}` : ''}${data.imovel.bairro ? `, Bairro ${data.imovel.bairro}` : ''}, ${data.imovel.cidade}/${data.imovel.estado}${data.imovel.cep ? `, CEP ${data.imovel.cep}` : ''}`;
  
  addSubClause('1.1', `Este contrato tem por objeto a locação do imóvel ${data.contrato.finalidade === 'residencial' ? 'residencial' : 'comercial'} situado em ${enderecoCompleto}${data.imovel.matricula ? `, matrícula nº ${data.imovel.matricula}` : ''}${data.imovel.cib ? `, CIB nº ${data.imovel.cib}` : ''}.`);
  
  addSubClause('1.2', `O imóvel destina-se exclusivamente para fins ${data.contrato.finalidade === 'residencial' ? 'residenciais' : 'comerciais'}, sendo vedada qualquer outra destinação sem prévia autorização por escrito do LOCADOR.`);

  // CLÁUSULA SEGUNDA - DO PRAZO
  addClauseHeader('SEGUNDA', 'DO PRAZO');
  
  addSubClause('2.1', `O prazo de locação é de ${data.contrato.prazoMeses} (${numberToWords(data.contrato.prazoMeses)}) meses, iniciando-se em ${formatDate(data.contrato.dataInicio)}${data.contrato.dataFim ? ` e terminando em ${formatDate(data.contrato.dataFim)}` : ''}, independentemente de qualquer aviso, notificação ou interpelação judicial ou extrajudicial.`);
  
  addSubClause('2.2', 'Findo o prazo estipulado, se o LOCATÁRIO continuar na posse do imóvel, sem oposição do LOCADOR, a locação prorroga-se automaticamente por prazo indeterminado, nas mesmas condições ora contratadas, ressalvado o disposto no artigo 46 da Lei 8.245/91.');

  // CLÁUSULA TERCEIRA - DO ALUGUEL
  addClauseHeader('TERCEIRA', 'DO ALUGUEL E REAJUSTE');
  
  addSubClause('3.1', `O aluguel mensal é de ${formatCurrency(data.contrato.valorAluguel)} (${currencyToWords(data.contrato.valorAluguel)}), que deverá ser pago pelo LOCATÁRIO até o dia ${data.contrato.diaVencimento} (${numberToWords(data.contrato.diaVencimento)}) de cada mês.`);
  
  addSubClause('3.2', `O aluguel será reajustado anualmente, ou no menor prazo permitido por lei, com base na variação do índice ${data.contrato.indiceReajuste || 'IGP-M/FGV'}, ou outro índice que venha a substituí-lo, acumulado no período.`);
  
  addSubClause('3.3', 'Caso o índice pactuado seja extinto ou tenha sua aplicação vedada por lei, as partes adotarão outro índice oficial que reflita a variação do poder aquisitivo da moeda nacional.');

  // CLÁUSULA QUARTA - DO PAGAMENTO
  addClauseHeader('QUARTA', 'DA FORMA DE PAGAMENTO');
  
  if (data.pagamento?.pix) {
    addSubClause('4.1', `O pagamento do aluguel e demais encargos deverá ser efetuado via PIX para a chave: ${data.pagamento.pix}, em nome de ${safeField(data.pagamento.beneficiario, data.locador.nome)}.`);
  } else if (data.pagamento?.banco) {
    addSubClause('4.1', `O pagamento do aluguel e demais encargos deverá ser efetuado mediante depósito ou transferência bancária para: Banco ${data.pagamento.banco}, Agência ${safeField(data.pagamento.agencia)}, Conta ${safeField(data.pagamento.tipoConta, 'Corrente')} nº ${safeField(data.pagamento.conta)}, em nome de ${safeField(data.pagamento.beneficiario, data.locador.nome)}.`);
  } else {
    addSubClause('4.1', 'O pagamento do aluguel e demais encargos deverá ser efetuado em conta bancária a ser indicada pelo LOCADOR ou seu representante legal.');
  }
  
  addSubClause('4.2', 'O atraso no pagamento do aluguel e encargos implicará em:');
  addRomanItem('I', 'Multa de 10% (dez por cento) sobre o valor devido;');
  addRomanItem('II', 'Juros de mora de 1% (um por cento) ao mês, calculados pro rata die;');
  addRomanItem('III', 'Correção monetária pelo mesmo índice de reajuste do aluguel.');

  // CLÁUSULA QUINTA - DAS NOTIFICAÇÕES E COMUNICAÇÕES DIGITAIS
  addClauseHeader('QUINTA', 'DAS NOTIFICAÇÕES E COMUNICAÇÕES DIGITAIS');

  addSubClause('5.1', 'As partes convencionam que as comunicações relativas a avisos de vencimento, cobranças e notificações extrajudiciais poderão ser realizadas por meio eletrônico, incluindo correio eletrônico (e-mail) e mensagem instantânea via WhatsApp, para os dados de contato fornecidos pelo LOCATÁRIO no momento da celebração deste contrato.');

  if (data.billingContact?.email || data.billingContact?.whatsapp) {
    const contato = data.billingContact;
    addSubClause('5.2', `O LOCATÁRIO declara que os dados de contato fornecidos (${contato.name || 'nome não informado'}, e-mail: ${contato.email || 'não informado'}, WhatsApp: ${contato.whatsapp || 'não informado'}) são válidos e de sua responsabilidade, comprometendo-se a comunicar imediatamente qualquer alteração.`);
  } else {
    addSubClause('5.2', 'O LOCATÁRIO declara que os dados de contato fornecidos (e-mail e número de WhatsApp) são válidos e de sua responsabilidade, comprometendo-se a comunicar imediatamente qualquer alteração.');
  }

  addSubClause('5.3', 'As notificações enviadas aos dados cadastrados serão consideradas recebidas, para todos os efeitos legais, independentemente de confirmação de leitura, após o envio.');

  addSubClause('5.4', 'Este canal de comunicação não substitui a notificação judicial, quando esta for expressamente exigida por lei ou por cláusula contratual específica.');

  // CLÁUSULA SEXTA - DA GARANTIA
  addClauseHeader('SEXTA', 'DA GARANTIA LOCATÍCIA');

  const garantiaTexto = getGarantiaTexto(data);
  addSubClause('6.1', garantiaTexto);

  if (data.contrato.garantia === 'fiador') {
    addSubClause('6.2', 'O(s) FIADOR(es) responde(m) solidariamente por todas as obrigações do LOCATÁRIO, incluindo aluguel, encargos, multas, reparos, pinturas e quaisquer outras despesas ou indenizações devidas ao LOCADOR, permanecendo a fiança em vigor até a efetiva entrega das chaves e quitação integral de todas as obrigações.');

    addSubClause('6.3', 'A fiança permanece válida mesmo em caso de prorrogação da locação, seja por prazo determinado ou indeterminado, renunciando o(s) FIADOR(es) expressamente ao direito de exoneração previsto no art. 835 do Código Civil.');
  }

  // CLÁUSULA SEXTA - DAS OBRIGAÇÕES DO LOCADOR
  addClauseHeader('SEXTA', 'DAS OBRIGAÇÕES DO LOCADOR');
  
  addSubClause('6.1', 'Constituem obrigações do LOCADOR:');
  addRomanItem('I', 'Entregar o imóvel em estado de servir ao uso a que se destina;');
  addRomanItem('II', 'Garantir o uso pacífico do imóvel durante a locação;');
  addRomanItem('III', 'Manter a forma e o destino do bem locado;');
  addRomanItem('IV', 'Responder pelos vícios ou defeitos anteriores à locação;');
  addRomanItem('V', 'Fornecer recibo discriminado das importâncias pagas;');
  addRomanItem('VI', 'Pagar os impostos e taxas que incidam sobre o imóvel, salvo disposição expressa em contrário.');

  // CLÁUSULA SÉTIMA - DAS OBRIGAÇÕES DO LOCATÁRIO
  addClauseHeader('SÉTIMA', 'DAS OBRIGAÇÕES DO LOCATÁRIO');
  
  addSubClause('7.1', 'Constituem obrigações do LOCATÁRIO:');
  addRomanItem('I', 'Pagar pontualmente o aluguel e encargos da locação;');
  addRomanItem('II', 'Servir-se do imóvel para o uso convencionado, compatível com a natureza deste e com o fim a que se destina;');
  addRomanItem('III', 'Restituir o imóvel, ao final da locação, no estado em que o recebeu, salvo deteriorações decorrentes do uso normal;');
  addRomanItem('IV', 'Comunicar imediatamente ao LOCADOR qualquer dano ou defeito cuja reparação seja de responsabilidade deste;');
  addRomanItem('V', 'Realizar reparos de pequenos danos e manutenção ordinária do imóvel;');
  addRomanItem('VI', 'Não modificar a forma interna ou externa do imóvel sem autorização prévia e por escrito do LOCADOR;');
  addRomanItem('VII', 'Pagar as despesas de consumo (água, luz, gás, telefone, internet, etc.) e taxas condominiais ordinárias;');
  addRomanItem('VIII', 'Permitir a vistoria do imóvel pelo LOCADOR ou seu procurador, mediante prévio agendamento.');

  // CLÁUSULA OITAVA - DA RESCISÃO E MULTA
  addClauseHeader('OITAVA', 'DA RESCISÃO ANTECIPADA');
  
  addSubClause('8.1', 'Caso o LOCATÁRIO devolva o imóvel antes do término do prazo contratual, pagará multa compensatória equivalente a 3 (três) meses de aluguel, calculada proporcionalmente ao período de cumprimento do contrato, nos termos do art. 4º da Lei 8.245/91.');
  
  addSubClause('8.2', 'A multa será calculada da seguinte forma: valor da multa = (meses restantes / prazo total) × (3 × valor do aluguel vigente).');
  
  addSubClause('8.3', 'O LOCATÁRIO ficará dispensado da multa se a devolução decorrer de transferência de emprego para localidade diversa, desde que notifique o LOCADOR com antecedência mínima de 30 (trinta) dias, nos termos do art. 4º, parágrafo único, da Lei 8.245/91.');

  // CLÁUSULA NONA - DA VISTORIA E ENTREGA
  addClauseHeader('NONA', 'DA VISTORIA E ENTREGA');
  
  addSubClause('9.1', 'No início da locação, as partes realizarão vistoria detalhada do imóvel, formalizando o estado de conservação em laudo próprio, que fará parte integrante deste contrato.');
  
  addSubClause('9.2', 'Ao término da locação, o LOCATÁRIO deverá entregar o imóvel nas mesmas condições em que o recebeu, conforme laudo de vistoria inicial, procedendo às reparações necessárias, inclusive pintura, se houver alteração de cor ou danos às paredes.');
  
  addSubClause('9.3', 'As chaves somente serão consideradas entregues após vistoria final e aceitação do LOCADOR quanto ao estado do imóvel e quitação integral de todos os valores devidos.');

  // CLÁUSULA DÉCIMA - DA SUBLOCAÇÃO E CESSÃO
  addClauseHeader('DÉCIMA', 'DA SUBLOCAÇÃO E CESSÃO');
  
  addSubClause('10.1', 'É vedado ao LOCATÁRIO sublocar, ceder ou emprestar o imóvel, total ou parcialmente, sem prévia autorização por escrito do LOCADOR, sob pena de rescisão imediata do contrato e despejo.');

  // CLÁUSULA DÉCIMA PRIMEIRA - DAS BENFEITORIAS
  addClauseHeader('DÉCIMA PRIMEIRA', 'DAS BENFEITORIAS');
  
  addSubClause('11.1', 'As benfeitorias úteis e voluptuárias realizadas pelo LOCATÁRIO, ainda que autorizadas, não serão indenizáveis e ficarão incorporadas ao imóvel, salvo acordo em contrário firmado por escrito.');
  
  addSubClause('11.2', 'As benfeitorias necessárias, desde que autorizadas previamente pelo LOCADOR, serão indenizáveis, podendo o LOCATÁRIO exercer o direito de retenção.');

  // CLÁUSULA DÉCIMA SEGUNDA - DISPOSIÇÕES GERAIS
  addClauseHeader('DÉCIMA SEGUNDA', 'DAS DISPOSIÇÕES GERAIS');
  
  addSubClause('12.1', 'O LOCATÁRIO declara ter examinado o imóvel, achando-o em perfeitas condições de uso e habitabilidade, recebendo-o neste ato com todos os acessórios e pertences em pleno funcionamento.');
  
  addSubClause('12.2', 'Este contrato obriga as partes e seus herdeiros e sucessores a qualquer título.');
  
  addSubClause('12.3', 'A tolerância de uma parte para com a outra quanto ao cumprimento das obrigações aqui assumidas não implicará novação, renúncia ou modificação do pactuado.');
  
  addSubClause('12.4', `Para todas as questões decorrentes deste contrato, fica eleito o foro da Comarca de ${safeField(data.imovel.cidade, '_______________')}/${safeField(data.imovel.estado, '__')}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`);

  // CLÁUSULA DÉCIMA TERCEIRA - SEGURO INCÊNDIO
  addClauseHeader('DÉCIMA TERCEIRA', 'DO SEGURO CONTRA INCÊNDIO');
  addSubClause('13.1', `Em cumprimento ao art. 22, inciso VIII, da Lei nº 8.245/91, o LOCADOR contratará e manterá vigente, durante toda a locação, apólice de seguro contra incêndio e outros sinistros que possam destruir ou deteriorar o imóvel locado.`);
  addSubClause('13.2', `O LOCATÁRIO deverá zelar pelo imóvel de forma a não comprometer a vigência ou as condições da apólice de seguro, sendo-lhe vedado armazenar ou manusear materiais inflamáveis ou substâncias que aumentem o risco de sinistro.`);

  // CLÁUSULA DÉCIMA QUARTA - IPTU E ENCARGOS MUNICIPAIS
  addClauseHeader('DÉCIMA QUARTA', 'DO IPTU E ENCARGOS MUNICIPAIS');
  addSubClause('14.1', `O Imposto Predial e Territorial Urbano (IPTU) e demais taxas municipais incidentes sobre o imóvel serão de responsabilidade do LOCADOR, salvo disposição expressa em contrário firmada por escrito entre as partes.`);
  addSubClause('14.2', `As taxas de condomínio ordinárias são de responsabilidade do LOCATÁRIO. As taxas extraordinárias de condomínio, destinadas à realização de obras nas partes comuns e fachada, são de responsabilidade do LOCADOR.`);

  // CLÁUSULA DÉCIMA QUINTA - RENOVAÇÃO E REVISÃO
  addClauseHeader('DÉCIMA QUINTA', 'DA RENOVAÇÃO E REVISÃO DO CONTRATO');
  addSubClause('15.1', `Qualquer das partes poderá propor a renovação deste contrato mediante notificação por escrito com antecedência mínima de 30 (trinta) dias do término do prazo.`);
  addSubClause('15.2', `Na ausência de comunicação de não renovação, o contrato prorroga-se automaticamente por prazo indeterminado, nos termos do art. 46 da Lei 8.245/91, com todos os encargos e condições vigentes, sujeitos ao reajuste previsto na Cláusula Terceira.`);
  addSubClause('15.3', `O LOCATÁRIO poderá requerer revisão judicial do aluguel após 3 (três) anos de vigência do contrato ou de acordo da última revisão, conforme art. 68 da Lei 8.245/91.`);

  currentY += 8;
  addParagraph('E, por estarem assim justos e contratados, as partes firmam este instrumento em 2 (duas) vias de igual teor e forma, na presença de 2 (duas) testemunhas, para que produza seus jurídicos e legais efeitos.');

  // BLOCO DE ASSINATURAS
  addSignatureBlock();

  // =========================================================================
  // ADICIONA RODAPÉ EM TODAS AS PÁGINAS
  // =========================================================================
  
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // SALVA O DOCUMENTO
  const finalFileName = fileName || `Contrato_Locacao_${pdfSafeLabel(data.locatario.nome).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(finalFileName);
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function renderParagraphWithBold(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: [number, number, number]
): void {
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  let currentX = x;
  let currentY = y;
  const lineHeight = fontSize * 1.5 * 0.352778;

  for (const part of parts) {
    if (!part) continue;
    
    const isBold = part.startsWith('**') && part.endsWith('**');
    const cleanText = normalizeText(isBold ? part.slice(2, -2) : part);
    
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const words = cleanText.split(' ');
    for (const word of words) {
      const wordWidth = doc.getTextWidth(word + ' ');
      
      if (currentX + wordWidth > x + maxWidth) {
        currentY += lineHeight;
        currentX = x;
      }
      
      doc.text(word + ' ', currentX, currentY);
      currentX += wordWidth;
    }
  }
}

function calculateTextHeight(doc: jsPDF, text: string, maxWidth: number, fontSize: number): number {
  doc.setFontSize(fontSize);
  const cleanText = text.replace(/\*\*/g, '');
  const lines = doc.splitTextToSize(normalizeText(cleanText), maxWidth);
  const lineHeight = fontSize * 1.5 * 0.352778;
  return lines.length * lineHeight;
}

function getGarantiaTexto(data: LegalContractData): string {
  switch (data.contrato.garantia) {
    case 'fiador':
      return `Como garantia das obrigações assumidas neste contrato, o LOCATÁRIO apresenta como FIADOR(es) a(s) pessoa(s) qualificada(s) no preâmbulo deste instrumento, que assume(m) solidariamente a responsabilidade por todas as obrigações decorrentes desta locação.`;
    case 'caucao':
      return `Como garantia das obrigações assumidas neste contrato, o LOCATÁRIO efetua neste ato o depósito de caução no valor de ${formatCurrency(data.contrato.valorCaucao || 0)} (${currencyToWords(data.contrato.valorCaucao || 0)}), equivalente a 3 (três) meses de aluguel, que será devolvido ao término da locação, após quitação integral de todas as obrigações e vistoria final do imóvel.`;
    case 'seguro_fianca':
      return `Como garantia das obrigações assumidas neste contrato, o LOCATÁRIO apresenta apólice de seguro-fiança locatícia, cujo comprovante faz parte integrante deste instrumento.`;
    case 'titulo_capitalizacao':
      return `Como garantia das obrigações assumidas neste contrato, o LOCATÁRIO apresenta título de capitalização, cujo comprovante faz parte integrante deste instrumento.`;
    default:
      return `Este contrato é firmado sem garantia locatícia, ficando o LOCATÁRIO responsável por todas as obrigações dele decorrentes.`;
  }
}

function numberToWords(num: number): string {
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  
  if (num === 0) return 'zero';
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    return tens[ten] + (unit ? ' e ' + units[unit] : '');
  }
  return num.toString();
}

function currencyToWords(value: number): string {
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);
  
  let result = '';
  
  if (reais > 0) {
    result = numberToWords(reais) + (reais === 1 ? ' real' : ' reais');
  }
  
  if (centavos > 0) {
    result += (reais > 0 ? ' e ' : '') + numberToWords(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }
  
  return result || 'zero reais';
}

// Exportação para uso com contratos existentes
export const generateLegalContractFromLease = async (lease: any): Promise<void> => {
  const guarantorData = typeof lease.guarantor_data === 'string' 
    ? JSON.parse(lease.guarantor_data || '{}') 
    : (lease.guarantor_data || {});
  
  const paymentInfo = typeof lease.payment_info === 'string'
    ? JSON.parse(lease.payment_info || '{}')
    : (lease.payment_info || {});

  const data: LegalContractData = {
    locador: {
      nome: lease.owner?.name || lease.unit?.owner?.name || '_______________',
      cpf: lease.owner?.document_number || lease.unit?.owner?.document_number || '',
      email: lease.owner?.email || lease.unit?.owner?.email || '',
      telefone: lease.owner?.phone || lease.unit?.owner?.phone || '',
      endereco: lease.owner?.address || lease.unit?.owner?.address || '',
      cidade: lease.owner?.city || lease.unit?.owner?.city || '',
      estado: lease.owner?.state || lease.unit?.owner?.state || '',
    },
    locatario: {
      nome: lease.tenant?.name || '_______________',
      cpf: lease.tenant?.document_number || '',
      email: lease.tenant?.email || '',
      telefone: lease.tenant?.phone || '',
      endereco: lease.tenant?.address || '',
      cidade: lease.tenant?.city || '',
      estado: lease.tenant?.state || '',
      profissao: lease.tenant?.metadata?.profissao || '',
      nacionalidade: lease.tenant?.metadata?.nacionalidade || 'brasileiro(a)',
      estadoCivil: lease.tenant?.metadata?.estadoCivil || '',
      rg: lease.tenant?.metadata?.rg || '',
    },
    fiador: guarantorData.nome ? {
      nome: guarantorData.nome,
      cpf: guarantorData.cpf || '',
      rg: guarantorData.rg || '',
      endereco: guarantorData.endereco || '',
      cidade: guarantorData.cidade || '',
      estado: guarantorData.estado || '',
      profissao: guarantorData.profissao || '',
      nacionalidade: guarantorData.nacionalidade || 'brasileiro(a)',
      estadoCivil: guarantorData.estadoCivil || '',
    } : undefined,
    imovel: {
      endereco: lease.unit?.address || '_______________',
      bairro: lease.unit?.neighborhood || '',
      cidade: lease.unit?.city || '_______________',
      estado: lease.unit?.state || '__',
      cep: lease.unit?.postal_code || '',
      tipo: lease.unit?.property_type || 'Apartamento',
      cib: lease.cib || '',
    },
    contrato: {
      valorAluguel: lease.rent_amount || 0,
      diaVencimento: lease.due_day || 10,
      dataInicio: lease.start_date,
      dataFim: lease.end_date,
      prazoMeses: lease.end_date ? calculateMonthsDiff(lease.start_date, lease.end_date) : 30,
      indiceReajuste: lease.adjustment_index || 'IGP-M/FGV',
      garantia: (lease.guarantee_type as any) || 'nenhuma',
      valorCaucao: lease.deposit_amount,
      finalidade: 'residencial',
    },
    pagamento: paymentInfo.pix || paymentInfo.banco ? {
      pix: paymentInfo.pix,
      banco: paymentInfo.banco,
      agencia: paymentInfo.agencia,
      conta: paymentInfo.conta,
      tipoConta: paymentInfo.tipoConta,
      beneficiario: paymentInfo.beneficiario,
    } : undefined,
  };

  await generateLegalContractPDF(data);
};

function calculateMonthsDiff(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}
