import jsPDF from 'jspdf';
import { AMENITIES_OPTIONS } from '@/components/properties/PropertyAmenitiesSelect';

// Brand colors
const BRAND = [11, 0, 115] as const;
const ACCENT = [47, 201, 175] as const;
const DARK = [30, 30, 35] as const;
const MID = [100, 100, 110] as const;
const LIGHT = [160, 160, 170] as const;
const WHITE = [255, 255, 255] as const;

// SLOTI Logo Base64
const SLOTI_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAaVSURBVHgB7Z1NbBtFFMf/M7uO7aSJSZqmH0mbpvQDqFQQlAoEBzhwQFRIXDhwQYIDF8SFK0dOnLhyAO5cuCABEoceOCBUCYmPIiG1rWhLU9ombVKnSRzH8e7sMLO7ThzH9tqOk93U8yutfE52Zue/82be7Bqg0Wg0Go1Go9FoNBqNRqPRaDQajUaj0Wg0Go1Go9HcnTDaBrBBK5j+EKw7AkQOgXAJYSRBxAXG/gFoFYg8CxJNArgMQu4DMT+COHINxPw7iHURoFMADYDIb1D1HY3cXvQnIYfBeQhJvgNkHYCw3wVht4CMCZDg76FykkM2ELEBQiMoL6dAcpfAubuAaQGcnIRIK00e4+4Hwu4C0yowgpuAgQCIeR8wDoGwHBi5CxD2GIi5D4zdA4z3gMlRcAYkOYvJI9eBKK+C0gC4wYGEDoLZH8PgCTA2BUZuBzgNoN4EMD8F0k9CYghMHoZgk6DGPWBsL4S5H2a4E4RGwXknyusSsMhxiPIKbG8v7NJhcPNOUOMwhHMP7NJBMPsArKgM5k4QiqU5eYFbGxDpuzD5HpTLgzDtR8DNvSDwMBJtQNkB2N5hhFcOIxzlgIKJCyBmN0p+CFw+DDPqh1X0Q1jd4OX9sMz7EeYBBPiuEFCEL4OQZQCOJC6A6v0ol/pQynpQTnog+G4UjT4wYxdE6SCE+wAu7IOPe1Hq6EFxswtL3d0odHUidvttKO3ciUI0hLLXjVJHN0qhbhRDnUhGHCj5O5EI+5HwuxC3fEjYHqQdH5KB7Sj6o0h6nMhGtqPk+BAPBZBM+JGz/EhaPqR4EGlhIWN7scKDqHibkSn6kfZ4keQ+pOBF1vGi7N2OZCiAjN8Pi3tR5gGkbR9SAQ+KIQ/yoQDSlg/54A4UfdsRK/TBjAbBzAAslwPbDmzfjiDtQNEOwPR6YXu8sDweOH4PgpYPxaAX6bAPxKMBZH3tsJJ+ZL2t2OJxoxzwwA4FUPJtR97bhmLADdvnRjzoR87jRjLmQ9G3HbbHhZLXi4LjRdHjRSzkR8HvRq7kQ87jRbYYRK7UR9Z2kOdl5DJlZDM20qE0UuUESm6KTNFJJI2k+DZJIGGESIJRpDIxpMop5JMZZNwYqo6HrLAQ50XExVZELBdxEETCcBHHdJFMuFBinFRJDGl/GMwOwUp1IBZuRzrcBivkRzrkQWibDym/G0nTRirqIfB4KH1uJB0XmRKHHWaICQaZ2khsMVJFPygchpUpgyX9KDObQYICYzlw8SSKog3ZmIPYNg9yvhBSETcSJMr8bRJ+kYjZiMeDSHvdKLICcn4XbM+7IDx0EQltQY4EkGFRpAwPoqYLSTuIPLOQlTbSdgmxnIPYNjdiPjditkCQ2QgXPNjmOohZCIQlwkwGN+wjYyPqEuzAwEoi4EGZc5S4RNjPsZUIYxusEpyQhUQ0iihnMMoc8YiD+HaKkAMUqIt8vEhwJJlh2JEAsqEA0l4fMl4faH0bMrYbFVJCybERDVGELYJM0EYi7EPScZAMO8jE3UgEfSTJdqTSfiTd25GDjZxXwLJcrC8FkeZJZMMllL0+pOwisn43Mp4AcsE2FD0+lIMBpCM+lBwhpL0hlG0v8raFon8b0okwclE3kpYXCd4Gy/YhY3tQsjtRDgeR9XuRNgNIWn6k/G4kqYdU0o9k0IdiMoRSMIxkxA0bJORxcpDxeVF2gyhbfhR4AFnfduTCAaRNP5K0HYnUDmQ9PiTdXqSIixQJIucNIOvxIsWLKMCDrJCR9buR5F7EHQ+Sfhey3iCy8SDScT9SxIeEy4dCOIBspAPZQBCpuB9F60Mwr7wF0m9/AnL0GkjLKRDuI3aTFsLZfwHyNhD5KyjbCMr9YNxewOHPgeQGQGFNvokSKMhVQDrPgcwroMNnIcQHwNl50IHzKNO+s0DkFFjxNFj0JoruG6De16HUdBFy1MWvkOYfQNjHIbjmVdAPFwF8Dl6+E4wdAbNuAzHvBDV+DVJ6AbJ0OyD3g7kHUE69CS7/BGgeAWjT/oHN/xSk0QJGTgA0BsLGwcQEhHUOhPwGXD4NIv8ITu4GFy+BsUsgeAnc2gmw4yCsC5zsA9gkhHkcXJwDpxEwdglMPQvunAfzXIXw/g7E/QXYuQ6U/B+k/g8kp20E8UbZzgAAAABJRU5ErkJggg==';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', terreno: 'Terreno',
  sala_comercial: 'Sala Comercial', loja: 'Loja', galpao: 'Galpão',
  rural: 'Rural', outros: 'Outros',
};

const FURNISHED_LABELS: Record<string, string> = {
  sim: 'Mobiliado', semimobiliado: 'Semimobiliado', nao: 'Sem mobília',
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

// ─── Helpers ───────────────────────────────────────────────

export function buildPDFDataFromUnit(unit: any, parentProperty: any): PDFAssetData {
  return {
    mode: 'property_unit',
    unit: {
      id: unit.id, unit_number: unit.unit_number, property_type: unit.property_type,
      condition: unit.condition, price: unit.price, rent_price: unit.rent_price,
      area: unit.area, bedrooms: unit.bedrooms, suites: unit.suites,
      bathrooms: unit.bathrooms, parking_spots: unit.parking_spots,
      condo_fee: unit.condo_fee, iptu: unit.iptu, furnished: unit.furnished,
      solar_orientation: unit.solar_orientation, is_financeable: unit.is_financeable,
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
      id: parentProperty.id, name: parentProperty.name,
      description: parentProperty.description, address: parentProperty.address,
      city: parentProperty.city, state: parentProperty.state,
      image_url: parentProperty.image_url, builder_name: parentProperty.builder_name,
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
  const typeLabel = unit.property_type
    ? PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type
    : 'Imóvel';
  const loc = [unit.neighborhood, unit.city].filter(Boolean).join(', ');
  return {
    mode: 'standalone',
    unit: {
      id: unit.id, unit_number: unit.unit_number, property_type: unit.property_type,
      condition: unit.condition, price: unit.price, rent_price: unit.rent_price,
      area: unit.area, bedrooms: unit.bedrooms, suites: unit.suites,
      bathrooms: unit.bathrooms, parking_spots: unit.parking_spots,
      condo_fee: unit.condo_fee, iptu: unit.iptu, furnished: unit.furnished,
      solar_orientation: unit.solar_orientation, is_financeable: unit.is_financeable,
      description: unit.description, address: unit.address,
      neighborhood: unit.neighborhood, city: unit.city, state: unit.state,
      postal_code: unit.postal_code, cover_image_url: unit.cover_image_url,
      gallery: unit.gallery || [],
    },
    parentProperty: null,
    title: loc ? `${typeLabel} - ${loc}` : unit.unit_number,
    subtitle: unit.address || undefined,
  };
}

const fmt = (v: number | null | undefined): string => {
  if (!v) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
};

const norm = (t: string): string => (t || '').normalize('NFC');

const loadImage = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const max = 1200;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

const safeImg = (doc: jsPDF, data: string, x: number, y: number, w: number, h: number): boolean => {
  try {
    if (!data || typeof data !== 'string') return false;
    doc.addImage(data, 'JPEG', x, y, w, h);
    return true;
  } catch { return false; }
};

// ─── Cover Page ────────────────────────────────────────────

function renderCover(doc: jsPDF, data: PDFAssetData, pw: number, ph: number, m: number, agent?: AgentInfo, coverImg?: string | null) {
  const { unit, title } = data;

  if (coverImg) {
    // Full-bleed cover image with aspect-ratio-aware crop
    safeImg(doc, coverImg, 0, 0, pw, ph);
    // Bottom gradient overlay
    const gradH = ph * 0.5;
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const opacity = (i / steps) * 0.78;
      doc.setGState(new (doc as any).GState({ opacity }));
      doc.setFillColor(0, 0, 0);
      const sy = ph - gradH + (gradH / steps) * i;
      doc.rect(0, sy, pw, gradH / steps + 1, 'F');
    }
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } else {
    // Gradient fallback
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, pw, ph, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.setFillColor(...ACCENT);
    doc.rect(0, ph * 0.6, pw, ph * 0.4, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  }

  // Top bar
  doc.setGState(new (doc as any).GState({ opacity: 0.75 }));
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pw, 26, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  safeImg(doc, SLOTI_LOGO_BASE64, m, 4, 14, 14);
  doc.setFontSize(13); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
  doc.text('SLOTIMOB', m + 18, 14);

  if (agent?.name) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text(norm(agent.name), pw - m, 10, { align: 'right' });
    if (agent.phone) { doc.setFontSize(7); doc.text(agent.phone, pw - m, 16, { align: 'right' }); }
  }

  // Content at bottom
  let y = ph * 0.56;

  // Type badge
  const typeLabel = unit.property_type ? PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type : '';
  if (typeLabel) {
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    const bw = doc.getTextWidth(typeLabel.toUpperCase()) + 12;
    doc.setFillColor(...ACCENT);
    doc.roundedRect(m, y, bw, 7.5, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.text(typeLabel.toUpperCase(), m + 6, y + 5.2);
    y += 13;
  }

  // Title
  doc.setFontSize(26); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
  const tLines = doc.splitTextToSize(norm(title), pw - m * 2);
  doc.text(tLines.slice(0, 2), m, y);
  y += tLines.slice(0, 2).length * 9.5 + 4;

  // Location
  const loc = [unit.neighborhood, unit.city, unit.state].filter(Boolean);
  if (loc.length) {
    doc.setFontSize(10); doc.setTextColor(200, 200, 210); doc.setFont('helvetica', 'normal');
    doc.text(norm(loc.join(' · ')), m, y); y += 9;
  }

  // Lead
  if (data.leadName) {
    y += 3;
    doc.setFontSize(10); doc.setTextColor(...ACCENT); doc.setFont('helvetica', 'bold');
    doc.text(norm(`Proposta exclusiva para ${data.leadName}`), m, y); y += 11;
  }

  // Price
  if (unit.price) {
    doc.setFontSize(28); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
    doc.text(fmt(unit.price), m, y); y += 7;
    if (unit.area && unit.area > 0) {
      doc.setFontSize(9); doc.setTextColor(180, 180, 195); doc.setFont('helvetica', 'normal');
      doc.text(`${fmt(unit.price / unit.area)}/m²`, m, y);
    }
    y += 12;
  } else if (unit.rent_price) {
    doc.setFontSize(24); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
    doc.text(`${fmt(unit.rent_price)}/mês`, m, y); y += 12;
  }

  // Feature pills at bottom
  const pillY = ph - 28;
  const feats: string[] = [];
  if (unit.area) feats.push(`${unit.area}m²`);
  if (unit.bedrooms != null) feats.push(`${unit.bedrooms} Quartos`);
  if (unit.suites) feats.push(`${unit.suites} Suítes`);
  if (unit.parking_spots) feats.push(`${unit.parking_spots} Vagas`);

  let px = m;
  feats.forEach(f => {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    const fw = doc.getTextWidth(f) + 10;
    doc.setFillColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
    doc.roundedRect(px, pillY, fw, 9, 4, 4, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    doc.setTextColor(...WHITE);
    doc.text(f, px + 5, pillY + 6.5);
    px += fw + 4;
  });
}

// ─── Gallery Page ──────────────────────────────────────────

function renderGallery(doc: jsPDF, imgs: (string | null)[], pw: number, ph: number, m: number) {
  let y = 18;
  // Header
  doc.setFillColor(...BRAND);
  doc.roundedRect(m, y, pw - m * 2, 9, 2, 2, 'F');
  doc.setFontSize(9.5); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
  doc.text('GALERIA DE FOTOS', m + 5, y + 6.5);
  y += 14;

  const valid = imgs.filter(Boolean) as string[];
  if (valid.length === 0) return;

  const gapX = 4, gapY = 4;
  const cols = 2;
  const colW = (pw - m * 2 - gapX) / cols;
  const rowH = 70;

  valid.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ix = m + col * (colW + gapX);
    const iy = y + row * (rowH + gapY);
    if (iy + rowH > ph - 20) return; // don't overflow
    doc.setFillColor(235, 235, 240);
    doc.roundedRect(ix, iy, colW, rowH, 3, 3, 'F');
    safeImg(doc, img, ix, iy, colW, rowH);
  });
}

// ─── Details + Specs Page ──────────────────────────────────

function renderDetails(doc: jsPDF, data: PDFAssetData, pw: number, ph: number, m: number) {
  const { unit, parentProperty } = data;
  let y = 18;

  // Intro message
  if (data.introductionMessage) {
    doc.setFillColor(245, 248, 255);
    const msgLines = doc.splitTextToSize(norm(data.introductionMessage), pw - m * 2 - 10);
    const blockH = Math.min(msgLines.length * 4.5 + 14, 80);
    doc.roundedRect(m, y, pw - m * 2, blockH, 3, 3, 'F');
    doc.setFillColor(...BRAND);
    doc.rect(m, y, 2.5, blockH, 'F'); // left accent

    doc.setFontSize(8); doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold');
    doc.text('MENSAGEM DO CORRETOR', m + 8, y + 8);
    doc.setFontSize(8.5); doc.setTextColor(...DARK); doc.setFont('helvetica', 'italic');
    doc.text(msgLines.slice(0, 14), m + 8, y + 14);
    doc.setFont('helvetica', 'normal');
    y += blockH + 8;
  }

  // Feature boxes header
  doc.setFillColor(...BRAND);
  doc.roundedRect(m, y, pw - m * 2, 9, 2, 2, 'F');
  doc.setFontSize(9.5); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
  doc.text('CARACTERÍSTICAS', m + 5, y + 6.5);
  y += 14;

  // Feature grid (clean cards)
  const boxW = (pw - m * 2 - 15) / 4;
  const boxH = 24;
  const features = [
    { label: 'Área', value: unit.area ? `${unit.area}m²` : '-' },
    { label: 'Quartos', value: unit.bedrooms != null ? `${unit.bedrooms}` : '-' },
    { label: 'Suítes', value: unit.suites != null ? `${unit.suites}` : '-' },
    { label: 'Vagas', value: unit.parking_spots != null ? `${unit.parking_spots}` : '-' },
  ];
  features.forEach((f, i) => {
    const fx = m + i * (boxW + 5);
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(fx, y, boxW, boxH, 2, 2, 'F');
    doc.setFillColor(...BRAND);
    doc.rect(fx, y + 3, 1.5, boxH - 6, 'F');
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND);
    doc.text(norm(f.value), fx + boxW / 2, y + 11, { align: 'center' });
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MID);
    doc.text(norm(f.label), fx + boxW / 2, y + 18, { align: 'center' });
  });
  y += boxH + 8;

  // Extra badges
  const badges: { label: string; value: string }[] = [];
  if (unit.furnished) badges.push({ label: 'Mobília', value: FURNISHED_LABELS[unit.furnished] || unit.furnished });
  if (unit.solar_orientation) badges.push({ label: 'Orientação Solar', value: unit.solar_orientation });
  if (unit.condition) badges.push({ label: 'Condição', value: unit.condition });
  if (unit.bathrooms) badges.push({ label: 'Banheiros', value: `${unit.bathrooms}` });
  if (unit.is_financeable) badges.push({ label: 'Financiável', value: 'Sim' });

  if (badges.length > 0) {
    const bColW = (pw - m * 2) / 4;
    badges.forEach((b, i) => {
      const bx = m + (i % 4) * bColW;
      const by = y + Math.floor(i / 4) * 12;
      doc.setFontSize(6.5); doc.setTextColor(...MID);
      doc.text(b.label.toUpperCase(), bx, by);
      doc.setFontSize(8.5); doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold');
      doc.text(norm(b.value), bx, by + 4.5);
      doc.setFont('helvetica', 'normal');
    });
    y += Math.ceil(badges.length / 4) * 12 + 6;
  }

  // Description
  if (unit.description) {
    if (y > ph - 60) { doc.addPage(); y = 18; }
    doc.setFontSize(8.5); doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal');
    const dLines = doc.splitTextToSize(norm(unit.description), pw - m * 2);
    doc.text(dLines.slice(0, 10), m, y);
    y += Math.min(dLines.length, 10) * 4 + 8;
  }

  // Financial: IPTU / Condo
  if (unit.condo_fee || unit.iptu) {
    if (y > ph - 40) { doc.addPage(); y = 18; }
    const finH = 20;
    doc.setFillColor(245, 248, 255);
    doc.roundedRect(m, y, pw - m * 2, finH, 3, 3, 'F');
    doc.setDrawColor(200, 200, 220); doc.setLineWidth(0.3);
    doc.roundedRect(m, y, pw - m * 2, finH, 3, 3, 'S');

    let fx = m + 8;
    if (unit.condo_fee) {
      doc.setFontSize(6.5); doc.setTextColor(...MID); doc.text('CONDOMÍNIO', fx, y + 7);
      doc.setFontSize(11); doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold');
      doc.text(fmt(unit.condo_fee) + '/mês', fx, y + 14);
      doc.setFont('helvetica', 'normal'); fx += 60;
    }
    if (unit.iptu) {
      doc.setFontSize(6.5); doc.setTextColor(...MID); doc.text('IPTU', fx, y + 7);
      doc.setFontSize(11); doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold');
      doc.text(fmt(unit.iptu) + '/ano', fx, y + 14);
      doc.setFont('helvetica', 'normal');
    }
    y += finH + 8;
  }

  // Investment Matrix
  if (unit.price && unit.price > 0 && unit.is_financeable !== false) {
    if (y > ph - 70) { doc.addPage(); y = 18; }

    doc.setFillColor(...BRAND);
    doc.roundedRect(m, y, pw - m * 2, 9, 2, 2, 'F');
    doc.setFontSize(9.5); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
    doc.text('MATRIZ DE INVESTIMENTO', m + 5, y + 6.5);
    y += 14;

    const price = unit.price;
    const rate = 10.5;
    const months = 360;
    const monthlyRate = rate / 100 / 12;
    const scenarios = [20, 30, 40, 50].map(pct => {
      const dp = price * (pct / 100);
      const fin = price - dp;
      const mp = fin * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      const income = mp / 0.3;
      return { pct, dp, fin, mp, income };
    });

    // Clean styled table (no autotable)
    const colW = (pw - m * 2) / 5;
    const headers = ['Entrada', 'Valor Entrada', 'Financiar', '1ª Parcela', 'Renda Mín.'];

    // Header row
    doc.setFillColor(...BRAND);
    doc.rect(m, y, pw - m * 2, 7, 'F');
    doc.setFontSize(6.5); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => {
      doc.text(h, m + i * colW + colW / 2, y + 5, { align: 'center' });
    });
    y += 7;

    // Data rows
    scenarios.forEach((s, ri) => {
      const rowBg = ri % 2 === 0 ? [250, 250, 255] : [255, 255, 255];
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
      doc.rect(m, y, pw - m * 2, 7, 'F');

      doc.setFontSize(7); doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal');
      const vals = [`${s.pct}%`, fmt(s.dp), fmt(s.fin), fmt(s.mp), fmt(s.income)];
      vals.forEach((v, i) => {
        doc.text(v, m + i * colW + colW / 2, y + 5, { align: 'center' });
      });
      y += 7;
    });

    y += 3;
    doc.setFontSize(6); doc.setTextColor(...LIGHT);
    doc.text('* Simulação baseada em taxa de 10,5% a.a. / 360 meses. Sujeito à aprovação de crédito.', m, y);
    y += 8;
  }

  // Rent summary
  if (unit.rent_price && unit.rent_price > 0) {
    if (y > ph - 40) { doc.addPage(); y = 18; }
    const total = (unit.rent_price || 0) + (unit.condo_fee || 0) + ((unit.iptu || 0) / 12);
    doc.setFillColor(245, 248, 255);
    doc.roundedRect(m, y, pw - m * 2, 26, 3, 3, 'F');
    doc.setDrawColor(200, 200, 220); doc.setLineWidth(0.5);
    doc.roundedRect(m, y, pw - m * 2, 26, 3, 3, 'S');

    doc.setFontSize(8); doc.setTextColor(...MID); doc.text('PACOTE MENSAL ESTIMADO', m + 8, y + 8);
    doc.setFontSize(18); doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold');
    doc.text(fmt(total), m + 8, y + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5); doc.setTextColor(...MID);
    doc.text(`Aluguel ${fmt(unit.rent_price)} + Cond. ${fmt(unit.condo_fee)} + IPTU ${fmt((unit.iptu || 0) / 12)}`, m + 8, y + 23);
    y += 34;
  }

  // Amenities
  if (parentProperty?.amenities && parentProperty.amenities.length > 0) {
    if (y > ph - 40) { doc.addPage(); y = 18; }
    doc.setFillColor(...BRAND);
    doc.roundedRect(m, y, pw - m * 2, 9, 2, 2, 'F');
    doc.setFontSize(9.5); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
    doc.text('INFRAESTRUTURA', m + 5, y + 6.5);
    y += 14;

    const names = parentProperty.amenities
      .map(id => AMENITIES_OPTIONS.find(a => a.id === id)?.label || id)
      .filter(Boolean);

    const acols = 3;
    const acolW = (pw - m * 2) / acols;
    doc.setFontSize(7.5); doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal');
    names.forEach((name, i) => {
      const col = i % acols;
      const row = Math.floor(i / acols);
      const ax = m + col * acolW;
      const ay = y + row * 5.5;
      if (ay < ph - 25) {
        doc.text(`• ${norm(name)}`, ax, ay);
      }
    });
  }
}

// ─── Footer ────────────────────────────────────────────────

function addFooter(doc: jsPDF, pw: number, ph: number, agent?: AgentInfo) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const fy = ph - 9;
    doc.setDrawColor(...LIGHT); doc.setLineWidth(0.2);
    doc.line(15, fy - 3, pw - 15, fy - 3);
    safeImg(doc, SLOTI_LOGO_BASE64, 15, fy - 2, 4.5, 4.5);
    doc.setFontSize(6); doc.setTextColor(...MID); doc.setFont('helvetica', 'normal');
    doc.text('Gerado via SlotiMob - O SaaS Imobiliário', 21, fy + 1);
    if (agent?.name) {
      const agentTxt = [agent.name, agent.email, agent.phone].filter(Boolean).join(' | ');
      doc.text(agentTxt, pw - 15, fy + 1, { align: 'right' });
    }
    doc.setFontSize(5.5); doc.setTextColor(...LIGHT);
    doc.text(`${i}/${total}`, pw / 2, fy + 3.5, { align: 'center' });
  }
}

// ─── CTA ───────────────────────────────────────────────────

function addCTA(doc: jsPDF, pw: number, ph: number, m: number) {
  const y = ph - 35;
  doc.setFillColor(...ACCENT);
  doc.roundedRect(m, y, pw - m * 2, 18, 3, 3, 'F');
  doc.setFontSize(11); doc.setTextColor(...WHITE); doc.setFont('helvetica', 'bold');
  doc.text('Gostou? Agende sua visita agora mesmo!', pw / 2, y + 7.5, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Entre em contato e garanta essa oportunidade única.', pw / 2, y + 13.5, { align: 'center' });
}

// ─── Main Generator ────────────────────────────────────────

export async function generatePropertyPDF(
  data: PDFAssetData,
  agent?: AgentInfo,
  options?: { returnBlob?: boolean }
): Promise<Blob | void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15;

  // Load images
  const imgUrl = data.unit.cover_image_url || data.parentProperty?.image_url || null;
  const coverImg = imgUrl ? await loadImage(imgUrl) : null;

  const galleryUrls: string[] = [];
  if (data.unit.gallery && data.unit.gallery.length > 0) {
    galleryUrls.push(...data.unit.gallery.slice(0, 4));
  } else if (data.parentProperty?.gallery_images && data.parentProperty.gallery_images.length > 0) {
    galleryUrls.push(...data.parentProperty.gallery_images.slice(0, 4));
  }
  const galleryImgs = await Promise.all(galleryUrls.map(u => loadImage(u)));
  const validGallery = galleryImgs.filter(Boolean);

  // PAGE 1: Cover
  renderCover(doc, data, pw, ph, m, agent, coverImg);

  // PAGE 2: Gallery (if images available)
  if (validGallery.length > 0) {
    doc.addPage();
    renderGallery(doc, validGallery, pw, ph, m);
  }

  // PAGE 3: Details + Investment
  doc.addPage();
  renderDetails(doc, data, pw, ph, m);

  // CTA on last page
  addCTA(doc, pw, ph, m);

  // Footer on all pages
  addFooter(doc, pw, ph, agent);

  if (options?.returnBlob) {
    return doc.output('blob');
  }

  const safeName = data.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  doc.save(`Proposta_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export { generatePropertyPDF as generatePremiumBrochure };
