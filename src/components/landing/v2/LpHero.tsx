import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { useEarlyAdopterCount } from '@/hooks/useEarlyAdopterCount';

export function LpHero() {
  const { slots } = useEarlyAdopterCount();
  const proRemaining = slots.pro?.remaining ?? null;

  return (
    <section className="relative pt-32 md:pt-44 pb-20 md:pb-28 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">

        {/* Top meta row */}
        <Reveal>
          <div className="flex items-center justify-between mb-12 md:mb-20">
            <span className="lp-eyebrow">01 — gestão imobiliária</span>
            <span className="hidden md:inline lp-eyebrow">índice / 2026</span>
          </div>
        </Reveal>

        <div className="grid grid-cols-12 gap-x-6 gap-y-10">
          {/* Headline — asymmetric, occupies cols 1..10 */}
          <div className="col-span-12 lg:col-span-11 lg:col-start-1">
            <Reveal>
              <h1
                className="lp-display"
                style={{ fontSize: 'clamp(2.6rem, 8vw, 7rem)' }}
              >
                a gestão imobiliária
                <br />
                inteira.{' '}
                <em
                  className="lp-serif"
                  style={{ fontStyle: 'italic', color: 'var(--lp-accent)', fontWeight: 300 }}
                >
                  um único
                </em>
                <br />
                sistema.
              </h1>
            </Reveal>
          </div>

          {/* Subcopy block — pulled to right column for editorial asymmetry */}
          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            <Reveal delay={120}>
              <p
                className="text-[15px] md:text-[17px] leading-relaxed"
                style={{ color: 'var(--lp-ink-soft)', maxWidth: '38ch' }}
              >
                CRM, financeiro, contratos, WhatsApp e IA — desenhados em conjunto para
                corretores autônomos e imobiliárias que cansaram de operar em dez abas.
              </p>
            </Reveal>
          </div>

          {/* CTAs — left column */}
          <div className="col-span-12 lg:col-span-6 lg:col-start-1 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Reveal delay={200}>
              <Link to="/auth?trial=pro" className="lp-btn lp-btn-primary">
                testar 14 dias de pro grátis
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </Reveal>
            <Reveal delay={260}>
              <a
                href="#demo"
                className="lp-btn lp-btn-ghost"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                ver demonstração
              </a>
            </Reveal>
          </div>

          {/* Credibility row */}
          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            <Reveal delay={320}>
              <div className="flex flex-col gap-2">
                <p className="lp-eyebrow">crédito</p>
                <div className="flex items-center gap-3 text-[13px]" style={{ color: 'var(--lp-ink-soft)' }}>
                  <span className="inline-flex w-1.5 h-1.5 rounded-full" style={{ background: 'var(--lp-accent)' }} />
                  trial pro de 14 dias · sem cartão de crédito
                </div>
                {proRemaining !== null && proRemaining > 0 && (
                  <div className="flex items-center gap-3 text-[13px]" style={{ color: 'var(--lp-ink-soft)' }}>
                    <span className="inline-flex w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#C0392B' }} />
                    early adopter: {proRemaining} {proRemaining === 1 ? 'vaga restante' : 'vagas restantes'} no plano pro
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>

        {/* Specimen frame mockup */}
        <Reveal delay={420}>
          <div className="mt-20 md:mt-28 relative">
            <div className="absolute -top-4 left-0 lp-eyebrow">fig. 01 — painel slotimob</div>
            <div
              className="lp-card overflow-hidden shadow-[0_30px_80px_-40px_rgba(22,21,19,0.35)]"
              style={{ transform: 'rotate(-0.4deg)' }}
            >
              <HeroMock />
            </div>
            <div className="absolute -bottom-4 right-0 lp-eyebrow hidden md:block">/ tempo real</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function HeroMock() {
  return (
    <div className="bg-white">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'var(--lp-line)' }}>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#E2DED5' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#E2DED5' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#E2DED5' }} />
        </div>
        <span className="mx-auto text-[11px]" style={{ color: 'var(--lp-mute)' }}>app.slotimob.com.br/dashboard</span>
      </div>

      <div className="grid grid-cols-12 gap-0 min-h-[360px] md:min-h-[480px]">
        {/* Sidebar */}
        <aside className="col-span-2 border-r p-3 hidden md:block" style={{ borderColor: 'var(--lp-line)', background: 'var(--lp-bg-alt)' }}>
          <div className="space-y-2.5">
            {['dashboard', 'crm', 'imóveis', 'financeiro', 'contratos', 'agenda', 'whatsapp'].map((l, i) => (
              <div key={l} className={`text-[11px] py-1.5 px-2 rounded ${i === 0 ? 'font-medium' : ''}`}
                style={{
                  color: i === 0 ? 'var(--lp-ink)' : 'var(--lp-ink-soft)',
                  background: i === 0 ? 'rgba(30,77,59,0.08)' : 'transparent',
                }}>
                {l}
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-10 p-5 md:p-7">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="lp-serif text-2xl" style={{ color: 'var(--lp-ink)' }}>panorama</h3>
            <span className="lp-eyebrow">março / 2026</span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { l: 'vgv ativo', v: 'R$ 12,4M' },
              { l: 'negociações', v: '47' },
              { l: 'receita', v: 'R$ 84,2k' },
              { l: 'taxa ocupação', v: '93%' },
            ].map((k) => (
              <div key={k.l} className="border-t pt-3" style={{ borderColor: 'var(--lp-line)' }}>
                <p className="lp-eyebrow mb-1.5">{k.l}</p>
                <p className="lp-serif text-xl md:text-2xl" style={{ color: 'var(--lp-ink)' }}>{k.v}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-7 border rounded p-4" style={{ borderColor: 'var(--lp-line)' }}>
              <div className="flex justify-between items-baseline mb-3">
                <p className="text-[12px] font-medium">pipeline · vendas</p>
                <span className="lp-eyebrow">12 negócios</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { s: 'novos', n: 6, k: ['M. Souza', 'J. Pereira'] },
                  { s: 'proposta', n: 4, k: ['A. Lima', 'R. Castro'] },
                  { s: 'fechando', n: 2, k: ['C. Mendes'] },
                ].map((c) => (
                  <div key={c.s}>
                    <div className="flex justify-between text-[10px] mb-1.5" style={{ color: 'var(--lp-mute)' }}>
                      <span>{c.s}</span><span>{c.n}</span>
                    </div>
                    {c.k.map((n) => (
                      <div key={n} className="text-[10px] border rounded p-1.5 mb-1.5"
                        style={{ borderColor: 'var(--lp-line)', background: 'var(--lp-bg)' }}>
                        <p className="font-medium" style={{ color: 'var(--lp-ink)' }}>{n}</p>
                        <p style={{ color: 'var(--lp-mute)' }}>apto 2q · R$ 420k</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-5 border rounded p-4" style={{ borderColor: 'var(--lp-line)' }}>
              <p className="text-[12px] font-medium mb-3">financeiro · março</p>
              {[
                { l: 'aluguel apt 301', v: 'R$ 3.200', t: 'recebido' },
                { l: 'condomínio sl 12', v: 'R$ 980', t: 'a pagar' },
                { l: 'comissão venda', v: 'R$ 12.500', t: 'previsto' },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between py-2 border-b text-[11px]"
                  style={{ borderColor: 'var(--lp-line)' }}>
                  <div>
                    <p style={{ color: 'var(--lp-ink)' }}>{r.l}</p>
                    <p className="lp-eyebrow" style={{ fontSize: 9 }}>{r.t}</p>
                  </div>
                  <span className="lp-num" style={{ color: 'var(--lp-ink)' }}>{r.v}</span>
                </div>
              ))}
              <div className="pt-3 flex justify-between items-baseline">
                <span className="lp-eyebrow">resultado</span>
                <span className="lp-serif text-lg" style={{ color: 'var(--lp-accent)' }}>+R$ 14,7k</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
