import { Button } from '@/components/ui/button';
import { SlotiLogo } from '@/components/SlotiLogo';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, LogIn } from 'lucide-react';

export function LandingHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <SlotiLogo className="h-8 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/demo" 
              className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              Demonstração
            </Link>
            <a 
              href="#features" 
              className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              Funcionalidades
            </a>
            <a 
              href="#pricing" 
              className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              Preços
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {!loading && (
              user ? (
                <Button 
                  asChild 
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                >
                  <Link to="/properties">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Acessar Painel
                  </Link>
                </Button>
              ) : (
                <>
                  <Button 
                    asChild 
                    variant="ghost" 
                    className="text-primary-foreground hover:bg-white/10"
                  >
                    <Link to="/auth">
                      <LogIn className="h-4 w-4 mr-2" />
                      Entrar
                    </Link>
                  </Button>
                  <Button 
                    asChild 
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <Link to="/auth">
                      Criar Conta
                    </Link>
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
