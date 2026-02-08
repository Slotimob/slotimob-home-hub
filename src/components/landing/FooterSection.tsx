import { Link } from 'react-router-dom';
import { SlotiLogo } from '@/components/SlotiLogo';

export function FooterSection() {
  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <SlotiLogo className="h-10 w-auto mb-4" />
            <p className="text-muted-foreground max-w-sm">
              Sistema de gestão imobiliária completo para corretores que querem vender mais e trabalhar de forma inteligente.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Produto</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Funcionalidades</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Preços</a></li>
              <li><Link to="/apresentacao" className="hover:text-primary transition-colors">Demonstração</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/legal" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/legal" className="hover:text-primary transition-colors">Privacidade</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SLOTI. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Feito com ❤️ para corretores de imóveis
          </p>
        </div>
      </div>
    </footer>
  );
}
