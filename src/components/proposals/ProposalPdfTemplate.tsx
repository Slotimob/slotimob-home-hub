import React, { forwardRef } from 'react';
import { Bed, Bath, Car, Maximize, Sun, Sofa, Hammer, DollarSign, Building2, MapPin } from 'lucide-react';
import type { PDFAssetData, AgentInfo, FinancingSimulation } from '@/utils/propertyPdfGenerator';

interface ProposalPdfTemplateProps {
  data: PDFAssetData;
  agent?: AgentInfo;
}

const fmt = (v: number | null | undefined): string => {
  if (!v) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
};

const FURNISHED_LABELS: Record<string, string> = {
  sim: 'Mobiliado', semimobiliado: 'Semimobiliado', nao: 'Sem mobília',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', terreno: 'Terreno',
  sala_comercial: 'Sala Comercial', loja: 'Loja', galpao: 'Galpão',
  rural: 'Rural', outros: 'Outros',
};

export const ProposalPdfTemplate = forwardRef<HTMLDivElement, ProposalPdfTemplateProps>(
  ({ data, agent }, ref) => {
    const { unit, parentProperty, title, financingSimulation } = data;
    const coverImg = unit.cover_image_url || parentProperty?.image_url || null;
    const gallery = (unit.gallery || parentProperty?.gallery_images || []).slice(0, 4);
    const location = [unit.neighborhood, unit.city, unit.state].filter(Boolean).join(' · ');
    const typeLabel = unit.property_type ? PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type : '';
    const hasFinancial = unit.condo_fee || unit.iptu || (unit.price && unit.is_financeable !== false);
    const galleryColClass = gallery.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
    const generatedDate = new Date().toLocaleDateString('pt-BR');

    return (
      <div ref={ref} style={{ width: '794px' }} className="bg-white font-sans">
        {/* ══════ PAGE 1: COVER ══════ */}
        <div style={{ width: '794px', height: '1123px' }} className="relative overflow-hidden flex flex-col">
          {/* Full-height cover image */}
          <div className="relative flex-1 min-h-0">
            {coverImg ? (
              <img src={coverImg} alt={title} crossOrigin="anonymous" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0b0073 0%, #2fc9af 100%)' }} />
            )}
            {/* Dark gradient overlay */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.8) 100%)' }} />
          </div>

          {/* Top bar with logo */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-10 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#2fc9af' }}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-wide drop-shadow-lg">SLOTIMOB</span>
            </div>
            {/* Type badge */}
            {typeLabel && (
              <span className="px-4 py-1.5 rounded-full text-[11px] font-bold text-white uppercase tracking-widest" style={{ background: 'rgba(47,201,175,0.9)', backdropFilter: 'blur(4px)' }}>
                {typeLabel}
              </span>
            )}
          </div>

          {/* Bottom content overlay with gradient */}
          <div className="absolute bottom-0 left-0 right-0 px-10 pb-10 pt-32" style={{ background: 'linear-gradient(to top, rgba(11,0,115,0.95) 0%, rgba(11,0,115,0.7) 60%, transparent 100%)' }}>
            <h1 className="text-white font-bold text-4xl leading-tight mb-3" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {title}
            </h1>
            {location && (
              <div className="flex items-center gap-2 text-white/80 text-sm mb-6">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            )}

            {/* Price + Lead + Features row */}
            <div className="flex items-end justify-between">
              <div>
                {data.leadName && (
                  <p className="text-sm mb-2" style={{ color: '#2fc9af' }}>
                    Proposta exclusiva para <span className="font-bold">{data.leadName}</span>
                  </p>
                )}
                {unit.price ? (
                  <>
                    <p className="text-white text-4xl font-bold">{fmt(unit.price)}</p>
                    {unit.area && unit.area > 0 && (
                      <p className="text-white/50 text-sm mt-1">{fmt(unit.price / unit.area)}/m²</p>
                    )}
                  </>
                ) : unit.rent_price ? (
                  <p className="text-white text-3xl font-bold">{fmt(unit.rent_price)}<span className="text-lg font-normal text-white/60">/mês</span></p>
                ) : null}
              </div>

              {/* Feature pills */}
              <div className="grid grid-cols-2 gap-2.5">
                {unit.area && <FeaturePill icon={<Maximize className="w-4 h-4" />} value={`${unit.area}m²`} label="Área" />}
                {unit.bedrooms != null && <FeaturePill icon={<Bed className="w-4 h-4" />} value={`${unit.bedrooms}`} label="Quartos" />}
                {unit.suites != null && unit.suites > 0 && <FeaturePill icon={<Bath className="w-4 h-4" />} value={`${unit.suites}`} label="Suítes" />}
                {unit.parking_spots != null && <FeaturePill icon={<Car className="w-4 h-4" />} value={`${unit.parking_spots}`} label="Vagas" />}
              </div>
            </div>
          </div>

          {/* Agent info top-right */}
          {agent?.name && (
            <div className="absolute top-5 right-10 text-right text-white/80 text-xs bg-black/30 rounded-lg px-3 py-2 backdrop-blur-sm">
              <p className="font-medium text-white/90">{agent.name}</p>
              {agent.phone && <p>{agent.phone}</p>}
            </div>
          )}
        </div>

        {/* ══════ PAGE 2: DETAILS ══════ */}
        <div style={{ width: '794px', minHeight: '1123px' }} className="px-10 py-10 flex flex-col">
          {/* Introduction message */}
          {data.introductionMessage && (
            <div className="mb-8">
              <SectionTitle title="Apresentação" />
              <div className="p-6 rounded-xl border-l-4" style={{ background: '#f5f8ff', borderColor: '#0b0073' }}>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#444' }}>
                  {data.introductionMessage}
                </p>
              </div>
            </div>
          )}

          {/* Features grid */}
          <div className="mb-8">
            <SectionTitle title="Características" />
            <div className="grid grid-cols-4 gap-3">
              <SpecCard icon={<Maximize className="w-5 h-5" />} label="Área" value={unit.area ? `${unit.area}m²` : '—'} />
              <SpecCard icon={<Bed className="w-5 h-5" />} label="Quartos" value={unit.bedrooms != null ? `${unit.bedrooms}` : '—'} />
              <SpecCard icon={<Bath className="w-5 h-5" />} label="Suítes" value={unit.suites != null ? `${unit.suites}` : '—'} />
              <SpecCard icon={<Car className="w-5 h-5" />} label="Vagas" value={unit.parking_spots != null ? `${unit.parking_spots}` : '—'} />
              {unit.bathrooms != null && <SpecCard icon={<Bath className="w-5 h-5" />} label="Banheiros" value={`${unit.bathrooms}`} />}
              {unit.furnished && <SpecCard icon={<Sofa className="w-5 h-5" />} label="Mobília" value={FURNISHED_LABELS[unit.furnished] || unit.furnished} />}
              {unit.solar_orientation && <SpecCard icon={<Sun className="w-5 h-5" />} label="Orientação" value={unit.solar_orientation} />}
              {unit.condition && <SpecCard icon={<Hammer className="w-5 h-5" />} label="Condição" value={unit.condition} />}
            </div>
          </div>

          {/* Description */}
          {unit.description && (
            <div className="mb-8">
              <SectionTitle title="Descrição" />
              <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{unit.description}</p>
            </div>
          )}

          {/* Gallery grid */}
          {gallery.length > 0 && (
            <div className="mt-auto">
              <SectionTitle title="Galeria" />
              <div className={`grid ${galleryColClass} gap-3`}>
                {gallery.map((img, i) => (
                  <div
                    key={i}
                    className={`rounded-xl overflow-hidden ${gallery.length === 3 && i === 2 ? 'col-span-2' : ''}`}
                    style={{ height: '180px', background: '#eee' }}
                  >
                    <img src={img} alt={`Foto ${i + 1}`} crossOrigin="anonymous" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page 2 footer */}
          <PageFooter agent={agent} date={generatedDate} />
        </div>

        {/* ══════ PAGE 3: FINANCIAL (conditional) ══════ */}
        {hasFinancial && (
          <div style={{ width: '794px', minHeight: '1123px' }} className="px-10 py-10 flex flex-col">
            {/* Condo / IPTU */}
            {(unit.condo_fee || unit.iptu) && (
              <div className="mb-8">
                <SectionTitle title="Custos Mensais" />
                <div className="grid grid-cols-2 gap-4">
                  {unit.condo_fee && (
                    <div className="p-5 rounded-xl" style={{ background: '#f5f8ff' }}>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#888' }}>Condomínio</p>
                      <p className="text-2xl font-bold" style={{ color: '#0b0073' }}>{fmt(unit.condo_fee)}<span className="text-sm font-normal" style={{ color: '#888' }}>/mês</span></p>
                    </div>
                  )}
                  {unit.iptu && (
                    <div className="p-5 rounded-xl" style={{ background: '#f5f8ff' }}>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#888' }}>IPTU</p>
                      <p className="text-2xl font-bold" style={{ color: '#0b0073' }}>{fmt(unit.iptu)}<span className="text-sm font-normal" style={{ color: '#888' }}>/ano</span></p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Investment Matrix */}
            {unit.price && unit.price > 0 && unit.is_financeable !== false && (
              <div className="mb-8">
                <SectionTitle title="Matriz de Investimento" />
                <InvestmentTable price={unit.price} rate={financingSimulation?.annualRate} />
                <p className="text-[10px] mt-3" style={{ color: '#aaa' }}>
                  * Simulação baseada em taxa de {financingSimulation?.annualRate || 10.5}% a.a. / 360 meses. Valores sujeitos à aprovação de crédito e podem variar conforme perfil do comprador.
                </p>
              </div>
            )}

            {/* Custom financing simulation */}
            {financingSimulation && (
              <div className="mb-8">
                <SectionTitle title="Simulação Personalizada" accent />
                <div className="grid grid-cols-2 rounded-xl overflow-hidden" style={{ border: '1px solid #e0f5ef' }}>
                  <SimCard label={`Entrada (${financingSimulation.downPaymentPercent}%)`} value={fmt(financingSimulation.downPayment)} />
                  <SimCard label="Valor Financiado" value={fmt(financingSimulation.financedAmount)} borderLeft />
                  <SimCard label="Parcela Mensal" value={fmt(financingSimulation.monthlyPayment)} highlight borderTop />
                  <SimCard label="Prazo" value={`${financingSimulation.months} meses`} borderLeft borderTop />
                </div>
              </div>
            )}

            {/* Rent total */}
            {unit.rent_price && unit.rent_price > 0 && (
              <div className="mb-8">
                <div className="p-6 rounded-xl" style={{ background: 'linear-gradient(135deg, #0b0073, #1a1a8e)' }}>
                  <p className="text-white/70 text-sm mb-2">Pacote Mensal Estimado</p>
                  <p className="text-white text-3xl font-bold mb-1">{fmt((unit.rent_price || 0) + (unit.condo_fee || 0) + ((unit.iptu || 0) / 12))}</p>
                  <p className="text-white/50 text-xs">
                    Aluguel {fmt(unit.rent_price)} + Cond. {fmt(unit.condo_fee)} + IPTU {fmt((unit.iptu || 0) / 12)}
                  </p>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-auto">
              <div className="p-6 rounded-xl text-center" style={{ background: '#2fc9af' }}>
                <p className="text-white text-xl font-bold mb-1">Gostou? Agende sua visita agora!</p>
                <p className="text-white/80 text-sm">Entre em contato e garanta essa oportunidade única.</p>
              </div>
              <PageFooter agent={agent} date={generatedDate} />
            </div>
          </div>
        )}
      </div>
    );
  }
);

ProposalPdfTemplate.displayName = 'ProposalPdfTemplate';

// ─── Sub-components ─────────────────────────

function SectionTitle({ title, accent }: { title: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-6 rounded-full" style={{ background: accent ? '#2fc9af' : '#0b0073' }} />
      <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: '#0b0073' }}>{title}</h2>
    </div>
  );
}

function PageFooter({ agent, date }: { agent?: AgentInfo; date: string }) {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: '#e5e5ea' }}>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#2fc9af' }}>
          <Building2 className="w-3 h-3 text-white" />
        </div>
        <span className="text-[10px]" style={{ color: '#999' }}>Gerado via SlotiMob · {date}</span>
      </div>
      {agent?.name && (
        <span className="text-[10px]" style={{ color: '#999' }}>
          {[agent.name, agent.email, agent.phone].filter(Boolean).join(' | ')}
        </span>
      )}
    </div>
  );
}

function FeaturePill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}>
      <div className="text-white/70">{icon}</div>
      <div>
        <p className="text-white font-bold text-base leading-none">{value}</p>
        <p className="text-white/50 text-[10px]">{label}</p>
      </div>
    </div>
  );
}

function SpecCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl text-center" style={{ background: '#f5f5fa' }}>
      <div className="flex justify-center mb-2" style={{ color: '#0b0073' }}>{icon}</div>
      <p className="text-xl font-bold mb-0.5" style={{ color: '#0b0073' }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: '#888' }}>{label}</p>
    </div>
  );
}

function SimCard({ label, value, highlight, borderLeft, borderTop }: { label: string; value: string; highlight?: boolean; borderLeft?: boolean; borderTop?: boolean }) {
  return (
    <div
      className="p-5"
      style={{
        background: highlight ? '#f0fdf8' : '#fafffe',
        borderLeft: borderLeft ? '1px solid #e0f5ef' : undefined,
        borderTop: borderTop ? '1px solid #e0f5ef' : undefined,
      }}
    >
      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#888' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: highlight ? '#2fc9af' : '#0b0073' }}>{value}</p>
    </div>
  );
}

function InvestmentTable({ price, rate: customRate }: { price: number; rate?: number }) {
  const rate = customRate || 10.5;
  const months = 360;
  const monthlyRate = rate / 100 / 12;

  const scenarios = [20, 30, 40, 50].map(pct => {
    const dp = price * (pct / 100);
    const fin = price - dp;
    const mp = fin * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    const income = mp / 0.3;
    return { pct, dp, fin, mp, income };
  });

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e5ea' }}>
      {/* Header */}
      <div className="grid grid-cols-5 text-center py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-white" style={{ background: '#0b0073' }}>
        <span>Entrada</span>
        <span>Valor Entrada</span>
        <span>Financiar</span>
        <span>1ª Parcela</span>
        <span>Renda Mín.</span>
      </div>
      {/* Rows with zebra-striping */}
      {scenarios.map((s, i) => (
        <div
          key={s.pct}
          className="grid grid-cols-5 text-center py-3 px-2 text-sm"
          style={{ background: i % 2 === 0 ? '#f8f8fc' : '#ffffff' }}
        >
          <span className="font-bold" style={{ color: '#0b0073' }}>{s.pct}%</span>
          <span style={{ color: '#444' }}>{fmt(s.dp)}</span>
          <span style={{ color: '#444' }}>{fmt(s.fin)}</span>
          <span className="font-bold px-1 py-0.5 rounded" style={{ color: '#0b0073', background: 'rgba(47,201,175,0.12)' }}>{fmt(s.mp)}</span>
          <span className="text-sm" style={{ color: '#888' }}>{fmt(s.income)}</span>
        </div>
      ))}
    </div>
  );
}
