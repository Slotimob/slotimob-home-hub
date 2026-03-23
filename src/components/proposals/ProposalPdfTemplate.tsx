import React, { forwardRef } from 'react';
import { Bed, Bath, Car, Maximize, Sun, Sofa, Hammer, Building2, MapPin, Calculator } from 'lucide-react';
import type { PDFAssetData, AgentInfo, CustomSimulation } from '@/utils/propertyPdfGenerator';

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
    const { unit, parentProperty, title, financingSimulation, customSimulation } = data;
    const coverImg = unit.cover_image_url || parentProperty?.image_url || null;
    const allGallery = (unit.gallery || parentProperty?.gallery_images || []);
    const gallery = allGallery.slice(0, 8);
    const location = [unit.neighborhood, unit.city, unit.state].filter(Boolean).join(' · ');
    const typeLabel = unit.property_type ? PROPERTY_TYPE_LABELS[unit.property_type] || unit.property_type : '';
    const hasFinancial = unit.condo_fee || unit.iptu || (unit.price && unit.is_financeable !== false);
    const generatedDate = new Date().toLocaleDateString('pt-BR');

    return (
      <div ref={ref} style={{ width: '794px' }} className="bg-white font-sans">

        {/* ══════ PAGE 1: COVER ══════ */}
        <div style={{ width: '794px', height: '1123px' }} className="relative overflow-hidden flex flex-col">
          {/* Full-bleed background image */}
          <div className="absolute inset-0">
            {coverImg ? (
              <img src={coverImg} alt={title} crossOrigin="anonymous" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0b0073 0%, #2fc9af 100%)' }} />
            )}
            {/* Heavy gradient for text legibility */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.85) 100%)' }} />
          </div>

          {/* Content layer */}
          <div className="relative z-10 flex flex-col justify-between h-full p-10">
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#2fc9af' }}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white font-bold text-xl tracking-wider" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>SLOTIMOB</span>
              </div>
              <div className="flex items-center gap-3">
              {typeLabel && (
                  <span className="px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest inline-flex items-center justify-center text-center leading-none text-white" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>
                    {typeLabel}
                  </span>
                )}
                {agent?.name && (
                  <div className="text-right">
                    <p className="font-semibold text-sm text-white" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>{agent.name}</p>
                    {agent.phone && <p className="text-xs text-white/80" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{agent.phone}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom content */}
            <div>
              {data.leadName && (
                <p className="text-sm mb-3 font-medium" style={{ color: '#2fc9af', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                  Proposta exclusiva para <span className="font-bold">{data.leadName}</span>
                </p>
              )}

              <h1 className="text-white font-bold text-4xl leading-tight mb-3" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                {title}
              </h1>

              {location && (
                <div className="flex items-center gap-2 text-white/80 text-sm mb-6" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                  <MapPin className="w-4 h-4" />
                  <span>{location}</span>
                </div>
              )}

              {/* Price + Features row */}
              <div className="flex items-end justify-between gap-6">
                <div>
                  {unit.price ? (
                    <>
                      <p className="text-white text-4xl font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{fmt(unit.price)}</p>
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
          </div>
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

          <div className="mt-auto">
            <PageFooter agent={agent} date={generatedDate} />
          </div>
        </div>

        {/* ══════ PAGE 3: GALLERY (up to 8 photos) ══════ */}
        {gallery.length > 0 && (
          <div style={{ width: '794px', minHeight: '1123px', pageBreakBefore: 'always', pageBreakInside: 'avoid' }} className="px-10 py-10 flex flex-col">
            <SectionTitle title="Galeria de Fotos" />
            <div className="grid grid-cols-2 gap-4 flex-1">
              {gallery.map((img, i) => (
                <div
                  key={i}
                  className={`rounded-xl overflow-hidden ${gallery.length % 2 !== 0 && i === gallery.length - 1 ? 'col-span-2' : ''}`}
                  style={{ height: gallery.length <= 4 ? '240px' : '200px' }}
                >
                  <img src={img} alt={`Foto ${i + 1}`} crossOrigin="anonymous" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <div className="mt-auto">
              <PageFooter agent={agent} date={generatedDate} />
            </div>
          </div>
        )}

        {/* ══════ PAGE 4: FINANCIAL (conditional) ══════ */}
        {hasFinancial && (
          <div style={{ width: '794px', minHeight: '1123px', pageBreakBefore: 'always' }} className="px-10 py-10 flex flex-col">
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

            {/* Custom Simulation (before standard matrix) */}
            {customSimulation && (
              <div className="mb-8">
                <SectionTitle title="Simulação Personalizada" accent />
                <CustomSimulationCard sim={customSimulation} />
              </div>
            )}

            {/* Investment Matrix */}
            {unit.price && unit.price > 0 && unit.is_financeable !== false && (
              <div className="mb-8">
                <SectionTitle title="Matriz de Investimento" />
                <InvestmentTable price={unit.price} rate={financingSimulation?.annualRate} />
                <p className="text-[10px] mt-3" style={{ color: '#aaa' }}>
                  * Simulação baseada em taxa de {financingSimulation?.annualRate || 10.5}% a.a. / 360 meses. Valores sujeitos à aprovação de crédito.
                </p>
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
              <CTAFooter agent={agent} />
              <PageFooter agent={agent} date={generatedDate} />
            </div>
          </div>
        )}

        {/* ══════ FINAL PAGE: CTA (if no financial page) ══════ */}
        {!hasFinancial && (
          <div style={{ width: '794px', minHeight: '400px' }} className="px-10 py-10">
            <CTAFooter agent={agent} />
            <PageFooter agent={agent} date={generatedDate} />
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

function CTAFooter({ agent }: { agent?: AgentInfo }) {
  const phoneDisplay = agent?.whatsapp || '';
  return (
    <div className="p-6 rounded-xl text-center mb-6" style={{ background: '#2fc9af' }}>
      <p className="text-white text-xl font-bold mb-1">Gostou? Agende sua visita agora!</p>
      <p className="text-white/80 text-sm mb-3">Entre em contato e garanta essa oportunidade única.</p>
      {phoneDisplay && (
        <div className="inline-block px-6 py-3 rounded-full" style={{ background: '#25D366' }}>
          <p className="text-white font-bold text-lg" style={{ letterSpacing: '0.5px' }}>
            WhatsApp: {phoneDisplay}
          </p>
        </div>
      )}
      {agent?.name && (
        <p className="text-white/70 text-sm mt-3">{agent.name}{agent.email ? ` · ${agent.email}` : ''}</p>
      )}
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
          {[agent.name, agent.email, agent.whatsapp ? `WhatsApp: ${agent.whatsapp}` : agent.phone].filter(Boolean).join(' | ')}
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

function CustomSimulationCard({ sim }: { sim: CustomSimulation }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '2px solid #2fc9af' }}>
      <div className="p-4 text-center" style={{ background: 'rgba(47,201,175,0.08)' }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Calculator className="w-4 h-4" style={{ color: '#2fc9af' }} />
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: '#0b0073' }}>Sua Simulação</span>
        </div>
      </div>
      <div className="grid grid-cols-2" style={{ borderTop: '1px solid #e0f5ef' }}>
        <SimCell label={`Entrada (${sim.downPaymentPercent}%)`} value={fmt(sim.downPayment)} />
        <SimCell label="Valor Financiado" value={fmt(sim.financedAmount)} borderLeft />
        <SimCell label="Parcela Mensal" value={fmt(sim.monthlyPayment)} highlight borderTop />
        <SimCell label="Prazo" value={`${sim.months} meses`} borderLeft borderTop />
      </div>
      <div className="p-2 text-center text-[10px]" style={{ background: '#f8fffe', color: '#aaa', borderTop: '1px solid #e0f5ef' }}>
        Taxa: {sim.annualRate}% a.a. · Valor base: {fmt(sim.basePrice)}
      </div>
    </div>
  );
}

function SimCell({ label, value, highlight, borderLeft, borderTop }: { label: string; value: string; highlight?: boolean; borderLeft?: boolean; borderTop?: boolean }) {
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
          className="grid grid-cols-5 text-center py-3 px-2 text-sm items-center"
          style={{ background: i % 2 === 0 ? '#f8f8fc' : '#ffffff' }}
        >
          <span className="font-bold" style={{ color: '#0b0073' }}>{s.pct}%</span>
          <span style={{ color: '#444' }}>{fmt(s.dp)}</span>
          <span style={{ color: '#444' }}>{fmt(s.fin)}</span>
          <span className="font-bold inline-flex items-center justify-center">
            <span className="px-2 py-1 rounded" style={{ color: '#0b0073' }}>{fmt(s.mp)}</span>
          </span>
          <span className="text-sm" style={{ color: '#888' }}>{fmt(s.income)}</span>
        </div>
      ))}
    </div>
  );
}
