import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { SlotiSymbol } from './SlotiSymbol';

const NAV: { label: string; href: string; route: boolean }[] = [
  { label: 'Início',          href: '/',              route: true },
  { label: 'Como Funciona',   href: '#como-funciona', route: false },
  { label: 'Funcionalidades', href: '/presentation',  route: true },
  { label: 'Comparativo',     href: '#comparativo',   route: false },
  { label: 'Planos',          href: '/planos',        route: true },
  { label: 'Blog',            href: '/blog',          route: true },
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
        background: scrolled ? 'rgba(250, 248, 244, 0.65)' : 'transparent',
        backdropFilter: scrolled ? 'saturate(140%) blur(10px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(140%) blur(10px)' : 'none',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 h-16 md:h-20 flex items-center justify-between">
        {/* Logo — isolated, no background */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Slotimob, ir para o início">
          <SlotiSymbol size={30} />
          <span className="lp-display text-[24px] md:text-[26px] leading-none" style={{ color: 'var(--lp-ink)' }}>
            slotimob<span style={{ color: 'var(--lp-accent)' }}>.</span>
          </span>
        </Link>

        {/* Desktop — floating pill */}
        <div className="hidden md:flex items-center">
          <nav className="lp-pill" aria-label="Navegação principal">
            {NAV.map((n) =>
              n.route ? (
                <Link key={n.href} to={n.href} className="lp-pill-link">
                  {n.label}
                </Link>
              ) : (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={(e) => onAnchor(e, n.href)}
                  className="lp-pill-link"
                >
                  {n.label}
                </a>
              )
            )}

            <span className="lp-pill-divider" aria-hidden="true" />

            <Link to="/auth" className="lp-pill-link">
              entrar
            </Link>

            <Link to="/checkout?plan=pro&trial=true" className="lp-btn lp-btn-primary">
              começar grátis
            </Link>
          </nav>
        </div>

        {/* Mobile hamburger */}
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
