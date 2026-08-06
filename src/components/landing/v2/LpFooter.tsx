import { Link } from 'react-router-dom';
import { SlotiSymbol } from './SlotiSymbol';
import { WhatsAppButton } from '@/components/WhatsAppButton';


const COLS = [
  {
    title: 'produto',
    links: [
      { l: 'módulos', h: '#modulos' },
      { l: 'demonstração', h: '#demo' },
      { l: 'comparativo', h: '#comparativo' },
      { l: 'planos', h: '#planos' },
    ],
  },
  {
    title: 'recursos',
    links: [
      { l: 'blog', h: '/blog', ext: true },
      { l: 'tour do produto', h: '/presentation', ext: true },
      { l: 'sobre', h: '/sobre', ext: true },
      { l: 'central de ajuda', h: '/auth', ext: true },
    ],
  },
  {
    title: 'legal',
    links: [
      { l: 'termos de uso', h: '/legal?tab=terms', ext: true },
      { l: 'política de privacidade', h: '/legal?tab=privacy', ext: true },
      { l: 'política de reembolso', h: '/legal?tab=refund', ext: true },
    ],
  },
];

export function LpFooter() {
  const year = new Date().getFullYear();
  const onAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="lp-dark py-16 md:py-24">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <SlotiSymbol size={32} />
              <span className="lp-display text-[28px]" style={{ color: 'var(--lp-bg)' }}>
                slotimob<span style={{ color: 'var(--lp-accent)' }}>.</span>
              </span>
            </Link>
            <p className="mt-4 text-[14px] max-w-[36ch]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              A gestão imobiliária inteira em um só sistema. Para donos de imóveis, corretores e imobiliárias.
            </p>
          </div>

          {COLS.map((c) => (
            <div key={c.title} className="col-span-6 md:col-span-2">
              <p className="lp-eyebrow mb-4">{c.title}</p>
              <ul className="space-y-2.5">
                {c.links.map((lk) => (
                  <li key={lk.l}>
                    {lk.ext ? (
                      <Link to={lk.h} className="lp-link text-[13px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {lk.l}
                      </Link>
                    ) : (
                      <a
                        href={lk.h}
                        onClick={(e) => onAnchor(e, lk.h)}
                        className="lp-link text-[13px]"
                        style={{ color: 'rgba(255,255,255,0.75)' }}
                      >
                        {lk.l}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-16 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[12px]"
          style={{ borderTop: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)' }}
        >
          <p>© {year} slotimob — todos os direitos reservados.</p>
          <p>Nascido em Curitiba · 🇧🇷</p>
        </div>
      </div>

      <WhatsAppButton />
    </footer>
  );
}
