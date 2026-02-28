import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SlotiLogo } from '@/components/SlotiLogo';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  LogIn,
  Menu,
  X,
  ChevronDown,
  Users,
  MessageSquare,
  Wallet,
  BarChart3,
  Building2,
  Shuffle,
  Filter,
  Phone,
  Bot,
  FileText,
  Calculator,
  Briefcase,
  Home as HomeIcon,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Mega-menu data ─────────────────────────────────────────── */

const megaMenuColumns = [
  {
    title: 'Gestão de Leads',
    items: [
      { icon: Users, label: 'CRM Imobiliário', desc: 'Pipeline visual de negociações', href: '#features' },
      { icon: Shuffle, label: 'Roleta de Leads', desc: 'Distribuição automática para equipe', href: '#features' },
      { icon: Filter, label: 'Funil de Vendas', desc: 'Acompanhe cada etapa do deal', href: '#features' },
    ],
  },
  {
    title: 'Comunicação',
    items: [
      { icon: MessageSquare, label: 'WhatsApp Integrado', desc: 'Chat unificado com IA', href: '#features' },
      { icon: Phone, label: 'Chat Multicanal', desc: 'Atenda de qualquer lugar', href: '#features' },
      { icon: Bot, label: 'Automação com IA', desc: 'Respostas inteligentes 24/7', href: '#features' },
    ],
  },
  {
    title: 'Financeiro & Contratos',
    items: [
      { icon: Wallet, label: 'Gestão de Aluguéis', desc: 'Controle total de recebíveis', href: '#features' },
      { icon: FileText, label: 'Contratos Digitais', desc: 'Geração e assinatura online', href: '#features' },
      { icon: BarChart3, label: 'Relatórios & DRE', desc: 'Visão financeira completa', href: '#features' },
    ],
  },
];

const audienceLinks = [
  { label: 'Corretores', desc: 'Venda mais com CRM conversacional', href: '/lp/corretores', icon: UserCheck },
  { label: 'Proprietários', desc: 'Patrimônio gerido com inteligência', href: '/lp/proprietarios', icon: HomeIcon },
  { label: 'Imobiliárias', desc: 'Escale com ordem e supervisão', href: '/lp/imobiliarias', icon: Building2 },
];

const simpleLinks = [
  { label: 'Preços', href: '#pricing' },
  { label: 'Blog', href: '/blog', external: true },
];

/* ── Component ──────────────────────────────────────────────── */

export function LandingHeader() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const megaTimeout = useRef<ReturnType<typeof setTimeout>>();
  const audienceTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Mobile accordion states
  const [mobileMegaOpen, setMobileMegaOpen] = useState(false);
  const [mobileAudienceOpen, setMobileAudienceOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    setMobileOpen(false);
    setMegaOpen(false);
    setAudienceOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const textColor = scrolled ? 'text-foreground' : 'text-primary-foreground';
  const textMuted = scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-primary-foreground/80 hover:text-primary-foreground';

  /* ── Hover handlers with delay ── */
  const openMega = () => { clearTimeout(megaTimeout.current); setMegaOpen(true); };
  const closeMega = () => { megaTimeout.current = setTimeout(() => setMegaOpen(false), 200); };
  const openAudience = () => { clearTimeout(audienceTimeout.current); setAudienceOpen(true); };
  const closeAudience = () => { audienceTimeout.current = setTimeout(() => setAudienceOpen(false), 200); };

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
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <SlotiLogo className="h-8 w-auto" />
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {/* Funcionalidades — Mega Menu */}
            <div
              className="relative"
              onMouseEnter={openMega}
              onMouseLeave={closeMega}
            >
              <button
                className={cn(
                  'flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md transition-colors',
                  textMuted
                )}
              >
                Funcionalidades
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', megaOpen && 'rotate-180')} />
              </button>

              {/* Mega dropdown */}
              <div
                className={cn(
                  'absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-200',
                  megaOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'
                )}
              >
                <div className="w-[700px] bg-popover border border-border rounded-xl shadow-2xl p-6 grid grid-cols-3 gap-6">
                  {megaMenuColumns.map((col) => (
                    <div key={col.title}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        {col.title}
                      </p>
                      <div className="space-y-1">
                        {col.items.map((item) => (
                          <a
                            key={item.label}
                            href={item.href}
                            onClick={(e) => handleAnchor(e, item.href)}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/10 transition-colors group"
                          >
                            <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Para quem é? */}
            <div
              className="relative"
              onMouseEnter={openAudience}
              onMouseLeave={closeAudience}
            >
              <button
                className={cn(
                  'flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md transition-colors',
                  textMuted
                )}
              >
                Para quem é?
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', audienceOpen && 'rotate-180')} />
              </button>

              <div
                className={cn(
                  'absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-200',
                  audienceOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'
                )}
              >
                <div className="w-[320px] bg-popover border border-border rounded-xl shadow-2xl p-3 space-y-1">
                  {audienceLinks.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/10 transition-colors group"
                    >
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Simple links */}
            {simpleLinks.map((link) =>
              link.external ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className={cn('text-sm font-medium px-3 py-2 rounded-md transition-colors', textMuted)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleAnchor(e, link.href)}
                  className={cn('text-sm font-medium px-3 py-2 rounded-md transition-colors', textMuted)}
                >
                  {link.label}
                </a>
              )
            )}
          </nav>

          {/* ── Desktop CTAs ── */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && (
              user ? (
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
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
                    size="sm"
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
                  <Button asChild size="sm" className="bg-primary hover:bg-primary/90 font-semibold shadow-lg">
                    <Link to="/auth">Experimentar Grátis</Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden p-2 rounded-md"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X className={cn('h-6 w-6', textColor)} />
            ) : (
              <Menu className={cn('h-6 w-6', textColor)} />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background/98 backdrop-blur-md overflow-y-auto">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-2">
            {/* Funcionalidades accordion */}
            <button
              onClick={() => setMobileMegaOpen(!mobileMegaOpen)}
              className="flex items-center justify-between w-full py-3 text-foreground font-semibold text-base border-b border-border"
            >
              Funcionalidades
              <ChevronDown className={cn('h-4 w-4 transition-transform', mobileMegaOpen && 'rotate-180')} />
            </button>
            {mobileMegaOpen && (
              <div className="space-y-4 pb-3 pl-2">
                {megaMenuColumns.map((col) => (
                  <div key={col.title}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-3">
                      {col.title}
                    </p>
                    {col.items.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        onClick={(e) => handleAnchor(e, item.href)}
                        className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-accent/10"
                      >
                        <item.icon className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Para quem é? accordion */}
            <button
              onClick={() => setMobileAudienceOpen(!mobileAudienceOpen)}
              className="flex items-center justify-between w-full py-3 text-foreground font-semibold text-base border-b border-border"
            >
              Para quem é?
              <ChevronDown className={cn('h-4 w-4 transition-transform', mobileAudienceOpen && 'rotate-180')} />
            </button>
            {mobileAudienceOpen && (
              <div className="space-y-1 pb-3 pl-2">
                {audienceLinks.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-accent/10"
                  >
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Simple links */}
            {simpleLinks.map((link) =>
              link.external ? (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 text-foreground font-semibold text-base border-b border-border"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => { handleAnchor(e, link.href); }}
                  className="py-3 text-foreground font-semibold text-base border-b border-border"
                >
                  {link.label}
                </a>
              )
            )}

            {/* Mobile CTAs */}
            <div className="flex flex-col gap-3 pt-4 mt-2">
              {!loading && !user && (
                <>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/auth" onClick={() => setMobileOpen(false)}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </Link>
                  </Button>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90 font-semibold">
                    <Link to="/auth" onClick={() => setMobileOpen(false)}>
                      Experimentar Grátis
                    </Link>
                  </Button>
                </>
              )}
              {!loading && user && (
                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
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
