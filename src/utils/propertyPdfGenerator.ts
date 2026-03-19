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
const SLOTI_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAaVSURBVHgB7Z1NbBtFFMf/M7uO7aSJSZqmH0mbpvQDqFQQlAoEBzhwQFRIXDhwQYIDF8SFK0dOnLhyAO5cuCABEoceOCBUCYmPIiG1rWhLU9ombVKnSRzH8e7sMLO7ThzH9tqOk93U8yutfE52Zue/82be7Bqg0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9HcnTDaBrBBK5j+EKw7AkQOgXAJYSRBxAXG/gFoFYg8CxJNArgMQu4DMT+COHINxPw7iHURoFMADYDIb1D1HY3cXvQnIYfBeQhJvgNkHYCw3wVht4CMCZDg76FykkM2ELEBQiMoL6dAcpfAubuAaQGcnIRIK00e4+4Hwu4C0yowgpuAgQCIeR8wDoGwHBi5CxD2GIi5D4zdA4z3gMlRcAYkOYvJI9eBKK+C0gC4wYGEDoLZH8PgCTC2BUZuBzgNoN4EMD8F0k9CYghMHoZgk6DGPWBsL4S5H2a4E4RGwXknyusSsMhxiPIKbG8v7NJhcPNOUOMwhHMP7NJBMPsArKgM5k4QiqU5eYFbGxDpuzD5HpTLgzDtR8DNvSDwMBJtQNkB2N5hhFcOIxzlgIKJCyBmN0p+CFw+DDPqh1X0Q1jd4OX9sMz7EeYBBPiuEFCEL4OQZQCOJC6A6v0ol/pQynpQTnog+G4UjT4wYxdE6SCE+wAu7IOPe1Hq6EFxswtL3d0odHUidvttKO3ciUI0hLLXjVJHN0qhbhRDnUhGHCj5O5EI+5HwuxC3fEjYHqQdH5KB7Sj6o0h6nMhGtqPk+BAPBZBM+JGz/EhaPqR4EGlhIWN7scKDqHibkSn6kfZ4keQ+pOBF1vGi7N2OZCiAjN8Pi3tR5gGkbR9SwQDSYR9SAQ+KPheKYQ/yoQDylg/54A4UfdsRK/TBjAbBzAAslwPbDmzfjiDtQNEOwPR6YXu8sDweOH4PgpYPxaAX6bAPxW0+xKMBZH3tsJJ+ZL2t2OJxoxzwwA4FUPJtR97bhmLADdvnRjzoR87jRjLmQ9G3HbbHhZLXi4LjRdHjRSzkR8HvRq7kQ87jRbYYRK7UR9Z2kOdl5DJlZDM20qE0UuUESm6KTNFJJI2k+DZJIGGESIJRpDIxpMop5JMZZNwYqo6HrLAQ50XExVZELBdxEETCcBHHdJFMuFBinFRJDGl/GMwOwUp1IBZuRzrcBivkRzrkQWibDym/G0nTRirqIfB4KH1uJB0XmRKHHWaICQaZ2khsMVJFPygchpUpgyX9KDObQYICYzlw8SSKog3ZmIPYNg9yvhBSETcSJMr8bRJ+kYjZiMeDSHvdKLICcn4XbM+7IDx0EQltQY4EkGFRpAwPoqYLSTuIPLOQlTbSdgmxnIPYNjfiPjditkCQ2QgXPNjmOohZCIQlwkwGN+wjYyPqEuzAwEoi4EGZc5S4RNjPsZUIYxusEpyQhUQ0iihnMMoc8YiD+HaKkAMUqIt8vEhwJJlh2JEAsqEA0l4fMl4faH0bMrYbFVJCybERDVGELYJM0EYi7EPScZAMO8jE3UgEfSTJdqTSfiTd25GDjZxXwLJcrC8FkeZJZMMllL0+pOwisn43Mp4AcsE2FD0+lIMBpCM+lBwhpL0hlG0v8raFon8b0okwclE3kpYXCd4Gy/YhY3tQsjtRDgeR9XuRNgNIWn6k/G4kqYdU0o9k0IdiMoRSMIxkxA0bJORxcpDxeVF2gyhbfhR4AFnfduTCAaRNP5K0HYnUDmQ9PiTdXqSIixQJIucNIOvxoRT0oujxIsWLKMCDrJCR9buR5F7EHQ+Sfhey3iCy8SDScT9SxIeEy4dCOIBspAPZQBCpuB9F60Mwr7wF0m9/AnL0GkjLKRDuI3aTFsLZfwHyNhD5KyjbCMr9YNxewOHPgeQGQGFNvokSKMhVQDrPgcwroMNnIcQHwNl50IHzKNO+s0DkFFjxNFj0JoruG6De16HUdBFy1MWvkOYfQNjHIbjmVdAPFwF8Dl6+E4wdAbNuAzHvBDV+DVJ6AbJ0OyD3g7kHUE69CS7/BGgeAWjT/oHN/xSk0QJGTgA0BsLGwcQEhHUOhPwGXD4NIv8ITu4GFy+BsUsgeAnc2gmw4yCsC5zsA9gkhHkcXJwDpxEwdglMPQvunAfzXIXw/g7E/QXYuQ6U/B+k/g8kp20E8UbZzgAAAABJRU5ErkJggg==';

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

/**
 * Unified PDF data interface for both standalone and property units
 */
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
  };
  parentProperty?: PropertyData | null;
  title: string;
  subtitle?: string;
  financingSimulation?: FinancingSimulation | null;
}

/**
 * Build PDF data from a unit that belongs to a property (development)
 */
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

/**
 * Build PDF data from a standalone property (no parent development)
 */
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

/**
 * Safe image addition to PDF with error handling
 */
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

/**
 * Load an image URL as a base64 data URL
 */
const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        console.warn('Failed to convert image to base64:', e);
        resolve(null);
      }
    };
    img.onerror = () => { resolve(null); };
    img.src = url;
  });
};

/**
 * Add branded footer to every page
 */
const addBrandedFooter = (doc: jsPDF, pageWidth: number, pageHeight: number, agent?: AgentInfo) => {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 10;

    // Divider line
    doc.setDrawColor(...GRAY_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

    // Logo
    safeAddImage(doc, SLOTI_LOGO_BASE64, 'PNG', 15, footerY - 3, 5, 5);

    // Brand text
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_MEDIUM);
    doc.setFont('helvetica', 'normal');
    doc.text('Documento gerado de forma segura via SlotiMob - O SaaS Imobiliário', 22, footerY);

    // Agent info (right side)
    if (agent?.name) {
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY_MEDIUM);
      const agentText = [agent.name, agent.email, agent.phone].filter(Boolean).join(' | ');
      doc.text(agentText, pageWidth - 15, footerY, { align: 'right' });
    }

    // Page number
    doc.setFontSize(6);
    doc.setTextColor(...GRAY_LIGHT);
    doc.text(`${i}/${totalPages}`, pageWidth / 2, footerY + 3, { align: 'center' });
  }
};

/**
 * Draw a feature highlight box with icon
 */
const drawFeatureBox = (
  doc: jsPDF, 
  x: number, 
  y: number, 
  width: number, 
  height: number,
  icon: string,
  value: string,
  label: string
) => {
  // Background
  doc.setFillColor(250, 250, 255);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  
  // Border
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, 3, 3, 'S');
  
  // Icon (using unicode)
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_BLUE);
  doc.text(icon, x + width / 2, y + 12, { align: 'center' });
  
  // Value
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY_DARK);
  doc.text(normalizeText(value), x + width / 2, y + 22, { align: 'center' });
  
  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_MEDIUM);
  doc.text(normalizeText(label), x + width / 2, y + 28, { align: 'center' });
};

/**
 * Calculate financing scenarios
 */
const calculateFinancingScenarios = (price: number, annualRate: number = 10.5, months: number = 360) => {
  const percentages = [20, 30, 40, 50];
  const monthlyRate = annualRate / 100 / 12;
  
  return percentages.map(percent => {
    const downPayment = price * (percent / 100);
    const financedAmount = price - downPayment;
    
    // Price table calculation
    const monthlyPayment = financedAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
      (Math.pow(1 + monthlyRate, months) - 1);
    
    // Recommended income (30% rule)
    const recommendedIncome = monthlyPayment / 0.3;
    
    return {
      percent,
      downPayment,
      financedAmount,
      monthlyPayment,
      recommendedIncome,
    };
  });
};

/**
 * Generate enhanced description with value-added adjectives
 */
const enhanceDescription = (description: string | null, unit: PDFAssetData['unit']): string => {
  if (description && description.length > 100) return description;
  
  const features: string[] = [];
  
  if (unit.suites && unit.suites >= 2) features.push('amplas suítes');
  if (unit.parking_spots && unit.parking_spots >= 2) features.push('vagas cobertas');
  if (unit.area && unit.area >= 100) features.push('área generosa');
  if (unit.furnished === 'sim') features.push('mobiliário de alto padrão');
  
  const baseText = description || 'Excelente imóvel';
  const enhancedParts = features.length > 0 
    ? ` com ${features.slice(0, 2).join(' e ')}.`
    : '.';
  
  return baseText + enhancedParts + ' Oportunidade única para investimento ou moradia.';
};

/**
 * PAGE 1: Hero Cover Page
 */
const addCoverPage = (doc: jsPDF, data: PDFAssetData, pageWidth: number, margin: number, agent?: AgentInfo, coverImageBase64?: string | null) => {
  const { unit, parentProperty, title } = data;
  let y = 0;
  
  // Header bar
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Logo
  safeAddImage(doc, SLOTI_LOGO_BASE64, 'PNG', margin, 8, 18, 18);
  
  // Brand text
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('SLOTIMOB', margin + 22, 20);

  // Agent name on header right
  if (agent?.name) {
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizeText(agent.name), pageWidth - margin, 16, { align: 'right' });
    if (agent.phone) {
      doc.setFontSize(8);
      doc.text(agent.phone, pageWidth - margin, 22, { align: 'right' });
    }
  } else {
    // "Oportunidade Exclusiva" badge
    doc.setFillColor(...BRAND_GREEN);
    doc.roundedRect(pageWidth - margin - 55, 10, 55, 15, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text('OPORTUNIDADE EXCLUSIVA', pageWidth - margin - 52, 19);
  }
  
  y = 45;
  
  // Main image area
  const imageHeight = 90;
  const imgWidth = pageWidth - margin * 2;
  
  if (coverImageBase64) {
    // Draw real image
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, y, imgWidth, imageHeight, 4, 4, 'F');
    safeAddImage(doc, coverImageBase64, 'JPEG', margin, y, imgWidth, imageHeight);
  } else {
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, y, imgWidth, imageHeight, 4, 4, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...GRAY_LIGHT);
    doc.text('Imagem não disponível', pageWidth / 2, y + imageHeight / 2, { align: 'center' });
  }
  
  y += imageHeight + 12;
  
  // Property type badge
  const propertyTypeLabel = unit.property_type 
    ? PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type 
    : '';
  if (propertyTypeLabel) {
    doc.setFillColor(...BRAND_GREEN);
    const badgeWidth = doc.getTextWidth(propertyTypeLabel.toUpperCase()) + 12;
    doc.roundedRect(margin, y, badgeWidth, 8, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(propertyTypeLabel.toUpperCase(), margin + 6, y + 5.5);
    y += 14;
  }
  
  // Title (large, modern)
  doc.setFontSize(22);
  doc.setTextColor(...BRAND_BLUE);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(normalizeText(title), pageWidth - margin * 2);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 4;
  
  // Location
  const locationParts = [unit.neighborhood, unit.city, unit.state].filter(Boolean);
  if (locationParts.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...GRAY_MEDIUM);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizeText(locationParts.join(' · ')), margin, y);
    y += 12;
  }
  
  // Price highlight
  if (unit.price) {
    doc.setFontSize(24);
    doc.setTextColor(...BRAND_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(unit.price), margin, y);
    y += 8;
    
    // Price per m²
    if (unit.area && unit.area > 0) {
      const pricePerM2 = unit.price / unit.area;
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_MEDIUM);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatCurrency(pricePerM2)}/m²`, margin, y);
    }
    y += 15;
  }
  
  // Feature highlights grid (4 boxes horizontal)
  const boxWidth = (pageWidth - margin * 2 - 15) / 4;
  const boxHeight = 35;
  const boxY = y;
  
  const features = [
    { icon: '⬜', value: unit.area ? `${unit.area}m²` : '-', label: 'Área' },
    { icon: '🛏', value: unit.bedrooms !== null ? `${unit.bedrooms}` : '-', label: 'Quartos' },
    { icon: '🚿', value: unit.suites !== null ? `${unit.suites}` : '-', label: 'Suítes' },
    { icon: '🚗', value: unit.parking_spots !== null ? `${unit.parking_spots}` : '-', label: 'Vagas' },
  ];
  
  features.forEach((feature, index) => {
    const boxX = margin + index * (boxWidth + 5);
    drawFeatureBox(doc, boxX, boxY, boxWidth, boxHeight, feature.icon, feature.value, feature.label);
  });
  
  return boxY + boxHeight + 10;
};

/**
 * PAGE 2: Details and Persuasion
 */
const addDetailsPage = (doc: jsPDF, data: PDFAssetData, pageWidth: number, pageHeight: number, margin: number) => {
  const { unit, parentProperty } = data;
  let y = 20;
  
  // Section: About the Property
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('SOBRE O IMÓVEL', margin + 5, y + 7);
  y += 18;
  
  // Enhanced description
  const enhancedDesc = enhanceDescription(unit.description, unit);
  doc.setFontSize(10);
  doc.setTextColor(...GRAY_DARK);
  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(normalizeText(enhancedDesc), pageWidth - margin * 2);
  doc.text(descLines, margin, y);
  y += descLines.length * 5 + 12;
  
  // Additional details grid
  const details: { label: string; value: string }[] = [];
  
  if (unit.furnished) details.push({ label: 'Mobília', value: FURNISHED_LABELS[unit.furnished] || unit.furnished });
  if (unit.solar_orientation) details.push({ label: 'Orientação Solar', value: unit.solar_orientation });
  if (unit.condition) details.push({ label: 'Condição', value: unit.condition });
  if (unit.condo_fee) details.push({ label: 'Condomínio', value: formatCurrency(unit.condo_fee) + '/mês' });
  if (unit.iptu) details.push({ label: 'IPTU', value: formatCurrency(unit.iptu) + '/ano' });
  
  if (details.length > 0) {
    const colWidth = (pageWidth - margin * 2) / 3;
    details.forEach((detail, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const detailX = margin + col * colWidth;
      const detailY = y + row * 12;
      
      doc.setFontSize(8);
      doc.setTextColor(...GRAY_MEDIUM);
      doc.text(detail.label, detailX, detailY);
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_DARK);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeText(detail.value), detailX, detailY + 5);
      doc.setFont('helvetica', 'normal');
    });
    y += Math.ceil(details.length / 3) * 12 + 15;
  }
  
  // Investment Matrix (only for sale)
  if (unit.price && unit.price > 0 && unit.is_financeable !== false) {
    doc.setFillColor(...BRAND_BLUE);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text('MATRIZ DE INVESTIMENTO', margin + 5, y + 7);
    y += 18;
    
    const scenarios = calculateFinancingScenarios(unit.price);
    
    autoTable(doc, {
      startY: y,
      head: [['Entrada (%)', 'Valor Entrada', 'Saldo Financiar', '1ª Parcela Est.', 'Renda Rec.']],
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
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: GRAY_DARK as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 255],
      },
      margin: { left: margin, right: margin },
    });
    
    y = (doc as any).lastAutoTable.finalY + 8;
    
    // Disclaimer
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_LIGHT);
    doc.text('* Simulação baseada em taxa de 10,5% a.a. e prazo de 360 meses. Sujeito à aprovação de crédito.', margin, y);
    y += 12;
  }
  
  // Rent package (for rental)
  if (unit.rent_price && unit.rent_price > 0) {
    const monthlyTotal = (unit.rent_price || 0) + (unit.condo_fee || 0) + ((unit.iptu || 0) / 12);
    
    doc.setFillColor(245, 250, 255);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 35, 4, 4, 'F');
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 35, 4, 4, 'S');
    
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_MEDIUM);
    doc.text('PACOTE MENSAL ESTIMADO', margin + 10, y + 12);
    
    doc.setFontSize(22);
    doc.setTextColor(...BRAND_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(monthlyTotal), margin + 10, y + 26);
    
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MEDIUM);
    doc.setFont('helvetica', 'normal');
    doc.text(`Aluguel ${formatCurrency(unit.rent_price)} + Cond. ${formatCurrency(unit.condo_fee)} + IPTU ${formatCurrency((unit.iptu || 0) / 12)}`, margin + 10, y + 32);
    
    y += 45;
  }
  
  // Parent property info (if unit belongs to a development)
  if (parentProperty && parentProperty.amenities && parentProperty.amenities.length > 0) {
    doc.setFillColor(...BRAND_BLUE);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text('INFRAESTRUTURA DO EMPREENDIMENTO', margin + 5, y + 7);
    y += 18;
    
    const amenityNames = parentProperty.amenities
      .map(id => AMENITIES_OPTIONS.find(a => a.id === id)?.label || id)
      .filter(Boolean);
    
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_DARK);
    doc.setFont('helvetica', 'normal');
    
    const colWidth = (pageWidth - margin * 2) / 3;
    amenityNames.forEach((name, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const amenityX = margin + col * colWidth;
      const amenityY = y + row * 6;
      
      if (amenityY < pageHeight - 50) {
        doc.text(`• ${normalizeText(name)}`, amenityX, amenityY);
      }
    });
  }
  
  return y;
};

/**
 * PAGE 3 / FOOTER: Call to Action
 */
const addClosingSection = (doc: jsPDF, pageWidth: number, pageHeight: number, margin: number) => {
  const y = pageHeight - 45;
  
  // CTA Box
  doc.setFillColor(...BRAND_GREEN);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 4, 4, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.text('Gostou? Agende sua visita agora mesmo!', pageWidth / 2, y + 10, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Entre em contato e garanta essa oportunidade única.', pageWidth / 2, y + 18, { align: 'center' });
};

/**
 * Main PDF Generator Function - Commercial Brochure Premium
 * Now async to support image loading
 */
export async function generatePropertyPDF(data: PDFAssetData, agent?: AgentInfo): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Load cover image asynchronously
  const imageUrl = data.unit.cover_image_url || data.parentProperty?.image_url || null;
  const coverImageBase64 = imageUrl ? await loadImageAsBase64(imageUrl) : null;
  
  // PAGE 1: Hero Cover
  addCoverPage(doc, data, pageWidth, margin, agent, coverImageBase64);
  
  // PAGE 2: Details
  doc.addPage();
  addDetailsPage(doc, data, pageWidth, pageHeight, margin);
  
  // CTA on last page
  addClosingSection(doc, pageWidth, pageHeight, margin);

  // Add branded footer to ALL pages
  addBrandedFooter(doc, pageWidth, pageHeight, agent);
  
  // Generate filename
  const safeName = data.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const filename = `Apresentacao_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  doc.save(filename);
}

// Legacy exports for compatibility
export { generatePropertyPDF as generatePremiumBrochure };
