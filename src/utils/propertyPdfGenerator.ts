import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', terreno: 'Terreno',
  sala_comercial: 'Sala Comercial', loja: 'Loja', galpao: 'Galpão',
  rural: 'Rural', outros: 'Outros',
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
      gallery: unit.gallery_images || unit.gallery || [],
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
      gallery: unit.gallery_images || unit.gallery || [],
    },
    parentProperty: null,
    title: loc ? `${typeLabel} - ${loc}` : unit.unit_number,
    subtitle: unit.address || undefined,
  };
}

// ─── Image Preloading via decode() ─────────────────────────

async function waitForImages(element: HTMLElement, timeoutMs = 10000): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  if (images.length === 0) return;

  const promises = images.map(async (img) => {
    try {
      if (img.complete && img.naturalWidth > 0) {
        await img.decode();
        return;
      }
      await new Promise<void>((resolve) => {
        img.onload = async () => {
          try { await img.decode(); } catch {}
          resolve();
        };
        img.onerror = () => resolve();
      });
    } catch {
      // decode() can fail for broken images — non-blocking
    }
  });

  await Promise.race([
    Promise.all(promises),
    new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
  ]);

  // Extra paint delay
  await new Promise(resolve => setTimeout(resolve, 400));
}

// ─── HTML2Canvas → PDF Generator ───────────────────────────

export async function generatePropertyPDF(
  _data: PDFAssetData,
  _agent?: AgentInfo,
  options?: { returnBlob?: boolean; templateElement?: HTMLElement }
): Promise<Blob | void> {
  const element = options?.templateElement;
  if (!element) {
    console.error('ProposalPdfTemplate element ref is required for PDF generation');
    return;
  }

  // Wait for all gallery/cover images to decode before capturing
  await waitForImages(element);

  // A4 dimensions in mm
  const A4_W = 210;
  const A4_H = 297;
  const PAGE_HEIGHT_PX = 1123;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    width: 794,
    windowWidth: 794,
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const totalHeight = canvas.height;
  const scaledPageH = PAGE_HEIGHT_PX * 2; // because scale: 2
  const numPages = Math.ceil(totalHeight / scaledPageH);

  for (let i = 0; i < numPages; i++) {
    if (i > 0) doc.addPage();

    const sliceH = Math.min(scaledPageH, totalHeight - i * scaledPageH);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;

    const ctx = pageCanvas.getContext('2d');
    if (!ctx) continue;
    ctx.drawImage(canvas, 0, -i * scaledPageH);

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
    const imgH = (sliceH / canvas.width) * A4_W;
    doc.addImage(imgData, 'JPEG', 0, 0, A4_W, imgH);
  }

  if (options?.returnBlob) {
    return doc.output('blob');
  }

  const safeName = (_data.title || 'proposta').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  doc.save(`Proposta_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export { generatePropertyPDF as generatePremiumBrochure };
