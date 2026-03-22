import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AMENITIES_OPTIONS } from '@/components/properties/PropertyAmenitiesSelect';

// Brand colors
const BRAND_BLUE = [11, 0, 115] as const;
const BRAND_GREEN = [47, 201, 175] as const;
const GRAY_DARK = [40, 40, 40] as const;
const GRAY_MEDIUM = [100, 100, 100] as const;
const GRAY_LIGHT = [150, 150, 150] as const;
const WHITE = [255, 255, 255] as const;

// SLOTI Logo Base64
const SLOTI_LOGO_BASE64 = 'data:image/png;base64,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';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  terreno: 'Terreno',
  sala_comercial: 'Sala Comercial',
  loja: 'Loja',
  galpao: 'Galpão',
  rural: 'Rural',
  outros: 'Outros',
};

const FURNISHED_LABELS: Record<string, string> = {
  sim: 'Mobiliado',
  semimobiliado: 'Semimobiliado',
  nao: 'Sem mobília',
};

const CONSTRUCTION_STAGE_LABELS: Record<string, string> = {
  lancamento: 'Lançamento',
  em_obras: 'Em Obras',
  pronto: 'Pronto para Morar',
};

export interface AgentInfo {
  name: string;
  email?: string;
  phone?: string;
}

export interface FinancingSimulation {
  downPaymentPercent: number;
  downPayment: number;
  financedAmount: number;
  monthlyPayment: number;
  months: number;
  annualRate: number;
}

interface PropertyData {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  image_url?: string | null;
  builder_name?: string | null;
  construction_stage?: string | null;
  delivery_date?: string | null;
  total_land_area?: number | null;
  number_of_towers?: number | null;
  total_units_count?: number | null;
  amenities?: string[] | null;
  security_features?: string | null;
  sustainability_features?: string | null;
  technology_features?: string | null;
  gallery_images?: string[] | null;
}

export interface PDFAssetData {
  mode: 'property_unit' | 'standalone';
  unit: {
    id: string;
    unit_number: string;
    property_type: string | null;
    condition: string | null;
    price: number | null;
    rent_price: number | null;
    area: number | null;
    bedrooms: number | null;
    suites: number | null;
    bathrooms: number | null;
    parking_spots: number | null;
    condo_fee: number | null;
    iptu: number | null;
    furnished: string | null;
    solar_orientation: string | null;
    is_financeable: boolean | null;
    description: string | null;
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    cover_image_url: string | null;
    gallery?: string[] | null;
  };
  parentProperty?: PropertyData | null;
  title: string;
  subtitle?: string;
  financingSimulation?: FinancingSimulation | null;
  leadName?: string | null;
  introductionMessage?: string | null;
}

export function buildPDFDataFromUnit(unit: any, parentProperty: any): PDFAssetData {
  return {
    mode: 'property_unit',
    unit: {
      id: unit.id,
      unit_number: unit.unit_number,
      property_type: unit.property_type,
      condition: unit.condition,
      price: unit.price,
      rent_price: unit.rent_price,
      area: unit.area,
      bedrooms: unit.bedrooms,
      suites: unit.suites,
      bathrooms: unit.bathrooms,
      parking_spots: unit.parking_spots,
      condo_fee: unit.condo_fee,
      iptu: unit.iptu,
      furnished: unit.furnished,
      solar_orientation: unit.solar_orientation,
      is_financeable: unit.is_financeable,
      description: unit.description,
      address: unit.address || parentProperty?.address,
      neighborhood: unit.neighborhood,
      city: unit.city || parentProperty?.city,
      state: unit.state || parentProperty?.state,
      postal_code: unit.postal_code || parentProperty?.postal_code,
      cover_image_url: unit.cover_image_url,
      gallery: unit.gallery || [],
    },
    parentProperty: parentProperty ? {
      id: parentProperty.id,
      name: parentProperty.name,
      description: parentProperty.description,
      address: parentProperty.address,
      city: parentProperty.city,
      state: parentProperty.state,
      image_url: parentProperty.image_url,
      builder_name: parentProperty.builder_name,
      construction_stage: parentProperty.construction_stage,
      delivery_date: parentProperty.delivery_date,
      total_land_area: parentProperty.total_land_area,
      number_of_towers: parentProperty.number_of_towers,
      total_units_count: parentProperty.total_units_count,
      amenities: parentProperty.amenities,
      security_features: parentProperty.security_features,
      sustainability_features: parentProperty.sustainability_features,
      technology_features: parentProperty.technology_features,
      gallery_images: parentProperty.gallery_images,
    } : null,
    title: parentProperty?.name 
      ? `${parentProperty.name} - ${unit.unit_number}`
      : unit.unit_number,
    subtitle: parentProperty?.city && parentProperty?.state 
      ? `${parentProperty.city}/${parentProperty.state}`
      : undefined,
  };
}

export function buildPDFDataFromStandalone(unit: any): PDFAssetData {
  const propertyTypeLabel = unit.property_type 
    ? PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type 
    : 'Imóvel';
  
  const locationParts = [unit.neighborhood, unit.city].filter(Boolean);
  const location = locationParts.join(', ');

  return {
    mode: 'standalone',
    unit: {
      id: unit.id,
      unit_number: unit.unit_number,
      property_type: unit.property_type,
      condition: unit.condition,
      price: unit.price,
      rent_price: unit.rent_price,
      area: unit.area,
      bedrooms: unit.bedrooms,
      suites: unit.suites,
      bathrooms: unit.bathrooms,
      parking_spots: unit.parking_spots,
      condo_fee: unit.condo_fee,
      iptu: unit.iptu,
      furnished: unit.furnished,
      solar_orientation: unit.solar_orientation,
      is_financeable: unit.is_financeable,
      description: unit.description,
      address: unit.address,
      neighborhood: unit.neighborhood,
      city: unit.city,
      state: unit.state,
      postal_code: unit.postal_code,
      cover_image_url: unit.cover_image_url,
      gallery: unit.gallery || [],
    },
    parentProperty: null,
    title: location ? `${propertyTypeLabel} - ${location}` : unit.unit_number,
    subtitle: unit.address || undefined,
  };
}

const formatCurrency = (value: number | null | undefined): string => {
  if (!value) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
};

const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.normalize('NFC');
};

const safeAddImage = (
  doc: jsPDF, 
  imageData: string, 
  format: string, 
  x: number, 
  y: number, 
  width: number, 
  height: number
): boolean => {
  try {
    if (!imageData || typeof imageData !== 'string') return false;
    if (imageData.startsWith('data:image/')) {
      const base64Part = imageData.split(',')[1];
      if (!base64Part || base64Part.length < 100) return false;
    }
    doc.addImage(imageData, format, x, y, width, height);
    return true;
  } catch (error) {
    console.warn('Failed to add image to PDF:', error);
    return false;
  }
};

const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Limit resolution for memory
        const maxDim = 1200;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (e) {
        console.warn('Failed to convert image to base64:', e);
        resolve(null);
      }
    };
    img.onerror = () => { resolve(null); };
    img.src = url;
  });
};

const addBrandedFooter = (doc: jsPDF, pageWidth: number, pageHeight: number, agent?: AgentInfo) => {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 10;

    doc.setDrawColor(...GRAY_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

    safeAddImage(doc, SLOTI_LOGO_BASE64, 'PNG', 15, footerY - 3, 5, 5);

    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_MEDIUM);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento gerado de forma segura via SlotiMob - O SaaS Imobiliário', 22, footerY);

    if (agent?.name) {
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY_MEDIUM);
      const agentText = [agent.name, agent.email, agent.phone].filter(Boolean).join(' | ');
      doc.text(agentText, pageWidth - 15, footerY, { align: 'right' });
    }

    doc.setFontSize(6);
    doc.setTextColor(...GRAY_LIGHT);
    doc.text(`${i}/${totalPages}`, pageWidth / 2, footerY + 3, { align: 'center' });
  }
};

const drawFeatureBox = (
  doc: jsPDF, 
  x: number, 
  y: number, 
  width: number, 
  height: number,
  label: string,
  value: string,
  sublabel?: string
) => {
  // Background
  doc.setFillColor(247, 247, 252);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  
  // Left accent bar
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(x, y + 3, 2, height - 6, 'F');
  
  // Value (large, bold)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_BLUE);
  doc.text(normalizeText(value), x + width / 2, y + 14, { align: 'center' });
  
  // Label
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_MEDIUM);
  doc.text(normalizeText(label), x + width / 2, y + 21, { align: 'center' });

  if (sublabel) {
    doc.setFontSize(6);
    doc.text(normalizeText(sublabel), x + width / 2, y + 25, { align: 'center' });
  }
};

const calculateFinancingScenarios = (price: number, annualRate: number = 10.5, months: number = 360) => {
  const percentages = [20, 30, 40, 50];
  const monthlyRate = annualRate / 100 / 12;
  
  return percentages.map(percent => {
    const downPayment = price * (percent / 100);
    const financedAmount = price - downPayment;
    const monthlyPayment = financedAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
      (Math.pow(1 + monthlyRate, months) - 1);
    const recommendedIncome = monthlyPayment / 0.3;
    
    return { percent, downPayment, financedAmount, monthlyPayment, recommendedIncome };
  });
};

/**
 * PAGE 1: Full-bleed Cover
 */
const addCoverPage = (doc: jsPDF, data: PDFAssetData, pageWidth: number, pageHeight: number, margin: number, agent?: AgentInfo, coverImageBase64?: string | null) => {
  const { unit, title } = data;

  // Full-bleed cover image or gradient background
  if (coverImageBase64) {
    safeAddImage(doc, coverImageBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
    // Dark gradient overlay for text readability
    doc.setGState(new (doc as any).GState({ opacity: 0.65 }));
    doc.setFillColor(0, 0, 0);
    doc.rect(0, pageHeight * 0.45, pageWidth, pageHeight * 0.55, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } else {
    // Elegant gradient fallback
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.setFillColor(...BRAND_GREEN);
    doc.rect(0, pageHeight * 0.6, pageWidth, pageHeight * 0.4, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  }

  // Top bar with logo
  doc.setGState(new (doc as any).GState({ opacity: 0.85 }));
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  safeAddImage(doc, SLOTI_LOGO_BASE64, 'PNG', margin, 5, 16, 16);
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('SLOTIMOB', margin + 20, 16);

  // Agent info on header
  if (agent?.name) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizeText(agent.name), pageWidth - margin, 12, { align: 'right' });
    if (agent.phone) {
      doc.setFontSize(7);
      doc.text(agent.phone, pageWidth - margin, 18, { align: 'right' });
    }
  }

  // Content area - bottom half
  let y = pageHeight * 0.55;

  // Property type badge
  const propertyTypeLabel = unit.property_type 
    ? PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type 
    : '';
  if (propertyTypeLabel) {
    doc.setFillColor(...BRAND_GREEN);
    const badgeText = propertyTypeLabel.toUpperCase();
    doc.setFontSize(7);
    const badgeWidth = doc.getTextWidth(badgeText) + 12;
    doc.roundedRect(margin, y, badgeWidth, 8, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(badgeText, margin + 6, y + 5.5);
    y += 14;
  }

  // Title (big, white)
  doc.setFontSize(28);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(normalizeText(title), pageWidth - margin * 2);
  doc.text(titleLines.slice(0, 2), margin, y);
  y += titleLines.slice(0, 2).length * 10 + 4;

  // Location
  const locationParts = [unit.neighborhood, unit.city, unit.state].filter(Boolean);
  if (locationParts.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 210);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizeText(locationParts.join(' · ')), margin, y);
    y += 10;
  }

  // Lead name
  if (data.leadName) {
    y += 5;
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_GREEN);
    doc.setFont('helvetica', 'bold');
    doc.text(normalizeText(`Proposta exclusiva para ${data.leadName}`), margin, y);
    y += 12;
  }

  // Price
  if (unit.price) {
    doc.setFontSize(30);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(unit.price), margin, y);
    y += 8;
    if (unit.area && unit.area > 0) {
      doc.setFontSize(10);
      doc.setTextColor(180, 180, 195);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatCurrency(unit.price / unit.area)}/m²`, margin, y);
    }
    y += 14;
  } else if (unit.rent_price) {
    doc.setFontSize(26);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatCurrency(unit.rent_price)}/mês`, margin, y);
    y += 14;
  }

  // Feature pills at bottom
  const pillY = pageHeight - 30;
  const features: string[] = [];
  if (unit.area) features.push(`${unit.area}m²`);
  if (unit.bedrooms !== null && unit.bedrooms !== undefined) features.push(`${unit.bedrooms} Quartos`);
  if (unit.suites) features.push(`${unit.suites} Suítes`);
  if (unit.parking_spots) features.push(`${unit.parking_spots} Vagas`);

  let pillX = margin;
  features.forEach(feat => {
    doc.setFontSize(8);
    const fw = doc.getTextWidth(feat) + 10;
    doc.setFillColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
    doc.roundedRect(pillX, pillY, fw, 9, 4, 4, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(feat, pillX + 5, pillY + 6.5);
    pillX += fw + 4;
  });
};

/**
 * PAGE 2: Gallery Grid (up to 4 images)
 */
const addGalleryPage = (doc: jsPDF, galleryImages: (string | null)[], pageWidth: number, margin: number) => {
  let y = 15;

  // Section header
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('GALERIA DE FOTOS', margin + 5, y + 7);
  y += 16;

  const validImages = galleryImages.filter(Boolean) as string[];
  const gridW = (pageWidth - margin * 2 - 5) / 2;
  const gridH = 75;

  validImages.forEach((img, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const imgX = margin + col * (gridW + 5);
    const imgY = y + row * (gridH + 5);

    // Background placeholder
    doc.setFillColor(240, 240, 245);
    doc.roundedRect(imgX, imgY, gridW, gridH, 3, 3, 'F');
    safeAddImage(doc, img, 'JPEG', imgX, imgY, gridW, gridH);
  });
};

/**
 * PAGE 3: Details with feature boxes and investment matrix
 */
const addDetailsPage = (doc: jsPDF, data: PDFAssetData, pageWidth: number, pageHeight: number, margin: number) => {
  const { unit, parentProperty } = data;
  let y = 15;

  // Introduction message
  if (data.introductionMessage) {
    doc.setFillColor(245, 248, 255);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'S');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text('MENSAGEM DO CORRETOR', margin + 5, y + 7);
    y += 14;
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY_DARK);
    doc.setFont('helvetica', 'italic');
    const msgLines = doc.splitTextToSize(normalizeText(data.introductionMessage), pageWidth - margin * 2);
    doc.text(msgLines, margin, y);
    y += msgLines.length * 4.5 + 10;
    doc.setFont('helvetica', 'normal');
  }

  // Feature highlight boxes
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('CARACTERÍSTICAS DO IMÓVEL', margin + 5, y + 7);
  y += 16;

  const boxWidth = (pageWidth - margin * 2 - 15) / 4;
  const boxHeight = 28;
  const featureBoxes = [
    { label: 'Área', value: unit.area ? `${unit.area}m²` : '-' },
    { label: 'Quartos', value: unit.bedrooms !== null ? `${unit.bedrooms}` : '-' },
    { label: 'Suítes', value: unit.suites !== null ? `${unit.suites}` : '-' },
    { label: 'Vagas', value: unit.parking_spots !== null ? `${unit.parking_spots}` : '-' },
  ];
  featureBoxes.forEach((f, i) => {
    drawFeatureBox(doc, margin + i * (boxWidth + 5), y, boxWidth, boxHeight, f.label, f.value);
  });
  y += boxHeight + 8;

  // Additional detail badges
  const detailBadges: { label: string; value: string }[] = [];
  if (unit.furnished) detailBadges.push({ label: 'Mobília', value: FURNISHED_LABELS[unit.furnished] || unit.furnished });
  if (unit.solar_orientation) detailBadges.push({ label: 'Orientação Solar', value: unit.solar_orientation });
  if (unit.condition) detailBadges.push({ label: 'Condição', value: unit.condition });
  if (unit.is_financeable) detailBadges.push({ label: 'Financiável', value: 'Sim' });

  if (detailBadges.length > 0) {
    const badgeColW = (pageWidth - margin * 2) / 4;
    detailBadges.forEach((badge, i) => {
      const bx = margin + (i % 4) * badgeColW;
      const by = y + Math.floor(i / 4) * 14;
      doc.setFontSize(7);
      doc.setTextColor(...GRAY_MEDIUM);
      doc.text(badge.label.toUpperCase(), bx, by);
      doc.setFontSize(9.5);
      doc.setTextColor(...GRAY_DARK);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText(badge.value), bx, by + 5);
      doc.setFont('helvetica', 'normal');
    });
    y += Math.ceil(detailBadges.length / 4) * 14 + 8;
  }

  // Description
  if (unit.description) {
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY_DARK);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(normalizeText(unit.description), pageWidth - margin * 2);
    doc.text(descLines.slice(0, 8), margin, y);
    y += Math.min(descLines.length, 8) * 4.5 + 10;
  }

  // Financial section: IPTU/Condomínio
  if (unit.condo_fee || unit.iptu) {
    doc.setFillColor(247, 250, 255);
    const finBoxH = 22;
    doc.roundedRect(margin, y, pageWidth - margin * 2, finBoxH, 3, 3, 'F');
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageWidth - margin * 2, finBoxH, 3, 3, 'S');

    let fx = margin + 10;
    if (unit.condo_fee) {
      doc.setFontSize(7);
      doc.setTextColor(...GRAY_MEDIUM);
      doc.text('CONDOMÍNIO', fx, y + 8);
      doc.setFontSize(12);
      doc.setTextColor(...BRAND_BLUE);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(unit.condo_fee) + '/mês', fx, y + 16);
      doc.setFont('helvetica', 'normal');
      fx += 65;
    }
    if (unit.iptu) {
      doc.setFontSize(7);
      doc.setTextColor(...GRAY_MEDIUM);
      doc.text('IPTU', fx, y + 8);
      doc.setFontSize(12);
      doc.setTextColor(...BRAND_BLUE);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(unit.iptu) + '/ano', fx, y + 16);
      doc.setFont('helvetica', 'normal');
    }
    y += finBoxH + 10;
  }

  // Investment Matrix
  if (unit.price && unit.price > 0 && unit.is_financeable !== false) {
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(...BRAND_BLUE);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text('MATRIZ DE INVESTIMENTO', margin + 5, y + 7);
    y += 16;
    
    const scenarios = calculateFinancingScenarios(unit.price);
    
    autoTable(doc, {
      startY: y,
      head: [['Entrada', 'Valor Entrada', 'Financiar', '1ª Parcela', 'Renda Min.']],
      body: scenarios.map(s => [
        `${s.percent}%`,
        formatCurrency(s.downPayment),
        formatCurrency(s.financedAmount),
        formatCurrency(s.monthlyPayment),
        formatCurrency(s.recommendedIncome),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: BRAND_BLUE as [number, number, number],
        textColor: WHITE as [number, number, number],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: GRAY_DARK as [number, number, number],
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [247, 247, 252] },
      margin: { left: margin, right: margin },
    });
    
    y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_LIGHT);
    doc.text('* Simulação baseada em taxa de 10,5% a.a. / 360 meses. Sujeito à aprovação de crédito.', margin, y);
    y += 10;
  }

  // Rent summary
  if (unit.rent_price && unit.rent_price > 0) {
    const monthlyTotal = (unit.rent_price || 0) + (unit.condo_fee || 0) + ((unit.iptu || 0) / 12);
    doc.setFillColor(245, 250, 255);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 4, 4, 'F');
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 4, 4, 'S');
    
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_MEDIUM);
    doc.text('PACOTE MENSAL ESTIMADO', margin + 10, y + 10);
    doc.setFontSize(20);
    doc.setTextColor(...BRAND_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(monthlyTotal), margin + 10, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_MEDIUM);
    doc.text(`Aluguel ${formatCurrency(unit.rent_price)} + Cond. ${formatCurrency(unit.condo_fee)} + IPTU ${formatCurrency((unit.iptu || 0) / 12)}`, margin + 10, y + 27);
    y += 38;
  }
  
  // Amenities
  if (parentProperty?.amenities && parentProperty.amenities.length > 0) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 15;
    }
    doc.setFillColor(...BRAND_BLUE);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text('INFRAESTRUTURA DO EMPREENDIMENTO', margin + 5, y + 7);
    y += 16;
    
    const amenityNames = parentProperty.amenities
      .map(id => AMENITIES_OPTIONS.find(a => a.id === id)?.label || id)
      .filter(Boolean);
    
    const colWidth = (pageWidth - margin * 2) / 3;
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_DARK);
    doc.setFont('helvetica', 'normal');
    amenityNames.forEach((name, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const ax = margin + col * colWidth;
      const ay = y + row * 6;
      if (ay < pageHeight - 30) {
        doc.text(`• ${normalizeText(name)}`, ax, ay);
      }
    });
  }
};

/**
 * CTA closing section
 */
const addClosingSection = (doc: jsPDF, pageWidth: number, pageHeight: number, margin: number) => {
  const y = pageHeight - 40;
  doc.setFillColor(...BRAND_GREEN);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 4, 4, 'F');
  
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('Gostou? Agende sua visita agora mesmo!', pageWidth / 2, y + 9, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Entre em contato e garanta essa oportunidade única.', pageWidth / 2, y + 16, { align: 'center' });
};

/**
 * Main PDF Generator - Premium Commercial Brochure
 * Returns the PDF blob for upload, and optionally triggers download
 */
export async function generatePropertyPDF(
  data: PDFAssetData, 
  agent?: AgentInfo,
  options?: { returnBlob?: boolean }
): Promise<Blob | void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Load cover image
  const imageUrl = data.unit.cover_image_url || data.parentProperty?.image_url || null;
  const coverImageBase64 = imageUrl ? await loadImageAsBase64(imageUrl) : null;

  // Collect gallery images (limit to 4)
  const galleryUrls: string[] = [];
  if (data.unit.gallery && data.unit.gallery.length > 0) {
    galleryUrls.push(...data.unit.gallery.slice(0, 4));
  } else if (data.parentProperty?.gallery_images && data.parentProperty.gallery_images.length > 0) {
    galleryUrls.push(...data.parentProperty.gallery_images.slice(0, 4));
  }

  // Load gallery images in parallel (max 4)
  const galleryBase64 = await Promise.all(
    galleryUrls.map(url => loadImageAsBase64(url))
  );
  const validGallery = galleryBase64.filter(Boolean);
  
  // PAGE 1: Full-bleed Cover
  addCoverPage(doc, data, pageWidth, pageHeight, margin, agent, coverImageBase64);
  
  // PAGE 2: Gallery (only if we have gallery images)
  if (validGallery.length > 0) {
    doc.addPage();
    addGalleryPage(doc, validGallery, pageWidth, margin);
  }

  // PAGE 3: Details + Investment
  doc.addPage();
  addDetailsPage(doc, data, pageWidth, pageHeight, margin);
  
  // CTA on last page
  addClosingSection(doc, pageWidth, pageHeight, margin);

  // Branded footer on all pages
  addBrandedFooter(doc, pageWidth, pageHeight, agent);
  
  const safeName = data.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const filename = `Proposta_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;

  if (options?.returnBlob) {
    return doc.output('blob');
  }
  
  doc.save(filename);
}

// Legacy exports
export { generatePropertyPDF as generatePremiumBrochure };
