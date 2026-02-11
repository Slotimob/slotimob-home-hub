import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardMockup = lazy(() =>
  import('@/assets/dashboard-mockup.png').then((mod) => ({
    default: () => (
      <img
        src={mod.default}
        alt="Dashboard SlotiMob - gestão imobiliária inteligente"
        className="w-full rounded-xl shadow-2xl border border-border/50"
        loading="lazy"
        width={1920}
        height={1080}
      />
    ),
  }))
);

const socialProof = [
  '+200 corretores ativos',
  '4.9★ de satisfação',
  'Suporte em <2h',
];

export function HeroSection() {
  return (
    <section id="hero" className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-accent/80" />
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight tracking-tight">
            A inteligência que sua imobiliária
            <span className="block text-secondary mt-1">precisava para escalar.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto leading-relaxed">
            CRM, ERP e WhatsApp com IA integrados em um único lugar.
            Comece com 2 unidades grátis e sinta o poder do Plano Pro por 14 dias.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
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
              className="w-full sm:w-auto border-white/30 bg-white/10 text-white hover:bg-white/20 px-8 py-6 text-lg"
            >
              <a href="#demo" onClick={(e) => { e.preventDefault(); document.querySelector('#demo')?.scrollIntoView({ behavior: 'smooth' }); }}>
                Ver em Ação
              </a>
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-primary-foreground/70 text-sm">
            {socialProof.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto">
          <Suspense
            fallback={
              <div className="w-full aspect-video bg-primary-foreground/5 rounded-xl animate-pulse" />
            }
          >
            <DashboardMockup />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
