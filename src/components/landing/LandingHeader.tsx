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
  Shield,
  Home as HomeIcon,
  UserCheck,
  BookOpen,
  HelpCircle,
  Briefcase,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Mega-menu data ─────────────────────────────────────────── */

const solucoesColumns = [
  {
    title: 'CRM & Vendas',
    items: [
      { icon: Users, label: 'CRM Imobiliário', desc: 'Pipeline visual com Kanban drag & drop', href: '#modulo-crm' },
      { icon: Shuffle, label: 'Roleta de Leads', desc: 'Distribuição Round Robin automática', href: '#modulo-crm' },
      { icon: Filter, label: 'Funil Personalizável', desc: 'Crie etapas sob medida para seu processo', href: '#modulo-crm' },
    ],
  },
  {
    title: 'Financeiro & Contratos',
    items: [
      { icon: Wallet, label: 'Hub Financeiro', desc: 'Fluxo de caixa, DRE e conciliação bancária', href: '#modulo-financeiro' },
      { icon: FileText, label: 'Contratos Digitais', desc: 'Templates inteligentes com preenchimento automático', href: '#modulo-financeiro' },
      { icon: BarChart3, label: 'Relatórios & DRE', desc: 'Visão financeira completa por unidade', href: '#modulo-financeiro' },
    ],
  },
  {
    title: 'Gestão de Ativos',
    items: [
      { icon: Building2, label: 'Propriedades & Unidades', desc: 'Inventário organizado com galeria e docs', href: '#modulo-unidades' },
      { icon: Shield, label: 'Saúde do Portfólio', desc: 'Alertas de vencimento e inadimplência', href: '#modulo-unidades' },
    ],
  },
];

const recursosItems = [
  { icon: MessageSquare, label: 'WhatsApp Integrado', desc: 'Chat unificado com IA e histórico', href: '#modulo-whatsapp' },
  { icon: Bot, label: 'Automação com IA', desc: 'Resumos inteligentes e respostas 24/7', href: '#modulo-whatsapp' },
  { icon: Calculator, label: 'Simuladores', desc: 'Financiamento e cálculos fiscais', href: '#modulo-calculadoras' },
  { icon: Phone, label: 'Multicanal', desc: 'Facebook Leads, portais e mais', href: '#features' },
];

const empresaItems = [
  { icon: BookOpen, label: 'Blog', desc: 'Conteúdo para o mercado imobiliário', href: '/blog', isExternal: true },
  { icon: HelpCircle, label: 'Central de Ajuda', desc: 'Tutoriais e treinamentos', href: '#features' },
  { icon: Award, label: 'Para Corretores', desc: 'CRM conversacional de elite', href: '/lp/corretores', isExternal: true },
  { icon: Briefcase, label: 'Para Imobiliárias', desc: 'Escale com ordem e supervisão', href: '/lp/imobiliarias', isExternal: true },
];

/* ── Component ──────────────────────────────────────────────── */

export function LandingHeader() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Mobile accordion
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

  const toggleMobileAccordion = (id: string) => {
    setMobileAccordion(prev => prev === id ? null : id);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
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
            {/* Soluções — Wide Mega Menu */}
            <DropdownTrigger
              label="Soluções"
              id="solucoes"
              activeDropdown={activeDropdown}
              onOpen={openDropdown}
              onClose={closeDropdown}
            >
              <div className="w-[720px] bg-popover border border-border rounded-xl shadow-2xl p-6 grid grid-cols-3 gap-6">
                {solucoesColumns.map((col) => (
                  <div key={col.title}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {col.title}
                    </p>
                    <div className="space-y-1">
                      {col.items.map((item) => (
                        <DropdownLink key={item.label} item={item} onAnchor={handleAnchor} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DropdownTrigger>

            {/* Recursos */}
            <DropdownTrigger
              label="Recursos"
              id="recursos"
              activeDropdown={activeDropdown}
              onOpen={openDropdown}
              onClose={closeDropdown}
            >
              <div className="w-[340px] bg-popover border border-border rounded-xl shadow-2xl p-3 space-y-1">
                {recursosItems.map((item) => (
                  <DropdownLink key={item.label} item={item} onAnchor={handleAnchor} />
                ))}
              </div>
            </DropdownTrigger>

            {/* Empresa */}
            <DropdownTrigger
              label="Empresa"
              id="empresa"
              activeDropdown={activeDropdown}
              onOpen={openDropdown}
              onClose={closeDropdown}
            >
              <div className="w-[340px] bg-popover border border-border rounded-xl shadow-2xl p-3 space-y-1">
                {empresaItems.map((item) => (
                  item.isExternal ? (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                    >
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

            {/* Preços */}
            <a
              href="#pricing"
              onClick={(e) => handleAnchor(e, '#pricing')}
              className="text-sm font-medium px-3 py-2 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            >
              Preços
            </a>
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
                    className="text-foreground hover:bg-muted"
                  >
                    <Link to="/auth">
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="bg-primary hover:bg-primary/90 font-semibold shadow-md">
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
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background overflow-y-auto">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-2">
            <MobileAccordion
              id="solucoes"
              label="Soluções"
              active={mobileAccordion}
              onToggle={toggleMobileAccordion}
            >
              {solucoesColumns.map((col) => (
                <div key={col.title}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-3">
                    {col.title}
                  </p>
                  {col.items.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={(e) => handleAnchor(e, item.href)}
                      className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted"
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
            </MobileAccordion>

            <MobileAccordion
              id="recursos"
              label="Recursos"
              active={mobileAccordion}
              onToggle={toggleMobileAccordion}
            >
              {recursosItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleAnchor(e, item.href)}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted"
                >
                  <item.icon className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </a>
              ))}
            </MobileAccordion>

            <MobileAccordion
              id="empresa"
              label="Empresa"
              active={mobileAccordion}
              onToggle={toggleMobileAccordion}
            >
              {empresaItems.map((item) => (
                item.isExternal ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted"
                  >
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleAnchor(e, item.href)}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted"
                  >
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </a>
                )
              ))}
            </MobileAccordion>

            <a
              href="#pricing"
              onClick={(e) => handleAnchor(e, '#pricing')}
              className="py-3 text-foreground font-semibold text-base border-b border-border"
            >
              Preços
            </a>

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

/* ── Sub-components ── */

function DropdownTrigger({
  label,
  id,
  activeDropdown,
  onOpen,
  onClose,
  children,
}: {
  label: string;
  id: string;
  activeDropdown: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const isOpen = activeDropdown === id;
  return (
    <div className="relative" onMouseEnter={() => onOpen(id)} onMouseLeave={onClose}>
      <button
        className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md transition-colors text-muted-foreground hover:text-foreground"
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
      </button>
      <div
        className={cn(
          'absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-200',
          isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DropdownLink({
  item,
  onAnchor,
}: {
  item: { icon: React.ComponentType<{ className?: string }>; label: string; desc: string; href: string };
  onAnchor: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      onClick={(e) => onAnchor(e, item.href)}
      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group"
    >
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

function MobileAccordion({
  id,
  label,
  active,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  active: string | null;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = active === id;
  return (
    <>
      <button
        onClick={() => onToggle(id)}
        className="flex items-center justify-between w-full py-3 text-foreground font-semibold text-base border-b border-border"
      >
        {label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && <div className="space-y-1 pb-3 pl-2">{children}</div>}
    </>
  );
}
