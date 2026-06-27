import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, UserPlus, Sparkles, MessageSquare,
  CheckCircle2, X, ChevronDown,
} from 'lucide-react';
import { LpHeader } from '@/components/landing/v2/LpHeader';
import { LpFooter } from '@/components/landing/v2/LpFooter';
import '@/components/landing/v2/lp.css';
import { PricingSection } from '@/components/landing/PricingSection';
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
    <section className="py-14 md:py-20" style={{ background: '#fff', borderBottom: '1px solid var(--lp-line)' }}>
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
interface Row { feature: string; start: Cell; pro: Cell; business: Cell }
interface Category { name: string; rows: Row[] }

const categories: Category[] = [
  {
    name: 'Imóveis e Usuários',
    rows: [
      { feature: 'Imóveis', start: '5', pro: '50', business: '150' },
      { feature: 'Usuários', start: '1', pro: '1', business: '4' },
    ],
  },
  {
    name: 'Cobranças',
    rows: [
      { feature: 'Boleto e Pix automático para inquilino', start: false, pro: true, business: true },
      { feature: 'Régua de cobrança automática', start: false, pro: true, business: true },
      { feature: 'Multa e juros automáticos', start: false, pro: true, business: true },
      { feature: 'Reajuste IGPM/IPCA automático', start: false, pro: true, business: true },
    ],
  },
  {
    name: 'Financeiro',
    rows: [
      { feature: 'Dashboard DRE', start: true, pro: true, business: true },
      { feature: 'Relatório IR', start: false, pro: true, business: true },
      { feature: 'Conciliação bancária (OFX)', start: false, pro: true, business: true },
      { feature: 'Exportação DIMOB', start: false, pro: true, business: true },
    ],
  },
  {
    name: 'Contratos',
    rows: [
      { feature: 'Contratos digitais', start: true, pro: true, business: true },
      { feature: 'Assinatura eletrônica (em breve *)', start: false, pro: true, business: true },
      { feature: 'Reajuste automático IGPM', start: false, pro: true, business: true },
    ],
  },
  {
    name: 'Comunicação',
    rows: [
      { feature: 'WhatsApp integrado', start: false, pro: '1 instância', business: 'Múltiplas' },
    ],
  },
  {
    name: 'IA',
    rows: [
      { feature: 'Chat IA', start: false, pro: '250 créditos', business: '750 créditos' },
    ],
  },
];

function renderCell(v: Cell) {
  if (v === true) return <CheckCircle2 className="h-5 w-5 mx-auto" style={{ color: 'var(--lp-accent)' }} />;
  if (v === false) return <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
  return <span className="text-sm text-foreground">{v}</span>;
}

function ComparisonTable() {
  const [open, setOpen] = useState(true);
  return (
    <section className="py-12 md:py-16" style={{ background: 'var(--lp-ink)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <p className="lp-eyebrow mb-3" style={{ color: 'var(--lp-accent)' }}>comparativo de recursos</p>
        <h2 className="lp-display text-[28px] md:text-[40px] mb-8" style={{ color: '#fff' }}>
          O que está incluso em cada plano
        </h2>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 mb-6"
              style={{ background: '#fff', borderColor: '#d1d5db', color: '#111827' }}
            >
              {open ? 'Ocultar comparação' : 'Ver comparação completa'}
              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="overflow-x-auto rounded-xl" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th className="text-left p-4 font-semibold" style={{ color: '#0f172a' }}>Recurso</th>
                    <th className="p-4 font-semibold text-center" style={{ color: '#0f172a' }}>Start</th>
                    <th className="p-4 font-semibold text-center" style={{ color: '#0f172a', background: 'rgba(20,217,180,0.10)' }}>Pro</th>
                    <th className="p-4 font-semibold text-center" style={{ color: '#0f172a' }}>Business</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <Fragment key={cat.name}>
                      <tr>
                        <td
                          colSpan={4}
                          className="font-semibold text-sm px-4 py-2"
                          style={{ background: '#f1f5f9', color: '#374151', borderTop: '1px solid #e2e8f0' }}
                        >
                          {cat.name}
                        </td>
                      </tr>
                      {cat.rows.map((row, idx) => (
                        <tr
                          key={`${cat.name}-${row.feature}`}
                          style={{ background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}
                        >
                          <td className="p-4" style={{ color: '#374151' }}>{row.feature}</td>
                          <td className="p-4 text-center">{renderCell(row.start)}</td>
                          <td className="p-4 text-center" style={{ background: idx % 2 === 1 ? 'rgba(20,217,180,0.07)' : 'rgba(20,217,180,0.04)' }}>
                            {renderCell(row.pro)}
                          </td>
                          <td className="p-4 text-center">{renderCell(row.business)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs" style={{ color: '#6b7280', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                * Assinatura eletrônica com validade jurídica está em desenvolvimento e será disponibilizada em breve.
              </p>
            </div>
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
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: 'rgba(20,217,180,0.12)', color: 'var(--lp-accent)', border: '1px solid rgba(20,217,180,0.3)' }}>
          🏷️ Promoção de Lançamento — preço travado enquanto a assinatura estiver ativa
        </div>
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
      icon: MessageSquare,
      title: 'Créditos de WhatsApp',
      desc: 'Amplie sua capacidade de disparos automáticos, notificações de cobrança e atendimento via WhatsApp.',
      price: 'A partir de R$ 19,90',
      plans: 'Pro e Business',
      color: '#25D366',
      bg: 'rgba(37,211,102,0.10)',
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
    { q: 'O preço da Promoção de Lançamento é para sempre?', a: 'Sim. O preço fica travado enquanto a assinatura estiver ativa. Se cancelar e reativar, pode perder o desconto de lançamento.' },
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
