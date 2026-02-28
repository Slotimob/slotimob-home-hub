import { Link } from "react-router-dom";
import { MapPinOff, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { SlotiLogo } from "@/components/SlotiLogo";

const NotFound = () => {
  return (
    <>
      <SEOHead
        title="Página não encontrada"
        description="A página que você está procurando não existe ou foi movida"
        noIndex={true}
      />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4 relative overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          <SlotiLogo size="lg" className="mb-6" />

          {/* Icon + 404 */}
          <div className="relative mb-4">
            <MapPinOff className="h-20 w-20 text-primary/60 mx-auto mb-2" strokeWidth={1.5} />
            <h1 className="text-[100px] md:text-[140px] font-black leading-none bg-gradient-to-br from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              404
            </h1>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            Ops! Parece que esse imóvel mudou de endereço ou não existe mais.
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            A página que você procura pode ter sido removida ou está temporariamente indisponível.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button asChild size="lg" className="gap-2">
              <Link to="/dashboard">
                <Home className="h-4 w-4" />
                Voltar para o Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Ir para a Home
              </Link>
            </Button>
          </div>
        </div>

        <p className="absolute bottom-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} SLOTIMOB - Sistema de Gestão Imobiliária
        </p>
      </div>
    </>
  );
};

export default NotFound;
