import { CheckCircle2, X } from 'lucide-react';
import SectionWrapper from '@/components/marketing/SectionWrapper';
import CTAButton from '@/components/marketing/CTAButton';
import { Reveal } from '../v2/Reveal';

interface Row {
  aspect: string;
  manual: string;
  slotimob: string;
}

const rows: Row[] = [
  { aspect: 'Emissão de boletos', manual: 'Gerar um a um todo mês', slotimob: '100% automático' },
  { aspect: 'Cobrança de atrasos', manual: 'WhatsApp pessoal', slotimob: 'Régua automática' },
  { aspect: 'Reajuste de contrato', manual: 'Lembrar + calcular na mão', slotimob: 'IGPM/IPCA automático' },
  { aspect: 'Multa e juros', manual: 'Deixa passar', slotimob: 'Cobra automaticamente' },
  { aspect: 'Contrato', manual: 'Papel + cartório', slotimob: 'Digital, assinatura online' },
  { aspect: 'Tempo gasto por mês', manual: '4+ horas', slotimob: 'Menos de 15 minutos' },
  { aspect: 'Relatório IR', manual: 'Montar na mão', slotimob: 'Gerado automaticamente' },
];

export function LpComparison() {
  return (
    <SectionWrapper background="primary" id="comparativo">
      {/* Title */}
      <Reveal>
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground leading-tight">
            Quanto você perde fazendo manual?
          </h2>
          <p className="text-lg text-primary-foreground/70 mt-3 max-w-2xl mx-auto">
            Controle financeiro que antes levava horas, agora em minutos. Sem
            planilhas. Sem reajuste esquecido.
          </p>
        </div>
      </Reveal>

      {/* Desktop table */}
      <Reveal delay={100} className="hidden md:block max-w-5xl mx-auto">
      <div>
        <div className="grid grid-cols-[1.2fr_1fr_1fr] rounded-2xl overflow-hidden border border-primary-foreground/15">
          {/* Header */}
          <div className="px-6 py-5 bg-primary-foreground/5">
            <p className="text-xs uppercase tracking-wider text-primary-foreground/50">
              Comparativo
            </p>
          </div>
          <div className="px-6 py-5 bg-primary-foreground/5 border-l border-primary-foreground/10">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-primary-foreground">Gestão Manual</span>
            </div>
            <p className="text-xs text-primary-foreground/50 mt-1">Como a maioria faz</p>
          </div>
          <div className="px-6 py-5 bg-accent/10 border-l border-accent/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              <span className="font-semibold text-primary-foreground">Com Slotimob</span>
            </div>
            <p className="text-xs text-primary-foreground/60 mt-1">Como deveria ser</p>
          </div>

          {/* Rows */}
          {rows.map((r, i) => (
            <div key={r.aspect} className="contents">
              <div
                className={`px-6 py-4 text-sm font-medium text-primary-foreground ${
                  i % 2 === 0 ? 'bg-primary-foreground/[0.03]' : ''
                }`}
              >
                {r.aspect}
              </div>
              <div
                className={`px-6 py-4 text-sm text-primary-foreground/70 border-l border-primary-foreground/10 flex items-center gap-2 ${
                  i % 2 === 0 ? 'bg-primary-foreground/[0.03]' : ''
                }`}
              >
                <X className="h-4 w-4 text-destructive shrink-0" />
                <span>{r.manual}</span>
              </div>
              <div
                className={`px-6 py-4 text-sm font-medium text-primary-foreground border-l border-accent/30 flex items-center gap-2 ${
                  i % 2 === 0 ? 'bg-accent/[0.08]' : 'bg-accent/5'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                <span>{r.slotimob}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      </Reveal>

      {/* Mobile cards */}
      <Reveal delay={100} className="md:hidden">
      <div className="space-y-4">
        {rows.map((r) => (
          <div
            key={r.aspect}
            className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/[0.03] p-4"
          >
            <p className="text-xs uppercase tracking-wider text-primary-foreground/50 mb-3">
              {r.aspect}
            </p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2 text-sm">
                <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase text-primary-foreground/40">Manual</p>
                  <p className="text-primary-foreground/70">{r.manual}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm rounded-lg bg-accent/10 border border-accent/20 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase text-accent">Slotimob</p>
                  <p className="text-primary-foreground font-medium">{r.slotimob}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </Reveal>

      {/* CTA */}
      <Reveal delay={200}>
        <div className="text-center mt-10">
          <CTAButton href="/checkout?plan=pro&trial=true" size="lg">
            Começar grátis agora
          </CTAButton>
          <p className="mt-3 text-sm text-primary-foreground/60">
            Sem cartão · 7 dias de PRO grátis
          </p>
        </div>
      </Reveal>
    </SectionWrapper>
  );
}
