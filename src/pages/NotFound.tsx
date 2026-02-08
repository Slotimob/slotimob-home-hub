import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { SlotiLogo } from "@/components/SlotiLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEOHead 
        title="Página não encontrada"
        description="A página que você está procurando não existe ou foi movida"
        path={location.pathname}
        noIndex={true}
      />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <SlotiLogo size="lg" />
          </div>

          {/* 404 Display */}
          <div className="relative mb-6">
            <h1 className="text-[120px] md:text-[160px] font-black leading-none bg-gradient-to-br from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              404
            </h1>
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-secondary opacity-20 blur-3xl -z-10" />
          </div>

          {/* Message */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            A página que você está procurando não existe, foi movida ou está temporariamente indisponível.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button asChild size="lg" className="gap-2">
              <Link to="/">
                <Home className="h-4 w-4" />
                Ir para o início
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/auth">
                <ArrowLeft className="h-4 w-4" />
                Fazer login
              </Link>
            </Button>
          </div>

          {/* Path info for debugging */}
          <div className="mt-12 p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span>Caminho solicitado:</span>
              <code className="px-2 py-0.5 rounded bg-muted font-mono text-xs">
                {location.pathname}
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SLOTIMOB - Sistema de Gestão Imobiliária
          </p>
        </div>
      </div>
    </>
  );
};

export default NotFound;
