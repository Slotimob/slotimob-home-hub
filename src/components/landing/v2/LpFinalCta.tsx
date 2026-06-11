import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from './Reveal';

export function LpFinalCta() {
  return (
    <section className="lp-dark py-28 md:py-40">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <Reveal>
          <p className="lp-eyebrow mb-10">08 — começar</p>
        </Reveal>
        <Reveal delay={80}>
          <h2
            className="lp-display"
            style={{ fontSize: 'clamp(2.4rem, 8vw, 7.5rem)' }}
          >
            pare de gerenciar sua
            <br />
            carteira em{' '}
            <em className="lp-serif" style={{ fontStyle: 'italic', color: '#2FC9AF' }}>
              dez lugares.
            </em>
          </h2>
        </Reveal>
        <Reveal delay={180}>
          <div className="mt-12 flex flex-col sm:flex-row gap-4">
            <Link
              to="/auth?trial=pro"
              className="lp-btn lp-btn-primary"
              style={{ background: '#FFFFFF', color: '#0B0073' }}
            >
              testar 14 dias de pro grátis
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link to="/auth" className="lp-btn lp-btn-ghost">
              já tenho conta
            </Link>
          </div>
        </Reveal>
        <Reveal delay={260}>
          <p className="mt-8 text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            sem cartão de crédito · cancele quando quiser
          </p>
        </Reveal>
      </div>
    </section>
  );
}
