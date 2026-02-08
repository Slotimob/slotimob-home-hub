import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SlotiLogo } from '@/components/SlotiLogo';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary opacity-95" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-secondary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <SlotiLogo className="h-16 w-auto" />
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
            Gestão Imobiliária
            <span className="block text-secondary mt-2">Simplificada e Inteligente</span>
          </h1>
          
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Organize seus imóveis, leads e negociações em um só lugar. 
            Feche mais vendas com menos esforço.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              asChild 
              size="lg" 
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Link to="/auth">
                Começar Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 px-8 py-6 text-lg"
            >
              <Link to="/demo">
                <Play className="mr-2 h-5 w-5" />
                Ver Demonstração
              </Link>
            </Button>
          </div>
          
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-primary-foreground/70 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-secondary rounded-full" />
              Sem cartão de crédito
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-secondary rounded-full" />
              Trial de 14 dias
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-secondary rounded-full" />
              Suporte incluído
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
