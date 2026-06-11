import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV = [
  { label: 'produto', href: '#modulos' },
  { label: 'demo', href: '#demo' },
  { label: 'comparativo', href: '#comparativo' },
  { label: 'planos', href: '#planos' },
];

export function LpHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const onAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setOpen(false);
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(250, 248, 244, 0.92)' : 'transparent',
        backdropFilter: scrolled ? 'saturate(140%) blur(10px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--lp-line)' : '1px solid transparent',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 h-16 md:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" aria-label="Slotimob, ir para o início">
          <span className="lp-serif text-[22px] md:text-[24px]" style={{ color: 'var(--lp-ink)' }}>
            slotimob<span style={{ color: 'var(--lp-accent)' }}>.</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-9" aria-label="Navegação principal">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={(e) => onAnchor(e, n.href)}
              className="lp-link text-[13px] tracking-wide"
              style={{ color: 'var(--lp-ink-soft)' }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth" className="lp-link text-[13px]" style={{ color: 'var(--lp-ink-soft)' }}>
            entrar
          </Link>
          <Link to="/auth?trial=pro" className="lp-btn lp-btn-primary">
            começar grátis
          </Link>
        </div>

        <button
          className="md:hidden p-2 -mr-2"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile full-screen menu */}
      <div
        className={`md:hidden fixed inset-0 top-16 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'var(--lp-bg)' }}
        aria-hidden={!open}
      >
        <div className="px-6 pt-10 pb-12 flex flex-col h-full">
          <nav className="flex flex-col gap-1" aria-label="Navegação mobile">
            {NAV.map((n, i) => (
              <a
                key={n.href}
                href={n.href}
                onClick={(e) => onAnchor(e, n.href)}
                className="lp-display text-[40px] py-3 border-b"
                style={{ borderColor: 'var(--lp-line)', color: 'var(--lp-ink)', transitionDelay: `${i * 40}ms` }}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto pt-10 flex flex-col gap-3">
            <Link to="/auth?trial=pro" className="lp-btn lp-btn-primary justify-center w-full">
              começar grátis
            </Link>
            <Link to="/auth" className="lp-btn lp-btn-ghost justify-center w-full">
              já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
