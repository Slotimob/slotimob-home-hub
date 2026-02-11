import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SlotiLogo } from '@/components/SlotiLogo';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, LogIn, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'Funcionalidades', href: '#features' },
  { label: 'Demonstração', href: '#demo' },
  { label: 'Preços', href: '#pricing' },
];

export function LandingHeader() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-background/95 backdrop-blur-md shadow-lg border-b border-border'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <SlotiLogo className="h-8 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchor(e, link.href)}
                className={cn(
                  'text-sm font-medium transition-colors',
                  scrolled
                    ? 'text-muted-foreground hover:text-foreground'
                    : 'text-primary-foreground/80 hover:text-primary-foreground'
                )}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/blog"
              className={cn(
                'text-sm font-medium transition-colors',
                scrolled
                  ? 'text-muted-foreground hover:text-foreground'
                  : 'text-primary-foreground/80 hover:text-primary-foreground'
              )}
            >
              Blog
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {!loading && (
              user ? (
                <Button asChild className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                  <Link to="/dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Acessar Painel
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    className={cn(
                      scrolled
                        ? 'text-foreground hover:bg-muted'
                        : 'text-primary-foreground hover:bg-white/10'
                    )}
                  >
                    <Link to="/auth">
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </Link>
                  </Button>
                  <Button asChild className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold">
                    <Link to="/auth">Começar Grátis</Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X className={cn('h-6 w-6', scrolled ? 'text-foreground' : 'text-primary-foreground')} />
            ) : (
              <Menu className={cn('h-6 w-6', scrolled ? 'text-foreground' : 'text-primary-foreground')} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background/98 backdrop-blur-md border-b border-border">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchor(e, link.href)}
                className="text-foreground font-medium py-2"
              >
                {link.label}
              </a>
            ))}
            <a href="/blog" className="text-foreground font-medium py-2">Blog</a>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              {!loading && !user && (
                <>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/auth">
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </Link>
                  </Button>
                  <Button asChild className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <Link to="/auth">Começar Grátis</Link>
                  </Button>
                </>
              )}
              {!loading && user && (
                <Button asChild className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                  <Link to="/dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Acessar Painel
                  </Link>
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
