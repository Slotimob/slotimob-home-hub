import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, Users, Shield, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LandingSegment } from '@/config/landingSegments';
import { SEGMENTS } from '@/config/landingSegments';

const DashboardMockup = lazy(() =>
  import('@/assets/dashboard-mockup.png').then((mod) => ({
    default: () => (
      <img
        src={mod.default}
        alt="Dashboard SlotiMob - gestão imobiliária completa"
        className="w-full rounded-xl shadow-2xl border border-border/30"
        loading="lazy"
        width={1920}
        height={1080}
      />
    ),
  }))
);

interface HeroSectionProps {
  segment?: LandingSegment;
}

export function HeroSection({ segment = SEGMENTS.default }: HeroSectionProps) {
  const authUrl = `/auth?utm_source=${segment.utmSource}`;

  return (
    <section id="hero" className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.03),transparent_70%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-14">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-medium mb-8">
            <Shield className="h-4 w-4" />
            Segurança de banco para seus dados
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            A gestão definitiva para quem vive
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mt-1">
              do mercado imobiliário.
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Do lead no WhatsApp ao fechamento do contrato: controle suas vendas, seu financeiro e seu patrimônio em um só lugar.
            Sem planilhas, sem erros, 100% profissional.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Link to={authUrl}>
                Experimentar Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-border text-foreground hover:bg-muted px-8 py-6 text-lg"
            >
              <a href="#pricing" onClick={(e) => { e.preventDefault(); document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' }); }}>
                Ver Planos
              </a>
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}
              </div>
              <span className="font-semibold text-foreground">4.9/5</span>
              <span>nas avaliações</span>
            </div>
            <span className="hidden sm:inline text-border">|</span>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span>+200 usuários ativos</span>
            </div>
            <span className="hidden sm:inline text-border">|</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>Seguro e Auditado</span>
            </div>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-border/50 shadow-2xl overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/40" />
                <div className="w-3 h-3 rounded-full bg-warning/40" />
                <div className="w-3 h-3 rounded-full bg-success/40" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-muted rounded-md px-4 py-1 text-xs text-muted-foreground w-64 text-center">
                  app.slotimob.com.br
                </div>
              </div>
            </div>
            <Suspense fallback={<div className="w-full aspect-video bg-muted/20 animate-pulse" />}>
              <DashboardMockup />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
