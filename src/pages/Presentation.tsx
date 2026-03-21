import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Wallet, Building2, Brain, Bot,
  ArrowRight, MessageSquare, BarChart3,
  Shuffle, FileText, CalendarClock, Shield,
  PenTool, ArrowLeftRight, Zap, Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { SEOHead } from '@/components/SEOHead';
import { LandingThemeProvider } from '@/components/LandingThemeProvider';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/FooterSection';

interface TourModule {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  description: string;
  features: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }[];
  videoUrl?: string;
}

const modules: TourModule[] = [
  {
    id: 'crm',
    label: 'CRM & Vendas',
    icon: Users,
    headline: 'Pipeline visual integrado ao WhatsApp',
    description: 'Acompanhe cada lead do primeiro contato ao fechamento. O pipeline Kanban se conecta ao WhatsApp e ao financeiro, dando contexto completo para cada negociação.',
    features: [
      { icon: MessageSquare, title: 'WhatsApp com Contexto', desc: 'Histórico do cliente e do imóvel na mesma tela.' },
      { icon: Shuffle, title: 'Roleta de Leads', desc: 'Distribuição automática e justa para equipes.' },
      { icon: FileText, title: 'Contratos Automáticos', desc: 'Gere contratos com dados já preenchidos.' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: Wallet,
    headline: 'Bata o caixa em segundos, não em horas',
    description: 'Importe o extrato do banco e o sistema identifica cada pagamento. O DRE funcional analisa o lucro real — por imóvel ou do negócio inteiro.',
    features: [
      { icon: ArrowLeftRight, title: 'Conciliação Automática', desc: 'O sistema lê o extrato e identifica cada pagamento.' },
      { icon: BarChart3, title: 'DRE Funcional', desc: 'Lucro real separado por receitas e despesas.' },
      { icon: Zap, title: 'Cobranças Automáticas', desc: 'Boletos e lembretes pelo WhatsApp.' },
    ],
  },
  {
    id: 'ativos',
    label: 'Gestão de Ativos',
    icon: Building2,
    headline: 'Reajustes, contratos e vencimentos no automático',
    description: 'O sistema avisa sobre vencimentos, calcula reajustes automaticamente e gera os documentos sozinho. Você só acompanha.',
    features: [
      { icon: CalendarClock, title: 'Reajustes Automáticos', desc: 'IGPM, IPCA calculados e avisados antes do vencimento.' },
      { icon: Shield, title: 'Gestão de Contratos', desc: 'Vigência, renovações e rescisões com um clique.' },
      { icon: FileText, title: 'Documentos Automáticos', desc: 'Recibos e demonstrativos prontos para o proprietário.' },
    ],
  },
  {
    id: 'ia',
    label: 'Inteligência Artificial',
    icon: Brain,
    headline: 'A IA que trabalha por você',
    description: 'Resumos de conversas longas, análise de patrimônio e textos de conversão para venda e aluguel. Menos tempo digitando, mais tempo fechando.',
    features: [
      { icon: Bot, title: 'Resumos de Conversas', desc: 'A IA entrega o que o cliente quer e o próximo passo.' },
      { icon: BarChart3, title: 'Análise de Patrimônio', desc: 'Saúde financeira dos imóveis em tempo real.' },
      { icon: PenTool, title: 'Textos de Conversão', desc: 'Descrições profissionais geradas em segundos.' },
    ],
  },
];

function VideoPlaceholder({ moduleLabel }: { moduleLabel: string }) {
  return (
    <AspectRatio ratio={16 / 9}>
      <div className="w-full h-full rounded-xl border border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Play className="h-6 w-6 text-primary ml-0.5" />
        </div>
        <p className="text-sm text-primary font-medium">Vídeo: {moduleLabel}</p>
        <p className="text-xs text-muted-foreground">Em breve</p>
      </div>
    </AspectRatio>
  );
}

export default function Presentation() {
  const [active, setActive] = useState('crm');
  const activeModule = modules.find((m) => m.id === active)!;

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
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80 opacity-95" />
          <div className="absolute top-10 right-10 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
              Conheça cada módulo do SLOTIMOB
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Explore as funcionalidades que transformam sua gestão imobiliária.
            </p>
          </div>
        </section>

        {/* Tour content */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
              {/* Vertical nav */}
              <nav className="lg:w-64 shrink-0">
                <div className="lg:sticky lg:top-24 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none">
                  {modules.map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() => setActive(mod.id)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-left whitespace-nowrap lg:whitespace-normal transition-all shrink-0 w-full',
                        active === mod.id
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <mod.icon className="h-5 w-5 shrink-0" />
                      <span className="font-semibold text-sm">{mod.label}</span>
                    </button>
                  ))}
                </div>
              </nav>

              {/* Module content */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeModule.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-8"
                  >
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{activeModule.headline}</h2>
                      <p className="text-muted-foreground leading-relaxed max-w-2xl">{activeModule.description}</p>
                    </div>

                    {/* Video placeholder */}
                    <div className="max-w-2xl">
                      <VideoPlaceholder moduleLabel={activeModule.label} />
                    </div>

                    {/* Features */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      {activeModule.features.map((feat) => (
                        <div key={feat.title} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
                          <div className="p-2 rounded-lg bg-primary/10 w-fit">
                            <feat.icon className="h-4 w-4 text-primary" />
                          </div>
                          <h4 className="text-sm font-bold text-foreground">{feat.title}</h4>
                          <p className="text-xs text-muted-foreground">{feat.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

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
