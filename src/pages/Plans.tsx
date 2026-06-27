import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, UserPlus, Sparkles, CheckCircle2, X, ChevronDown } from 'lucide-react';
import { LpHeader } from '@/components/landing/v2/LpHeader';
import '@/components/landing/v2/lp.css';
import { FooterSection } from '@/components/landing/FooterSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { SectionWrapper } from '@/components/marketing';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function PricingHero() {
  return (
    <section className="text-center py-16 px-4">
      <h1 className="text-4xl md:text-5xl font-bold text-foreground">
        Escolha seu plano
      </h1>
      <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
        Comece grátis. Faça upgrade quando precisar. Sem fidelidade.
      </p>
    </section>
  );
}

function AddonsSection() {
  const addons = [
    {
      icon: Package,
      title: '+50 Unidades',
      desc: 'Expanda para até +50 imóveis no seu plano atual',
      price: 'R$ 39,90/mês',
      availability: 'Disponível em: Pro e Business',
    },
    {
      icon: UserPlus,
      title: '+1 Usuário',
      desc: 'Adicione um colaborador à sua equipe',
      price: 'R$ 49,90/mês',
      availability: 'Disponível em: Business',
    },
  ];

  const aiPacks = [
    { credits: '+500 créditos', price: 'R$ 24,90', note: 'avulso', pack: 500 },
    { credits: '+1.000 créditos', price: 'R$ 39,90', note: 'avulso', pack: 1000 },
    { credits: '+2.000 créditos', price: 'R$ 89,90', note: 'economize 25%', pack: 2000 },
  ];

  return (
    <SectionWrapper background="muted">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Turbine seu plano
          </h2>
          <p className="text-muted-foreground mt-2">
            Add-ons opcionais para escalar quando precisar.
          </p>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-4">
          Add-ons de capacidade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {addons.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.title}
                className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-semibold text-foreground">{a.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground flex-1">{a.desc}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-foreground">{a.price}</span>
                  <span className="text-xs text-muted-foreground">{a.availability}</span>
                </div>
              </div>
            );
          })}
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Créditos de IA
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {aiPacks.map((p) => (
            <div
              key={p.pack}
              className="rounded-xl border border-border bg-card p-6 text-center flex flex-col gap-2"
            >
              <span className="text-base font-semibold text-foreground">{p.credits}</span>
              <span className="text-2xl font-bold text-foreground">{p.price}</span>
              <span className="text-xs text-muted-foreground">{p.note}</span>
              <Button asChild variant="outline" className="mt-2">
                <Link to={`/checkout?product=ai_credits&pack=${p.pack}`}>Comprar</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}

type Cell = boolean | string;
interface Row {
  feature: string;
  start: Cell;
  pro: Cell;
  business: Cell;
}
interface Category {
  name: string;
  rows: Row[];
}

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
    name: 'Contratos',
    rows: [
      { feature: 'Contratos digitais', start: true, pro: true, business: true },
      { feature: 'Assinatura eletrônica (sem validade jurídica*)', start: true, pro: true, business: true },
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
    name: 'Financeiro',
    rows: [
      { feature: 'Dashboard DRE', start: true, pro: true, business: true },
      { feature: 'Relatório IR', start: false, pro: true, business: true },
      { feature: 'Conciliação bancária (OFX)', start: false, pro: true, business: true },
      { feature: 'Exportação DIMOB', start: false, pro: true, business: true },
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
  if (v === true) return <CheckCircle2 className="h-5 w-5 text-accent mx-auto" />;
  if (v === false) return <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
  return <span className="text-sm text-foreground">{v}</span>;
}

function ComparisonTable() {
  const [open, setOpen] = useState(false);
  return (
    <SectionWrapper background="white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Compare todos os recursos
          </h2>
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="text-center">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="gap-2">
                {open ? 'Ocultar comparação' : 'Ver comparação completa'}
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
                />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-8">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-4 font-semibold text-foreground">Recurso</th>
                    <th className="p-4 font-semibold text-foreground text-center">Start</th>
                    <th className="p-4 font-semibold text-foreground text-center bg-accent/10">
                      Pro
                    </th>
                    <th className="p-4 font-semibold text-foreground text-center">Business</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <Fragment key={cat.name}>
                      <tr>
                        <td
                          colSpan={4}
                          className="bg-muted font-semibold text-sm text-foreground px-4 py-2 border-t border-border"
                        >
                          {cat.name}
                        </td>
                      </tr>
                      {cat.rows.map((row, idx) => (
                        <tr
                          key={`${cat.name}-${row.feature}`}
                          className={cn(idx % 2 === 1 && 'bg-muted/30')}
                        >
                          <td className="p-4 text-muted-foreground">{row.feature}</td>
                          <td className="p-4 text-center">{renderCell(row.start)}</td>
                          <td className="p-4 text-center bg-accent/5">
                            {renderCell(row.pro)}
                          </td>
                          <td className="p-4 text-center">{renderCell(row.business)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                * A validação jurídica das assinaturas está em desenvolvimento e será disponibilizada em breve.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </SectionWrapper>
  );
}

function PricingFaq() {
  const faqs = [
    {
      q: 'Posso mudar de plano depois?',
      a: 'Sim. Você pode fazer upgrade ou downgrade a qualquer momento. No upgrade, a diferença de valor é cobrada proporcionalmente.',
    },
    {
      q: 'O preço Early Adopter é para sempre?',
      a: 'Sim. O preço fica travado enquanto a assinatura estiver ativa. Se cancelar e reativar, pode perder o desconto.',
    },
    {
      q: 'Quais formas de pagamento são aceitas?',
      a: 'Cartão de crédito, boleto bancário e PIX — todos processados pela Asaas, parceiro financeiro homologado pelo Banco Central.',
    },
    {
      q: 'O plano anual tem desconto?',
      a: 'Sim. No anual você economiza o equivalente a 2 meses comparado ao mensal. O valor é cobrado à vista anualmente.',
    },
  ];
  return (
    <SectionWrapper background="white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Dúvidas sobre preços
          </h2>
        </div>
        <Accordion type="single" collapsible defaultValue="item-1">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i + 1}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionWrapper>
  );
}

export default function Plans() {
  return (
    <div className="min-h-screen bg-background">
      <LpHeader />
      <main className="pt-24">
        <PricingHero />
        <PricingSection />
        <AddonsSection />
        <ComparisonTable />
        <PricingFaq />
      </main>
      <FooterSection />
    </div>
  );
}
