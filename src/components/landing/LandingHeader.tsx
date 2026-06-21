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
  Filter,
  Bot,
  Calculator,
  Shield,
  UserCheck,
  BookOpen,
  Briefcase,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TrustBar from '@/components/marketing/TrustBar';

/* ── Mega-menu data ─────────────────────────────────────────── */

const solucoesColumns = [
  {
    title: 'Módulos',
    items: [
      { icon: Users, label: 'CRM & Vendas', desc: 'Funil visual, distribuição de clientes e comissões', href: '#modulo-crm' },
      { icon: Wallet, label: 'Gestão Financeira', desc: 'Conciliação bancária, DRE e cobranças automáticas', href: '#modulo-financeiro' },
      { icon: Building2, label: 'Controle de Imóveis', desc: 'Portfólio, documentos e saúde do patrimônio', href: '#modulo-unidades' },
    ],
  },
];

const publicoItems = [
  { icon: Briefcase, label: 'Para Imobiliárias', desc: 'Escale sua operação com controle total', href: '#segmentos' },
  { icon: UserCheck, label: 'Para Corretores Autônomos', desc: 'Sua agência no bolso, pronta para fechar', href: '#segmentos' },
  { icon: Home, label: 'Para Proprietários', desc: 'Transparência e rentabilidade do patrimônio', href: '#segmentos' },
];

const recursosItems = [
  { icon: MessageSquare, label: 'WhatsApp Integrado', desc: 'Converse sem sair do sistema', href: '#modulo-whatsapp' },
  { icon: Calculator, label: 'Calculadoras', desc: 'Financiamento e impostos na hora', href: '#modulo-calculadoras' },
  { icon: Bot, label: 'IA de Resumos', desc: 'Perfil do cliente gerado automaticamente', href: '#modulo-whatsapp' },
  { icon: BookOpen, label: 'Blog', desc: 'Conteúdo para o mercado imobiliário', href: '/blog', isExternal: true },
];

/* ── Component ──────────────────────────────────────────────── */

export function LandingHeader({ showTrustBar = false }: { showTrustBar?: boolean } = {}) {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);

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
    setActiveDropdown(null);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const openDropdown = (id: string) => { clearTimeout(dropdownTimeout.current); setActiveDropdown(id); };
  const closeDropdown = () => { dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 200); };
  const toggleMobileAccordion = (id: string) => setMobileAccordion(prev => prev === id ? null : id);

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

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            <DropdownTrigger label="Soluções" id="solucoes" activeDropdown={activeDropdown} onOpen={openDropdown} onClose={closeDropdown}>
              <div className="w-[380px] bg-popover border border-border rounded-xl shadow-2xl p-4 space-y-1">
                {solucoesColumns[0].items.map((item) => (
                  <DropdownLink key={item.label} item={item} onAnchor={handleAnchor} />
                ))}
              </div>
            </DropdownTrigger>

            <DropdownTrigger label="Público" id="publico" activeDropdown={activeDropdown} onOpen={openDropdown} onClose={closeDropdown}>
              <div className="w-[380px] bg-popover border border-border rounded-xl shadow-2xl p-4 space-y-1">
                {publicoItems.map((item) => (
                  <DropdownLink key={item.label} item={item} onAnchor={handleAnchor} />
                ))}
              </div>
            </DropdownTrigger>

            <DropdownTrigger label="Recursos" id="recursos" activeDropdown={activeDropdown} onOpen={openDropdown} onClose={closeDropdown}>
              <div className="w-[380px] bg-popover border border-border rounded-xl shadow-2xl p-4 space-y-1">
                {recursosItems.map((item) => (
                  item.isExternal ? (
                    <Link key={item.label} to={item.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </Link>
                  ) : (
                    <DropdownLink key={item.label} item={item} onAnchor={handleAnchor} />
                  )
                ))}
              </div>
            </DropdownTrigger>

            <a href="#pricing" onClick={(e) => handleAnchor(e, '#pricing')} className="text-sm font-medium px-3 py-2 rounded-md transition-colors text-muted-foreground hover:text-foreground">
              Preços
            </a>
          </nav>

          {/* ── Desktop CTAs ── */}
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
                    <Link to="/auth">Experimentar Grátis</Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button className="md:hidden p-2 rounded-md" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background overflow-y-auto">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-2">
            <MobileAccordion id="solucoes" label="Soluções" active={mobileAccordion} onToggle={toggleMobileAccordion}>
              {solucoesColumns[0].items.map((item) => (
                <MobileNavItem key={item.label} item={item} onAnchor={handleAnchor} onClose={() => setMobileOpen(false)} />
              ))}
            </MobileAccordion>

            <MobileAccordion id="publico" label="Público" active={mobileAccordion} onToggle={toggleMobileAccordion}>
              {publicoItems.map((item) => (
                <MobileNavItem key={item.label} item={item} onAnchor={handleAnchor} onClose={() => setMobileOpen(false)} />
              ))}
            </MobileAccordion>

            <MobileAccordion id="recursos" label="Recursos" active={mobileAccordion} onToggle={toggleMobileAccordion}>
              {recursosItems.map((item) => (
                item.isExternal ? (
                  <Link key={item.label} to={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted">
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </Link>
                ) : (
                  <MobileNavItem key={item.label} item={item} onAnchor={handleAnchor} onClose={() => setMobileOpen(false)} />
                )
              ))}
            </MobileAccordion>

            <a href="#pricing" onClick={(e) => handleAnchor(e, '#pricing')} className="py-3 text-foreground font-semibold text-base border-b border-border">
              Preços
            </a>

            <div className="flex flex-col gap-3 pt-4 mt-2">
              {!loading && !user && (
                <>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/auth" onClick={() => setMobileOpen(false)}><LogIn className="h-4 w-4 mr-2" />Entrar</Link>
                  </Button>
                  <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                    <Link to="/auth" onClick={() => setMobileOpen(false)}>Experimentar Grátis</Link>
                  </Button>
                </>
              )}
              {!loading && user && (
                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}><LayoutDashboard className="h-4 w-4 mr-2" />Acessar Painel</Link>
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ── Sub-components ── */

function DropdownTrigger({ label, id, activeDropdown, onOpen, onClose, children }: {
  label: string; id: string; activeDropdown: string | null; onOpen: (id: string) => void; onClose: () => void; children: React.ReactNode;
}) {
  const isOpen = activeDropdown === id;
  return (
    <div className="relative" onMouseEnter={() => onOpen(id)} onMouseLeave={onClose}>
      <button className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md transition-colors text-muted-foreground hover:text-foreground">
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
      </button>
      <div className={cn(
        'absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-200',
        isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'
      )}>
        {children}
      </div>
    </div>
  );
}

function DropdownLink({ item, onAnchor }: {
  item: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string; href: string };
  onAnchor: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const Icon = item.icon;
  return (
    <a href={item.href} onClick={(e) => onAnchor(e, item.href)} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group">
      <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        <p className="text-xs text-muted-foreground">{item.desc}</p>
      </div>
    </a>
  );
}

function MobileAccordion({ id, label, active, onToggle, children }: {
  id: string; label: string; active: string | null; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  const isOpen = active === id;
  return (
    <>
      <button onClick={() => onToggle(id)} className="flex items-center justify-between w-full py-3 text-foreground font-semibold text-base border-b border-border">
        {label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && <div className="space-y-1 pb-3 pl-2">{children}</div>}
    </>
  );
}

function MobileNavItem({ item, onAnchor, onClose }: {
  item: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string; href: string };
  onAnchor: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  onClose: () => void;
}) {
  return (
    <a
      href={item.href}
      onClick={(e) => { onAnchor(e, item.href); onClose(); }}
      className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted"
    >
      <item.icon className="h-4 w-4 text-primary shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        <p className="text-xs text-muted-foreground">{item.desc}</p>
      </div>
    </a>
  );
}
