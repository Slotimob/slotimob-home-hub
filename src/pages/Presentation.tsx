import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { LandingThemeProvider } from '@/components/LandingThemeProvider';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/FooterSection';
import { modules } from '@/components/presentation/TourModuleData';
import { TourModuleCard } from '@/components/presentation/TourModuleCard';

function ModuleNav() {
  return (
    <nav className="sticky top-16 z-30 bg-background/80 backdrop-blur-lg border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-none py-3">
          {modules.map((mod) => (
            <a
              key={mod.id}
              href={`#${mod.id}`}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
                'bg-muted/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shrink-0'
              )}
            >
              <mod.icon className="h-4 w-4" />
              {mod.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

function VideoCtaSection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/90 to-accent/80" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-foreground/5 rounded-full blur-[80px]" />
      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm">
            <Play className="h-4 w-4" />
            Vídeos explicativos
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Assistir vídeos de como cada módulo funciona
          </h2>
          <p className="text-lg text-white/75 max-w-xl mx-auto">
            Veja na prática como o SLOTIMOB transforma a gestão da sua imobiliária, módulo por módulo.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-primary hover:bg-white/90 px-10 py-6 text-lg font-bold rounded-full shadow-2xl"
          >
            <Link to="/auth">
              <Play className="mr-2 h-5 w-5" />
              Assistir Agora
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

export default function Presentation() {
  return (
    <LandingThemeProvider>
      <SEOHead
        title="Product Tour - SLOTIMOB"
        description="Explore cada módulo do SLOTIMOB: CRM, Financeiro, Ativos e IA. Descubra como transformar sua gestão imobiliária."
        path="/presentation"
      />
      <LandingHeader />

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary/90 to-accent/80 opacity-95" />
          <div className="absolute top-10 right-10 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-48 bg-accent/10 rounded-full blur-[100px]" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 text-white/90 text-sm mb-2">
                <Sparkles className="h-4 w-4" />
                Product Tour Completo
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Conheça cada módulo do SLOTIMOB
              </h1>
              <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Explore todas as funcionalidades que transformam sua gestão imobiliária — do primeiro lead ao relatório final.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {modules.slice(0, 5).map((mod) => (
                  <a
                    key={mod.id}
                    href={`#${mod.id}`}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full px-4 py-2 text-sm font-medium transition-all"
                  >
                    <mod.icon className="h-4 w-4" />
                    {mod.label}
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Module navigation bar */}
        <ModuleNav />

        {/* All modules */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto space-y-12">
              {modules.map((mod, i) => (
                <TourModuleCard key={mod.id} module={mod} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Video CTA Section */}
        <VideoCtaSection />

        {/* Sticky CTA */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button
            asChild
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-5 text-base font-semibold shadow-2xl rounded-full"
          >
            <Link to="/auth">
              Começar Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        <FooterSection />
      </main>
    </LandingThemeProvider>
  );
}
