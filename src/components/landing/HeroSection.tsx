import { Button } from '@/components/ui/button';
import { ArrowRight, Star, Users, Shield, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LandingSegment } from '@/config/landingSegments';
import { SEGMENTS } from '@/config/landingSegments';

function SystemMockup() {
  return (
    <div className="relative w-full">
      {/* Browser chrome */}
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

        {/* System layout */}
        <div className="flex h-[340px] md:h-[420px] bg-background">
          {/* Mini sidebar */}
          <div className="w-12 md:w-14 border-r border-border/50 bg-muted/20 flex flex-col items-center py-3 gap-3 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-sm bg-primary/60" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                <div className={`w-3.5 h-3.5 rounded-sm ${i === 0 ? 'bg-primary/40' : 'bg-muted-foreground/20'}`} />
              </div>
            ))}
          </div>

          {/* Main content area */}
          <div className="flex-1 p-3 md:p-4 space-y-3 overflow-hidden">
            {/* Top metrics row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Receita', value: 'R$ 47.2k', change: '+12%', color: 'text-accent' },
                { label: 'Negócios', value: '23', change: '+5', color: 'text-primary' },
                { label: 'Ocupação', value: '94%', change: '+3%', color: 'text-accent' },
                { label: 'Leads', value: '142', change: '+28', color: 'text-primary' },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-border/50 bg-card p-2 md:p-3">
                  <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                  <p className="text-sm md:text-lg font-bold text-foreground">{m.value}</p>
                  <span className={`text-[10px] md:text-xs font-medium ${m.color}`}>{m.change}</span>
                </div>
              ))}
            </div>

            {/* Two-column: Kanban + Finance */}
            <div className="grid grid-cols-5 gap-2 flex-1">
              {/* Kanban pipeline */}
              <div className="col-span-3 rounded-lg border border-border/50 bg-card p-2 md:p-3">
                <p className="text-[10px] font-semibold text-foreground mb-2">Pipeline de Vendas</p>
                <div className="grid grid-cols-3 gap-1.5 h-full">
                  {[
                    { stage: 'Novos', count: 8, items: ['Maria S.', 'João P.', 'Ana L.'] },
                    { stage: 'Visita', count: 5, items: ['Carlos M.', 'Paula R.'] },
                    { stage: 'Proposta', count: 3, items: ['Roberto F.'] },
                  ].map((col) => (
                    <div key={col.stage} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] md:text-[9px] font-medium text-muted-foreground">{col.stage}</span>
                        <span className="text-[8px] bg-muted rounded-full px-1.5 text-muted-foreground">{col.count}</span>
                      </div>
                      {col.items.map((name) => (
                        <div key={name} className="rounded-md border border-border/40 bg-background p-1.5 md:p-2">
                          <p className="text-[8px] md:text-[10px] font-medium text-foreground truncate">{name}</p>
                          <p className="text-[7px] md:text-[8px] text-muted-foreground">Apto 2q · R$ 350k</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Finance summary */}
              <div className="col-span-2 rounded-lg border border-border/50 bg-card p-2 md:p-3 space-y-2">
                <p className="text-[10px] font-semibold text-foreground">Financeiro</p>
                {[
                  { label: 'Apto 301 — Solar', status: 'Em dia', color: 'bg-success' },
                  { label: 'Sala 12 — Emp.', status: 'Reajuste', color: 'bg-warning' },
                  { label: 'Casa 7 — Flores', status: 'Atrasado', color: 'bg-destructive' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-md border border-border/40 bg-background p-1.5">
                    <p className="text-[8px] md:text-[9px] font-medium text-foreground truncate">{item.label}</p>
                    <span className={`text-[7px] md:text-[8px] font-medium px-1.5 py-0.5 rounded-full text-white ${item.color}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
                <div className="pt-1 border-t border-border/30">
                  <div className="flex justify-between text-[8px] md:text-[9px]">
                    <span className="text-muted-foreground">Lucro líquido</span>
                    <span className="font-semibold text-accent">R$ 28.8k</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glassmorphism overlay accent */}
      <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}

interface HeroSectionProps {
  segment?: LandingSegment;
}

export function HeroSection({ segment = SEGMENTS.default }: HeroSectionProps) {
  const authUrl = `/auth?utm_source=${segment.utmSource}`;

  return (
    <section id="hero" className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.03),transparent_70%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-14">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-medium mb-8">
            <Shield className="h-4 w-4" />
            Segurança de banco para seus dados
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight" style={{ textWrap: 'balance' }}>
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
              <Link to="/presentation">
                Ver Demonstração
              </Link>
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

        {/* System mockup with glassmorphism */}
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-accent/5 to-transparent rounded-3xl blur-xl -m-4 pointer-events-none" />
          <div className="relative backdrop-blur-sm">
            <SystemMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
