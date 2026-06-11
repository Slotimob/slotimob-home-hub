import { Reveal } from './Reveal';
import { Check, X, Minus } from 'lucide-react';

type Cell = 'yes' | 'no' | 'partial';
const ROWS: { label: string; slo: Cell; crm: Cell; sheet: Cell }[] = [
  { label: 'CRM com kanban e pipeline visual', slo: 'yes', crm: 'yes', sheet: 'no' },
  { label: 'Financeiro com DRE por categoria', slo: 'yes', crm: 'partial', sheet: 'partial' },
  { label: 'Conciliação bancária com OFX', slo: 'yes', crm: 'no', sheet: 'no' },
  { label: 'Contratos em PDF automáticos', slo: 'yes', crm: 'partial', sheet: 'no' },
  { label: 'Relatório DIMOB em um clique', slo: 'yes', crm: 'no', sheet: 'no' },
  { label: 'WhatsApp integrado ao CRM', slo: 'yes', crm: 'partial', sheet: 'no' },
  { label: 'Assistente de IA com créditos', slo: 'yes', crm: 'no', sheet: 'no' },
  { label: 'Relatórios automáticos (semanal / mensal)', slo: 'yes', crm: 'partial', sheet: 'no' },
  { label: 'Preço acessível para autônomo', slo: 'yes', crm: 'no', sheet: 'yes' },
  { label: 'Tudo em um único login', slo: 'yes', crm: 'partial', sheet: 'no' },
];

function Mark({ v }: { v: Cell }) {
  if (v === 'yes') return <Check className="w-4 h-4" style={{ color: 'var(--lp-accent)' }} aria-label="sim" />;
  if (v === 'partial') return <Minus className="w-4 h-4" style={{ color: 'var(--lp-mute)' }} aria-label="parcial" />;
  return <X className="w-4 h-4" style={{ color: 'var(--lp-mute)' }} aria-label="não" />;
}

export function LpComparison() {
  return (
    <section id="comparativo" className="py-24 md:py-36">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-20">
          <div className="col-span-12 md:col-span-4">
            <Reveal>
              <p className="lp-eyebrow">05 — comparativo</p>
            </Reveal>
          </div>
          <div className="col-span-12 md:col-span-8">
            <Reveal delay={80}>
              <h2 className="lp-display text-[40px] md:text-[80px]">
                por que slotimob,
                <br />
                <em className="lp-serif" style={{ fontStyle: 'italic', color: 'var(--lp-accent)' }}>e não</em> outra coisa.
              </h2>
            </Reveal>
          </div>
        </div>

        <Reveal delay={120}>
          <div className="overflow-x-auto lp-scroll-x">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr style={{ borderTop: '1px solid var(--lp-line)', borderBottom: '1px solid var(--lp-line)' }}>
                  <th className="text-left lp-eyebrow py-5 w-[42%]">recurso</th>
                  <th
                    className="lp-serif text-lg py-5 px-4 w-[19.33%]"
                    style={{
                      color: 'var(--lp-bg)',
                      background: 'var(--lp-accent)',
                      borderLeft: '1px solid var(--lp-accent)',
                      borderRight: '1px solid var(--lp-accent)',
                    }}
                  >
                    slotimob
                  </th>
                  <th className="lp-eyebrow py-5 px-4 w-[19.33%]">crm tradicional</th>
                  <th className="lp-eyebrow py-5 px-4 w-[19.33%]">planilhas</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr key={r.label} style={{ borderBottom: '1px solid var(--lp-line)' }}>
                    <td className="py-4 text-[14px]" style={{ color: 'var(--lp-ink)' }}>{r.label}</td>
                    <td
                      className="py-4 px-4 text-center"
                      style={{
                        background: 'rgba(47,201,175,0.04)',
                        borderLeft: '1px solid var(--lp-accent)',
                        borderRight: '1px solid var(--lp-accent)',
                        ...(i === ROWS.length - 1 ? { borderBottom: '1px solid var(--lp-accent)' } : {}),
                      }}
                    >
                      <div className="flex justify-center"><Mark v={r.slo} /></div>
                    </td>
                    <td className="py-4 px-4 text-center"><div className="flex justify-center"><Mark v={r.crm} /></div></td>
                    <td className="py-4 px-4 text-center"><div className="flex justify-center"><Mark v={r.sheet} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
