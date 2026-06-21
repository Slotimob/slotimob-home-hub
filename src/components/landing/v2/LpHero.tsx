import { Home, Star, Check, FileText, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import CTAButton from '@/components/marketing/CTAButton';

export function LpHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/40 pt-28 md:pt-36 pb-16 md:pb-24">
      {/* Inline keyframes for float animation */}
      <style>{`
        @keyframes lp-hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .lp-hero-mock { animation: lp-hero-float 4s ease-in-out infinite; }
      `}</style>

      {/* Decorative gradient blob */}
      <div
        aria-hidden
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 bg-gradient-to-br from-accent to-primary -z-0"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT — copy */}
          <div className="text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs sm:text-sm font-medium mb-6">
              <Home className="h-3.5 w-3.5" />
              Para quem gere imóveis sozinho
            </div>

            {/* H1 */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground">
              Seu imóvel gera renda.
              <br />
              <span className="text-accent">Não trabalho.</span>
            </h1>

            {/* Subhead */}
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
              Boletos, contratos, cobranças e reajustes no automático.
              Para quem gere de 1 a 50 imóveis sem depender de imobiliária.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-4">
              <CTAButton href="/checkout?plan=pro&trial=true" size="lg">
                Testar 7 dias grátis
              </CTAButton>
              <CTAButton href="#demo" variant="secondary" size="lg">
                Ver demonstração
              </CTAButton>
            </div>

            {/* Trust micro-copy */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" /> Sem cartão de crédito</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" /> Cancele quando quiser</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-accent" /> Setup em 5 minutos</span>
            </div>
          </div>

          {/* RIGHT — mockup */}
          <div className="relative">
            <div className="lp-hero-mock relative rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
              {/* App header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Home className="h-4 w-4 text-primary" />
                  Slotimob — Dashboard
                </div>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                </div>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                <div className="px-5 py-4">
                  <p className="text-xs text-muted-foreground">Imóveis</p>
                  <p className="text-2xl font-bold text-foreground">12</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs text-muted-foreground">Receita do mês</p>
                  <p className="text-2xl font-bold text-foreground">R$ 8.400</p>
                </div>
              </div>

              {/* Boletos */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  Boletos gerados automaticamente
                </div>
                <ul className="space-y-2 text-sm">
                  <BoletoRow address="Rua das Flores, 42" value="R$ 1.200" status="paid" />
                  <BoletoRow address="Av. Paulista, 800" value="R$ 2.100" status="paid" />
                  <BoletoRow address="Rua Augusta, 15" value="R$ 900" status="pending" />
                </ul>
              </div>

              {/* DRE row */}
              <div className="flex items-center justify-between px-5 py-4 bg-accent/5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  DRE Junho
                </div>
                <span className="text-sm font-bold text-accent">+ R$ 4.200 líquido</span>
              </div>
            </div>

            {/* Credibility badge */}
            <div
              className="absolute -bottom-4 -right-4 sm:-right-6 rotate-3 bg-card border border-border shadow-lg rounded-xl px-4 py-2 flex items-center gap-2"
            >
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="text-sm font-semibold text-foreground">
                4.9/5 <span className="text-muted-foreground font-normal">— 500+ proprietários</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BoletoRow({ address, value, status }: { address: string; value: string; status: 'paid' | 'pending' }) {
  const Icon = status === 'paid' ? CheckCircle2 : Clock;
  const color = status === 'paid' ? 'text-accent' : 'text-amber-500';
  const label = status === 'paid' ? 'Pago' : 'Pendente';
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-foreground/90 truncate">
        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
        <span className="truncate">{address}</span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        <span className="font-medium text-foreground">{value}</span>
        <span className={`text-xs ${color}`}>{label}</span>
      </span>
    </li>
  );
}
