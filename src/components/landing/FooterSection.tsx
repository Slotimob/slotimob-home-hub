import { Link } from 'react-router-dom';
import { SlotiLogo } from '@/components/SlotiLogo';
import { ShieldCheck } from 'lucide-react';

type FooterLink = { label: string; href: string; isAnchor?: boolean };

const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Produto',
    links: [
      { label: 'Funcionalidades', href: '#features', isAnchor: true },
      { label: 'Planos e Preços', href: '/planos' },
      { label: 'Demonstração', href: '/demo' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre nós', href: '/sobre' },
      { label: 'Contato', href: '/contato' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Termos de Uso', href: '/termos-de-uso' },
      { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
      { label: 'Política de Reembolso', href: '/refund-policy' },
    ],
  },
];

export function FooterSection() {
  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="py-16 bg-foreground text-background/80">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <SlotiLogo className="h-10 w-auto mb-4 brightness-200" />
            <p className="text-sm text-background/60 max-w-xs mb-4">
              A plataforma completa de gestão imobiliária: CRM, financeiro, contratos e WhatsApp com IA.
            </p>
            <div className="flex items-center gap-2 text-xs text-background/50">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Dados protegidos · LGPD
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-background mb-4 text-sm">{col.title}</h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.isAnchor ? (
                      <a
                        href={link.href}
                        onClick={(e) => handleAnchor(e, link.href)}
                        className="text-background/60 hover:text-background transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-background/60 hover:text-background transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-background/40">
            © {new Date().getFullYear()} Slotimob · CNPJ 00.000.000/0001-00 · Todos os direitos reservados.
          </p>
          <p className="text-xs text-background/40">
            Feito com 💚 para o mercado imobiliário brasileiro.
          </p>
        </div>
      </div>
    </footer>
  );
}
