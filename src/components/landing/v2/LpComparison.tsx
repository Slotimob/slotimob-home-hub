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

      {/* ── Comparativo vs Outros Sistemas ── */}
      <Reveal delay={150}>
        <div className="mt-16 md:mt-24 max-w-5xl mx-auto">
          <h3 className="text-xl md:text-2xl font-bold text-primary-foreground text-center mb-8">
            Por que o Slotimob se destaca no mercado?
          </h3>
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_1fr] rounded-2xl overflow-hidden border border-primary-foreground/15">
            {/* Cabeçalho */}
            <div className="px-5 py-4 bg-primary-foreground/5 text-xs uppercase tracking-wider text-primary-foreground/50">
              Funcionalidade
            </div>
            <div className="px-5 py-4 bg-primary-foreground/5 border-l border-primary-foreground/10">
              <p className="text-xs uppercase tracking-wider text-primary-foreground/50">Outros sistemas</p>
              <p className="text-[11px] text-primary-foreground/40 mt-0.5">plataformas tradicionais de gestão</p>
            </div>
            <div className="px-5 py-4 bg-accent/10 border-l border-accent/30">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <p className="text-xs uppercase tracking-wider text-primary-foreground font-semibold">Slotimob</p>
              </div>
              <p className="text-[11px] text-primary-foreground/50 mt-0.5">tudo em um só lugar</p>
            </div>
            {/* Linhas */}
            {[
              { feature: 'CRM com pipeline e kanban',              others: 'Não incluído',                      sloti: 'Incluído no plano' },
              { feature: 'WhatsApp integrado ao sistema',          others: 'Não tem',                           sloti: 'Nativo no PRO e Business' },
              { feature: 'Gestão financeira (DRE, OFX, DIMOB)',   others: 'Cobrado como módulo extra',          sloti: 'Incluído sem custo adicional' },
              { feature: 'Assistente de IA',                      others: 'Não tem',                           sloti: '250 créditos/mês no PRO' },
              { feature: 'Emissão de boleto/Pix para inquilino',  others: 'Depende de integração externa',      sloti: 'Nativo via Asaas' },
              { feature: 'Trial sem cartão de crédito',           others: 'Exige cartão ou contato comercial',  sloti: '7 dias PRO grátis, sem cartão' },
              { feature: 'Checkout online self-service',          others: 'Via WhatsApp ou contato',            sloti: 'Checkout 100% online' },
            ].map((r, i) => (
              <div key={r.feature} className="contents">
                <div className={`px-5 py-3.5 text-sm font-medium text-primary-foreground ${i % 2 === 0 ? 'bg-primary-foreground/[0.03]' : ''}`}>
                  {r.feature}
                </div>
                <div className={`px-5 py-3.5 text-sm text-primary-foreground/60 border-l border-primary-foreground/10 flex items-center gap-1.5 ${i % 2 === 0 ? 'bg-primary-foreground/[0.03]' : ''}`}>
                  <X className="h-4 w-4 text-destructive shrink-0" />
                  {r.others}
                </div>
                <div className={`px-5 py-3.5 text-sm font-medium text-primary-foreground border-l border-accent/30 flex items-center gap-1.5 ${i % 2 === 0 ? 'bg-accent/[0.08]' : 'bg-accent/5'}`}>
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  {r.sloti}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {[
              { feature: 'CRM com pipeline e kanban',             others: 'Não incluído',                      sloti: 'Incluído no plano' },
              { feature: 'WhatsApp integrado',                    others: 'Não tem',                           sloti: 'Nativo no PRO e Business' },
              { feature: 'Gestão financeira completa',            others: 'Cobrado como módulo extra',          sloti: 'Incluído sem custo adicional' },
              { feature: 'Assistente de IA',                      others: 'Não tem',                           sloti: '250 créditos/mês no PRO' },
              { feature: 'Boleto/Pix para inquilino',             others: 'Integração externa',                sloti: 'Nativo via Asaas' },
              { feature: 'Trial sem cartão',                      others: 'Exige cartão',                      sloti: '7 dias PRO grátis' },
            ].map((r) => (
              <div key={r.feature} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-primary-foreground/50 mb-3">{r.feature}</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase text-primary-foreground/40">Outros sistemas</p>
                      <p className="text-primary-foreground/60">{r.others}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm rounded-lg bg-accent/10 border border-accent/20 p-2.5">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase text-accent">Slotimob</p>
                      <p className="text-primary-foreground font-medium">{r.sloti}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
