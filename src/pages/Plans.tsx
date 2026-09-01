import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, UserPlus, Sparkles,
  CheckCircle2, X, ChevronDown,
} from 'lucide-react';
import { LpHeader } from '@/components/landing/v2/LpHeader';
import { LpFooter } from '@/components/landing/v2/LpFooter';
import { SEOHead } from '@/components/SEOHead';
import '@/components/landing/v2/lp.css';
import { PricingSection } from '@/components/landing/PricingSection';
import { usePlanPricing, type PlanPricing } from '@/hooks/usePlanPricing';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ─── DIFERENCIAL ─── */
function DiferencialSection() {
  return (
    <section className="py-14 md:py-20" style={{ background: 'hsl(var(--background))', borderBottom: '1px solid var(--lp-line)' }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <p className="lp-eyebrow mb-4">diferencial slotimob</p>
        <h2 className="lp-display text-[32px] md:text-[56px] leading-tight mb-4" style={{ color: 'var(--lp-ink)' }}>
          Gestão Financeira Completa
          <br />
          <em className="lp-serif" style={{ fontStyle: 'italic', color: 'var(--lp-accent)' }}>inclusa</em> na assinatura.
        </h2>
        <p className="text-[15px] md:text-[17px] max-w-[56ch] leading-relaxed" style={{ color: 'var(--lp-ink-soft)' }}>
          DRE, conciliação bancária (OFX), DIMOB, relatórios mensais e anuais — sem cobrar módulo extra. Em outras plataformas isso custa a parte. Aqui está incluso nos planos pagos.
        </p>
      </div>
    </section>
  );
}

/* ─── TABELA COMPARATIVA ─── */
type Cell = boolean | string;
interface Row { feature: string; values: Record<PlanKey, Cell> }
interface Category { name: string; rows: Row[] }

type PlanKey = 'start' | 'essencial' | 'pro' | 'business';
const PLAN_ORDER: PlanKey[] = ['start', 'essencial', 'pro', 'business'];

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function renderCell(v: Cell) {
  if (v === true) return <CheckCircle2 className="h-5 w-5 mx-auto text-accent" aria-label="Incluído" />;
  if (v === false) return <X className="h-5 w-5 mx-auto text-muted-foreground/50" aria-label="Não incluído" />;
  return <span className="text-base text-foreground">{v || '—'}</span>;
}

function buildCategories(pricing: Record<string, PlanPricing> | undefined): Category[] {
  const p = (id: PlanKey) => pricing?.[id];
  const price = (id: PlanKey): Cell => {
    const plan = p(id);
    if (!plan) return '—';
    if (!plan.price_original) return 'Grátis';
    return `${brl(plan.price_original)}/mês`;
  };
  const annual = (id: PlanKey): Cell => {
    const plan = p(id);
    if (!plan || !plan.price_annual) return '—';
    return `${brl(plan.price_annual)}/ano (${brl(plan.price_annual / 12)}/mês)`;
  };
  const assets = (id: PlanKey): Cell => (p(id) ? `${p(id)!.assets_limit} imóveis` : '—');
  const users = (id: PlanKey): Cell => {
    const n = p(id)?.users_limit;
    if (!n) return '—';
    return n === 1 ? '1 usuário' : `${n} usuários`;
  };
  const credits = (id: PlanKey): Cell => {
    const n = p(id)?.ai_credits;
    if (!n) return false;
    return `${n} créditos/mês`;
  };
  const wpp = (id: PlanKey): Cell => {
    const n = p(id)?.whatsapp_instances_limit;
    if (!n) return false;
    return n === 1 ? '1 instância' : `${n} instâncias`;
  };
  const team = (id: PlanKey): Cell => p(id)?.team_management === true;
  const feat = (id: PlanKey, key: string): Cell => p(id)?.features?.[key] === true;

  const row = (feature: string, fn: (id: PlanKey) => Cell): Row => ({
    feature,
    values: PLAN_ORDER.reduce((acc, id) => { acc[id] = fn(id); return acc; }, {} as Record<PlanKey, Cell>),
  });

  return [
    {
      name: 'Preço',
      rows: [row('Preço mensal', price), row('Preço anual', annual)],
    },
    {
      name: 'Limites',
      rows: [
        row('Imóveis', assets),
        row('Usuários', users),
        row('Créditos de IA', credits),
        row('Instâncias de WhatsApp', wpp),
      ],
    },
    {
      name: 'Operação',
      rows: [
        row('CRM e pipeline', (id) => (feat(id, 'crm_full') ? 'Completo' : feat(id, 'crm_basic') ? 'Básico' : false)),
        row('Contratos e documentos', (id) => feat(id, 'documents_my_docs')),
        row('Gestão de ativos', (id) => feat(id, 'asset_management')),
      ],
    },
    {
      name: 'Financeiro',
      rows: [
        row('Financeiro simples (entradas e saídas)', (id) => feat(id, 'finance_simple')),
        row('Financeiro completo (DRE, OFX, conciliação)', (id) => feat(id, 'finance_full')),
        row('Exportação DIMOB', (id) => feat(id, 'finance_full')),
        row('Boleto e Pix para inquilino', (id) => feat(id, 'finance_full')),
        row('Relatórios', (id) => (feat(id, 'reports_monthly') ? 'Completos' : feat(id, 'reports_overview') ? 'Básicos' : false)),
      ],
    },
    {
      name: 'Equipe e integrações',
      rows: [
        row('Gestão de equipe', team),
        row('Integrações e portais', (id) => {
          const list = p(id)?.features?.integrations;
          const n = Array.isArray(list) ? list.length : 0;
          return n > 0 ? 'Todas as integrações' : false;
        }),
        row('Suporte', (id) =>
          id === 'start' ? 'Central de ajuda' : id === 'essencial' ? 'Suporte por e-mail' : 'Suporte prioritário'),
      ],
    },
  ];
}

function ComparisonTable() {
  const [open, setOpen] = useState(true);
  const { data: pricing } = usePlanPricing();
  const categories = buildCategories(pricing);
  const planName = (id: PlanKey) =>
    ({ start: 'Start', essencial: 'Essencial', pro: 'Pro', business: 'Business' })[id];

  return (
    <section className="py-12 md:py-16 bg-card border-b border-border">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <p className="lp-eyebrow mb-3 text-accent">comparativo de recursos</p>
        <h2 className="lp-display text-[28px] md:text-[40px] mb-8 text-foreground">
          O que está incluso em cada plano
        </h2>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2 mb-6">
              {open ? 'Ocultar comparação' : 'Ver comparação completa'}
              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Desktop: tabela */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card max-h-[80vh]">
              <table className="w-full min-w-[860px] text-base">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-muted">
                    <th className="text-left p-4 text-lg font-semibold text-foreground">Recurso</th>
                    {PLAN_ORDER.map((id) => (
                      <th
                        key={id}
                        className={cn(
                          'p-4 text-lg font-semibold text-center text-foreground',
                          id === 'pro' && 'bg-accent/15'
                        )}>
                        {planName(id)}
                        {id === 'pro' && (
                          <span className="block text-xs font-medium uppercase tracking-wide text-accent">
                            Recomendado
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <Fragment key={cat.name}>
                      <tr>
                        <td colSpan={5} className="px-4 py-2 text-base font-semibold text-muted-foreground bg-muted/60 border-t border-border">
                          {cat.name}
                        </td>
                      </tr>
                      {cat.rows.map((r, idx) => (
                        <tr key={`${cat.name}-${r.feature}`} className={cn(idx % 2 === 1 && 'bg-muted/30')}>
                          <td className="p-4 text-base text-foreground">{r.feature}</td>
                          {PLAN_ORDER.map((id) => (
                            <td
                              key={id}
                              className={cn('p-4 text-center', id === 'pro' && 'bg-accent/[0.07]')}>
                              {renderCell(r.values[id])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: um card por plano */}
            <div className="md:hidden space-y-4">
              {PLAN_ORDER.map((id) => (
                <div
                  key={id}
                  className={cn(
                    'rounded-xl border bg-card p-4',
                    id === 'pro' ? 'border-accent shadow-md' : 'border-border'
                  )}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-lg font-semibold text-foreground">{planName(id)}</p>
                    {id === 'pro' && (
                      <span className="text-xs font-semibold uppercase text-accent">Recomendado</span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {categories.flatMap((cat) => cat.rows).map((r) => (
                      <li key={r.feature} className="flex items-start justify-between gap-3 text-base border-b border-border/60 pb-2 last:border-0">
                        <span className="text-muted-foreground">{r.feature}</span>
                        <span className="shrink-0 text-right">{renderCell(r.values[id])}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Assinatura eletrônica com validade jurídica não está inclusa: os contratos são gerados em PDF.
              No Business, a equipe compartilha as conversas de WhatsApp conforme as permissões definidas pelo usuário principal.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
}

/* ─── HERO PRICING ─── */
function PricingHero() {
  return (
    <section className="pt-28 pb-10 md:pt-36 md:pb-14 text-center" style={{ borderBottom: '1px solid var(--lp-line)' }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <p className="lp-eyebrow mb-4">planos e preços</p>
        <h1 className="lp-display text-[36px] md:text-[68px] leading-none mb-4" style={{ color: 'var(--lp-ink)' }}>
          preço transparente.
          <br />
          <em className="lp-serif" style={{ fontStyle: 'italic', color: 'var(--lp-accent)' }}>sem</em> surpresa.
        </h1>
        <p className="text-[15px] md:text-[17px] max-w-[50ch] mx-auto leading-relaxed" style={{ color: 'var(--lp-ink-soft)' }}>
          Comece grátis com o plano Start (inclui 7 dias do Pro). Faça upgrade só quando fizer sentido para o seu volume.
        </p>
      </div>
    </section>
  );
}

/* ─── ADD-ONS ─── */
function AddonsSection() {
  const addons = [
    {
      icon: Package,
      title: 'Pack +50 Unidades',
      desc: 'Expanda sua carteira de imóveis gerenciados sem mudar de plano. Ideal para quem cresce rápido.',
      price: 'R$ 39,90/mês',
      plans: 'Pro e Business',
      color: '#7B2FBE',
      bg: 'rgba(123,47,190,0.08)',
    },
    {
      icon: UserPlus,
      title: 'Usuário Extra',
      desc: 'Adicione um colaborador à sua equipe com acesso completo ao sistema.',
      price: 'R$ 49,90/mês',
      plans: 'Business',
      color: '#0B0073',
      bg: 'rgba(11,0,115,0.07)',
    },
    {
      icon: Sparkles,
      title: 'Créditos de IA',
      desc: 'Amplie os créditos de IA para resumir conversas, gerar textos e acelerar a rotina do corretor.',
      price: 'A partir de R$ 24,90',
      plans: 'Pro e Business',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
    },
  ];

  return (
    <section className="py-14 md:py-20" style={{ background: 'var(--lp-bg-alt, #F5F4FB)', borderTop: '1px solid var(--lp-line)', borderBottom: '1px solid var(--lp-line)' }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <p className="lp-eyebrow mb-3">opcionais avulsos</p>
        <h2 className="lp-display text-[28px] md:text-[44px] mb-10" style={{ color: 'var(--lp-ink)' }}>
          Turbine seu plano quando precisar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {addons.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.title}
                className="rounded-2xl border p-6 flex flex-col gap-4"
                style={{ borderColor: 'var(--lp-line)', background: '#fff' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: a.bg }}>
                  <Icon size={22} style={{ color: a.color }} strokeWidth={1.8} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[15px] mb-1" style={{ color: 'var(--lp-ink)' }}>{a.title}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--lp-ink-soft)' }}>{a.desc}</p>
                </div>
                <div className="pt-2" style={{ borderTop: '1px solid var(--lp-line)' }}>
                  <p className="font-bold text-[16px]" style={{ color: 'var(--lp-ink)' }}>{a.price}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--lp-mute)' }}>Disponível em: {a.plans}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function PricingFaq() {
  const faqs = [
    { q: 'Posso mudar de plano depois?', a: 'Sim. Você pode fazer upgrade ou downgrade a qualquer momento. No upgrade, a diferença de valor é cobrada proporcionalmente.' },
    { q: 'Quais formas de pagamento são aceitas?', a: 'Cartão de crédito, boleto bancário e PIX — todos processados pela Asaas, parceiro financeiro homologado pelo Banco Central.' },
    { q: 'O plano anual tem desconto?', a: 'Sim. No anual você economiza o equivalente a 2 meses comparado ao mensal. O valor é cobrado à vista anualmente.' },
    { q: 'Os add-ons são cobrados junto com a assinatura?', a: 'Sim. Os add-ons são cobrados mensalmente e cancelados individualmente a qualquer momento, sem afetar o plano principal.' },
    { q: 'Como funciona o período de 7 dias grátis?', a: 'Ao assinar qualquer plano pago, você tem 7 dias com acesso ao Pro sem cobrança. Após o período, a cobrança normal do plano escolhido se inicia.' },
  ];
  return (
    <section className="py-14 md:py-20">
      <div className="max-w-[860px] mx-auto px-5 md:px-10">
        <p className="lp-eyebrow mb-3">dúvidas frequentes</p>
        <h2 className="lp-display text-[28px] md:text-[40px] mb-8" style={{ color: 'var(--lp-ink)' }}>
          Tudo sobre planos e pagamento
        </h2>
        <Accordion type="single" collapsible defaultValue="item-0">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-[15px]" style={{ color: 'var(--lp-ink)' }}>{f.q}</AccordionTrigger>
              <AccordionContent className="text-[14px] leading-relaxed" style={{ color: 'var(--lp-ink-soft)' }}>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ─── PAGE ─── */
export default function Plans() {
  return (
    <div data-lp="v2" className="min-h-screen bg-background">
      <SEOHead
        title="Planos e preços — Slotimob para proprietários de imóveis"
        description="Start grátis para até 5 imóveis. Pro a partir de R$ 59,90/mês com boleto automático, reajuste IGPM/IPCA, DRE e relatório IR. Teste 7 dias sem cartão."
        path="/planos"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://slotimob.com.br/' },
              { '@type': 'ListItem', position: 2, name: 'Planos e Preços', item: 'https://slotimob.com.br/planos' },
            ],
          },
        ]}
      />
      <LpHeader />
      <main>
        <DiferencialSection />
        <ComparisonTable />
        <PricingHero />
        <div className="py-10 md:py-14" style={{ borderBottom: '1px solid var(--lp-line)' }}>
          <div className="max-w-[1280px] mx-auto px-5 md:px-10">
            <PricingSection />
          </div>
        </div>
        <AddonsSection />
        <PricingFaq />
      </main>
      <LpFooter />
    </div>
  );
}
