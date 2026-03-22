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

    // Adaptive gallery grid: avoid empty holes
    const galleryColClass = gallery.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

    return (
      <div ref={ref} style={{ width: '794px' }} className="bg-white text-[#1e1e23] font-sans">
        {/* ══════ PAGE 1: COVER ══════ */}
        <div style={{ width: '794px', height: '1123px' }} className="relative overflow-hidden flex flex-col">
          {/* Cover image */}
          <div className="relative flex-1 min-h-0" style={{ height: '65%' }}>
            {coverImg ? (
              <img
                src={coverImg}
                alt={title}
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0b0073 0%, #2fc9af 100%)' }} />
            )}
            {/* Darker gradient overlay to prevent text overlap */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 100%)' }} />
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-10 py-5" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2fc9af' }}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-wide">SLOTIMOB</span>
            </div>
            {agent?.name && (
              <div className="text-right text-white/80 text-xs">
                <p className="font-medium text-white/90">{agent.name}</p>
                {agent.phone && <p>{agent.phone}</p>}
              </div>
            )}
          </div>

          {/* Content overlay at bottom of image */}
          <div className="absolute left-0 right-0 px-10 pb-6" style={{ bottom: '35%' }}>
            {typeLabel && (
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider mb-3" style={{ background: '#2fc9af' }}>
                {typeLabel}
              </span>
            )}
            <h1 className="text-white font-bold text-4xl leading-tight mb-2 drop-shadow-lg">{title}</h1>
            {location && (
              <div className="flex items-center gap-2 text-white/80 text-sm drop-shadow">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* Bottom info section */}
          <div className="px-10 py-8 flex items-center justify-between" style={{ height: '35%', background: '#0b0073' }}>
            <div className="space-y-3">
              {data.leadName && (
                <p className="text-sm" style={{ color: '#2fc9af' }}>
                  Proposta exclusiva para <span className="font-bold">{data.leadName}</span>
                </p>
              )}
              <div>
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
            </div>

            {/* Feature pills */}
            <div className="grid grid-cols-2 gap-3">
              {unit.area && (
                <FeaturePill icon={<Maximize className="w-5 h-5" />} value={`${unit.area}m²`} label="Área" />
              )}
              {unit.bedrooms != null && (
                <FeaturePill icon={<Bed className="w-5 h-5" />} value={`${unit.bedrooms}`} label="Quartos" />
              )}
              {unit.suites != null && unit.suites > 0 && (
                <FeaturePill icon={<Bath className="w-5 h-5" />} value={`${unit.suites}`} label="Suítes" />
              )}
              {unit.parking_spots != null && (
                <FeaturePill icon={<Car className="w-5 h-5" />} value={`${unit.parking_spots}`} label="Vagas" />
              )}
            </div>
          </div>
        </div>

        {/* ══════ PAGE 2: DETAILS ══════ */}
        <div style={{ width: '794px', minHeight: '1123px' }} className="px-10 py-10 flex flex-col">
          {/* Introduction message */}
          {data.introductionMessage && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 rounded-full" style={{ background: '#0b0073' }} />
                <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: '#0b0073' }}>Apresentação</h2>
              </div>
              <div className="p-6 rounded-xl border-l-4" style={{ background: '#f5f8ff', borderColor: '#0b0073' }}>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#444' }}>
                  {data.introductionMessage}
                </p>
              </div>
            </div>
          )}

          {/* Features grid */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 rounded-full" style={{ background: '#0b0073' }} />
              <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: '#0b0073' }}>Características</h2>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <SpecCard label="Área" value={unit.area ? `${unit.area}m²` : '—'} />
              <SpecCard label="Quartos" value={unit.bedrooms != null ? `${unit.bedrooms}` : '—'} />
              <SpecCard label="Suítes" value={unit.suites != null ? `${unit.suites}` : '—'} />
              <SpecCard label="Vagas" value={unit.parking_spots != null ? `${unit.parking_spots}` : '—'} />
              {unit.bathrooms != null && <SpecCard label="Banheiros" value={`${unit.bathrooms}`} />}
              {unit.furnished && <SpecCard label="Mobília" value={FURNISHED_LABELS[unit.furnished] || unit.furnished} />}
              {unit.solar_orientation && <SpecCard label="Orientação Solar" value={unit.solar_orientation} />}
              {unit.condition && <SpecCard label="Condição" value={unit.condition} />}
            </div>
          </div>

          {/* Description */}
          {unit.description && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 rounded-full" style={{ background: '#0b0073' }} />
                <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: '#0b0073' }}>Descrição</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#555' }}>
                {unit.description}
              </p>
            </div>
          )}

          {/* Gallery grid — adaptive, no blank holes */}
          {gallery.length > 0 && (
            <div className="mt-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 rounded-full" style={{ background: '#0b0073' }} />
                <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: '#0b0073' }}>Galeria</h2>
              </div>
              <div className={`grid ${galleryColClass} gap-3`}>
                {gallery.map((img, i) => (
                  <div
                    key={i}
                    className={`rounded-lg overflow-hidden ${gallery.length === 3 && i === 2 ? 'col-span-2' : ''}`}
                    style={{ height: '180px', background: '#eee' }}
                  >
                    <img src={img} alt={`Foto ${i + 1}`} crossOrigin="anonymous" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════ PAGE 3: FINANCIAL (conditional) ══════ */}
        {hasFinancial && (
          <div style={{ width: '794px', minHeight: '1123px' }} className="px-10 py-10 flex flex-col">
            {/* Condo / IPTU */}
            {(unit.condo_fee || unit.iptu) && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 rounded-full" style={{ background: '#0b0073' }} />
                  <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: '#0b0073' }}>Custos Mensais</h2>
                </div>
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

            {/* Financing / Investment Matrix */}
            {unit.price && unit.price > 0 && unit.is_financeable !== false && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 rounded-full" style={{ background: '#0b0073' }} />
                  <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: '#0b0073' }}>Matriz de Investimento</h2>
                </div>
                <InvestmentTable price={unit.price} rate={financingSimulation?.annualRate} />
                <p className="text-xs mt-3" style={{ color: '#aaa' }}>
                  * Simulação baseada em taxa de {financingSimulation?.annualRate || 10.5}% a.a. / 360 meses. Sujeito à aprovação de crédito.
                </p>
              </div>
            )}

            {/* Custom financing simulation */}
            {financingSimulation && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 rounded-full" style={{ background: '#2fc9af' }} />
                  <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: '#0b0073' }}>Simulação Personalizada</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl" style={{ background: '#f0fdf8' }}>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#888' }}>Entrada ({financingSimulation.downPaymentPercent}%)</p>
                    <p className="text-xl font-bold" style={{ color: '#0b0073' }}>{fmt(financingSimulation.downPayment)}</p>
                  </div>
                  <div className="p-5 rounded-xl" style={{ background: '#f0fdf8' }}>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#888' }}>Valor Financiado</p>
                    <p className="text-xl font-bold" style={{ color: '#0b0073' }}>{fmt(financingSimulation.financedAmount)}</p>
                  </div>
                  <div className="p-5 rounded-xl" style={{ background: '#f0fdf8' }}>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#888' }}>Parcela Mensal</p>
                    <p className="text-xl font-bold" style={{ color: '#2fc9af' }}>{fmt(financingSimulation.monthlyPayment)}</p>
                  </div>
                  <div className="p-5 rounded-xl" style={{ background: '#f0fdf8' }}>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#888' }}>Prazo</p>
                    <p className="text-xl font-bold" style={{ color: '#0b0073' }}>{financingSimulation.months} meses</p>
                  </div>
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
              {/* Footer */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: '#e5e5ea' }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: '#2fc9af' }}>
                    <Building2 className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs" style={{ color: '#999' }}>Gerado via SlotiMob - O SaaS Imobiliário</span>
                </div>
                {agent?.name && (
                  <span className="text-xs" style={{ color: '#999' }}>
                    {[agent.name, agent.email, agent.phone].filter(Boolean).join(' | ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ProposalPdfTemplate.displayName = 'ProposalPdfTemplate';

// ─── Sub-components ─────────────────────────

function FeaturePill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
      <div className="text-white/60">{icon}</div>
      <div>
        <p className="text-white font-bold text-lg leading-none">{value}</p>
        <p className="text-white/50 text-xs">{label}</p>
      </div>
    </div>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl text-center" style={{ background: '#f5f5fa' }}>
      <p className="text-2xl font-bold mb-1" style={{ color: '#0b0073' }}>{value}</p>
      <p className="text-xs uppercase tracking-wider" style={{ color: '#888' }}>{label}</p>
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
      <div className="grid grid-cols-5 text-center py-3 px-2 text-xs font-bold uppercase tracking-wider text-white" style={{ background: '#0b0073' }}>
        <span>Entrada</span>
        <span>Valor Entrada</span>
        <span>Financiar</span>
        <span>1ª Parcela</span>
        <span>Renda Mín.</span>
      </div>
      {/* Rows */}
      {scenarios.map((s, i) => (
        <div
          key={s.pct}
          className="grid grid-cols-5 text-center py-3 px-2 text-sm"
          style={{ background: i % 2 === 0 ? '#fafaff' : '#fff' }}
        >
          <span className="font-bold" style={{ color: '#0b0073' }}>{s.pct}%</span>
          <span style={{ color: '#444' }}>{fmt(s.dp)}</span>
          <span style={{ color: '#444' }}>{fmt(s.fin)}</span>
          <span className="font-bold" style={{ color: '#2fc9af' }}>{fmt(s.mp)}</span>
          <span style={{ color: '#888' }}>{fmt(s.income)}</span>
        </div>
      ))}
    </div>
  );
}
