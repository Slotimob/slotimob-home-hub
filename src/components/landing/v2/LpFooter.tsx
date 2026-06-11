import { Link } from 'react-router-dom';

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
      { l: 'central de ajuda', h: '/auth', ext: true },
    ],
  },
  {
    title: 'legal',
    links: [
      { l: 'termos de uso', h: '/legal', ext: true },
      { l: 'política de reembolso', h: '/refund-policy', ext: true },
      { l: 'privacidade', h: '/legal', ext: true },
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
    <footer className="py-16 md:py-24" style={{ borderTop: '1px solid var(--lp-line)' }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 md:col-span-5">
            <Link to="/" className="lp-serif text-3xl">
              slotimob<span style={{ color: 'var(--lp-accent)' }}>.</span>
            </Link>
            <p className="mt-4 text-[14px] max-w-[36ch]" style={{ color: 'var(--lp-ink-soft)' }}>
              A gestão imobiliária inteira em um só sistema. Para corretores e imobiliárias.
            </p>
          </div>

          {COLS.map((c) => (
            <div key={c.title} className="col-span-6 md:col-span-2">
              <p className="lp-eyebrow mb-4">{c.title}</p>
              <ul className="space-y-2.5">
                {c.links.map((lk) => (
                  <li key={lk.l}>
                    {lk.ext ? (
                      <Link to={lk.h} className="lp-link text-[13px]" style={{ color: 'var(--lp-ink-soft)' }}>
                        {lk.l}
                      </Link>
                    ) : (
                      <a
                        href={lk.h}
                        onClick={(e) => onAnchor(e, lk.h)}
                        className="lp-link text-[13px]"
                        style={{ color: 'var(--lp-ink-soft)' }}
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
          style={{ borderTop: '1px solid var(--lp-line)', color: 'var(--lp-mute)' }}
        >
          <p>© {year} slotimob — todos os direitos reservados.</p>
          <p>feito no brasil · 🇧🇷</p>
        </div>
      </div>
    </footer>
  );
}
