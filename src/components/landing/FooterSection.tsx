import { Link } from 'react-router-dom';
import { SlotiLogo } from '@/components/SlotiLogo';

export function FooterSection() {
  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <SlotiLogo className="h-10 w-auto mb-4" />
            <p className="text-muted-foreground text-sm max-w-xs">
              A plataforma completa de gestão imobiliária: CRM, financeiro, contratos e WhatsApp com IA.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Soluções</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#modulo-crm" className="hover:text-foreground transition-colors">CRM & Leads</a></li>
              <li><a href="#modulo-financeiro" className="hover:text-foreground transition-colors">Hub Financeiro</a></li>
              <li><a href="#modulo-unidades" className="hover:text-foreground transition-colors">Gestão de Ativos</a></li>
              <li><a href="#modulo-whatsapp" className="hover:text-foreground transition-colors">WhatsApp & IA</a></li>
              <li><a href="#modulo-calculadoras" className="hover:text-foreground transition-colors">Calculadoras</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Preços</a></li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><a href="#demo" className="hover:text-foreground transition-colors">Demonstração</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/legal?tab=terms" className="hover:text-foreground transition-colors">Termos de Uso</Link></li>
              <li><Link to="/legal?tab=privacy" className="hover:text-foreground transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SLOTIMOB. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
