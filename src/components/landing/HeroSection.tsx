import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, CheckCircle2, Shield, Zap, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LandingSegment } from '@/config/landingSegments';
import { SEGMENTS } from '@/config/landingSegments';

const DashboardMockup = lazy(() =>
  import('@/assets/dashboard-mockup.png').then((mod) => ({
    default: () => (
      <img
        src={mod.default}
        alt="Dashboard SlotiMob - gestão imobiliária inteligente"
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
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.03),transparent_70%)]" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-14">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-medium mb-8">
            <Shield className="h-4 w-4" />
            Seus dados protegidos com segurança bancária
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            Tudo que sua imobiliária precisa,
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent mt-1">
              em um só lugar.
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Clientes, vendas, financeiro e WhatsApp conectados em uma plataforma simples. 
            Menos planilhas, mais fechamentos.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Link to={authUrl}>
                Quero modernizar minha imobiliária
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-border text-foreground hover:bg-muted px-8 py-6 text-lg"
            >
              <a href="#demo" onClick={(e) => { e.preventDefault(); document.querySelector('#demo')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <Play className="mr-2 h-5 w-5" />
                Ver como funciona
              </a>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { icon: Users, value: '+200', label: 'corretores ativos' },
              { icon: Zap, value: '4.9★', label: 'de satisfação' },
              { icon: CheckCircle2, value: '<2h', label: 'tempo de suporte' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup in browser frame */}
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-border/50 shadow-2xl overflow-hidden bg-card">
            {/* Browser chrome */}
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
            <Suspense
              fallback={
                <div className="w-full aspect-video bg-muted/20 animate-pulse" />
              }
            >
              <DashboardMockup />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
