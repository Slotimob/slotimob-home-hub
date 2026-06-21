import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';
import { PricingSection } from '../PricingSection';

export function LpPricing() {
  return (
    <section id="planos" className="py-24 md:py-36" style={{ borderTop: '1px solid var(--lp-line)' }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-4">
            <Reveal>
              <p className="lp-eyebrow">06 — planos</p>
            </Reveal>
          </div>
          <div className="col-span-12 md:col-span-8">
            <Reveal delay={80}>
              <h2 className="lp-display text-[40px] md:text-[80px]">
                preço transparente.
                <br />
                <em className="lp-serif" style={{ fontStyle: 'italic', color: 'var(--lp-accent)' }}>sem</em> surpresa.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-6 max-w-[55ch] text-[15px] md:text-[16px]" style={{ color: 'var(--lp-ink-soft)' }}>
                Comece grátis com o plano Start (inclui 7 dias do Pro). Faça upgrade só
                quando fizer sentido para o seu volume.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Reuses the existing dynamic pricing component (toggle, EA realtime, checkout links). */}
        <div className="lp-pricing-wrap">
          <PricingSection />
        </div>

        <Reveal delay={200}>
          <p className="mt-10 text-center text-[12px]" style={{ color: 'var(--lp-mute)' }}>
            add-ons disponíveis · usuário extra · pack +50 unidades · créditos whatsapp · créditos ia
          </p>
        </Reveal>
      </div>
    </section>
  );
}
