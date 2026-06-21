import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SlotiLogo } from '@/components/SlotiLogo';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, LogIn, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import TrustBar from '@/components/marketing/TrustBar';

type NavLink =
  | { label: string; href: string; isAnchor: true }
  | { label: string; href: string; isAnchor?: false };

const navLinks: NavLink[] = [
  { label: 'Produto', href: '#features', isAnchor: true },
  { label: 'Planos', href: '/planos' },
  { label: 'Blog', href: '/blog' },
  { label: 'Sobre', href: '/sobre' },
  { label: 'Contato', href: '/contato' },
];

export function LandingHeader({ showTrustBar = false }: { showTrustBar?: boolean } = {}) {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const linkClass =
    'text-sm font-medium px-3 py-2 rounded-md transition-colors text-muted-foreground hover:text-foreground';

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {showTrustBar && <TrustBar />}
      <header
        className={cn(
          'transition-all duration-300',
          scrolled
            ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border'
            : 'bg-background/80 backdrop-blur-sm'
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center shrink-0">
              <SlotiLogo className="h-8 w-auto" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) =>
                link.isAnchor ? (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleAnchor(e, link.href)}
                    className={linkClass}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.label} to={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                )
              )}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              {!loading && (
                user ? (
                  <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                    <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 mr-2" />Acessar Painel</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="ghost" size="sm" className="text-foreground hover:bg-muted">
                      <Link to="/auth"><LogIn className="h-4 w-4 mr-2" />Entrar</Link>
                    </Button>
                    <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-md">
                      <Link to="/checkout?plan=pro">Experimentar Grátis</Link>
                    </Button>
                  </>
                )
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-md"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 top-16 z-40 bg-background overflow-y-auto">
            <nav className="container mx-auto px-4 py-6 flex flex-col gap-1">
              {navLinks.map((link) =>
                link.isAnchor ? (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleAnchor(e, link.href)}
                    className="py-3 text-foreground font-semibold text-base border-b border-border"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 text-foreground font-semibold text-base border-b border-border"
                  >
                    {link.label}
                  </Link>
                )
              )}

              <div className="flex flex-col gap-3 pt-6">
                {!loading && !user && (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/auth" onClick={() => setMobileOpen(false)}>
                        <LogIn className="h-4 w-4 mr-2" />Entrar
                      </Link>
                    </Button>
                    <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                      <Link to="/checkout?plan=pro" onClick={() => setMobileOpen(false)}>
                        Experimentar Grátis
                      </Link>
                    </Button>
                  </>
                )}
                {!loading && user && (
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />Acessar Painel
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </div>
  );
}
