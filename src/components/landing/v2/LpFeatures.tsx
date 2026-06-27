import {
  Receipt,
  TrendingUp,
  FileSignature,
  BarChart3,
  Users,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import SectionWrapper from '@/components/marketing/SectionWrapper';
import { Reveal } from './Reveal';

interface FeatureBlockProps {
  reverse?: boolean;
  icon: LucideIcon;
  badge: string;
  title: string;
  description: string;
  bullets: string[];
  mockup: React.ReactNode;
  index?: number;
}

function FeatureBlock({
  reverse = false,
  icon: Icon,
  badge,
  title,
  description,
  bullets,
  mockup,
  index = 0,
}: FeatureBlockProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      {/* Text column */}
      <Reveal delay={index * 60} className={reverse ? 'lg:order-2' : ''}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
          <Icon className="h-3.5 w-3.5" />
          {badge}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mt-3 leading-tight">
          {title}
        </h3>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          {description}
        </p>
        <ul className="mt-6 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* Mockup column */}
      <div className={reverse ? 'lg:order-1' : ''}>
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden transition-transform duration-300 hover:-translate-y-1">
          {mockup}
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable mockup primitives ─────────────────────────── */

function MockHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {right && <div className="text-xs text-muted-foreground">{right}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: 'paid' | 'pending' | 'late' | 'active' | 'interest' | 'sent' }) {
  const map = {
    paid: { label: 'Pago', cls: 'bg-accent/10 text-accent' },
    pending: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700' },
    late: { label: 'Atrasado', cls: 'bg-destructive/10 text-destructive' },
    active: { label: 'Ativo', cls: 'bg-accent/10 text-accent' },
    interest: { label: 'Interesse', cls: 'bg-primary/10 text-primary' },
    sent: { label: 'Enviada', cls: 'bg-amber-100 text-amber-700' },
  };
  const { label, cls } = map[status];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>{label}</span>;
}

/* ─── Block 1 — Boletos automáticos ──────────────────────── */
function MockBoletos() {
  const rows = [
    { addr: 'Rua das Flores, 42', val: 'R$ 1.200', status: 'paid' as const, Icon: CheckCircle2, color: 'text-accent' },
    { addr: 'Av. Paulista, 800', val: 'R$ 2.100', status: 'paid' as const, Icon: CheckCircle2, color: 'text-accent' },
    { addr: 'Rua Augusta, 15', val: 'R$ 900', status: 'pending' as const, Icon: Clock, color: 'text-amber-500' },
    { addr: 'Alameda Santos, 3', val: 'R$ 1.500', status: 'late' as const, Icon: AlertCircle, color: 'text-destructive' },
  ];
  return (
    <>
      <MockHeader title="Boletos — Junho 2025" right="12 boletos" />
      <div className="grid grid-cols-4 divide-x divide-border border-b border-border text-center">
        <KPI label="Todos" value="12" />
        <KPI label="Pagos" value="9" color="text-accent" />
        <KPI label="Pendentes" value="2" color="text-amber-500" />
        <KPI label="Atraso" value="1" color="text-destructive" />
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.addr} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <r.Icon className={`h-4 w-4 shrink-0 ${r.color}`} />
              <span className="truncate text-foreground">{r.addr}</span>
            </span>
            <span className="flex items-center gap-3 shrink-0">
              <span className="font-medium text-foreground tabular-nums">{r.val}</span>
              <StatusBadge status={r.status} />
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-t border-border">
        <MockButton primary>Gerar Boletos</MockButton>
        <MockButton>Enviar Lembretes</MockButton>
      </div>
    </>
  );
}

/* ─── Block 2 — Multa e Juros ────────────────────────────── */
function MockMulta() {
  return (
    <>
      <MockHeader title="Boleto em Atraso" right={<StatusBadge status="late" />} />
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm text-foreground">
          Inquilino: <span className="font-medium">João Silva</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Vencimento: 05/06/2025 · Hoje: 08/06/2025
        </p>
      </div>
      <div className="px-5 py-4 space-y-2 text-sm">
        <Row label="Valor original" value="R$ 1.200,00" />
        <Row label="Multa (10%)" value="+ R$ 120,00" color="text-foreground" />
        <Row label="Juros (3 dias)" value="+ R$ 10,80" color="text-foreground" />
        <div className="border-t border-border pt-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Total a pagar</span>
          <span className="text-destructive font-bold text-xl tabular-nums">R$ 1.330,80</span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-t border-border">
        <MockButton primary>Enviar cobrança</MockButton>
        <MockButton>Ver histórico</MockButton>
      </div>
    </>
  );
}

/* ─── Block 3 — Contratos ────────────────────────────────── */
function MockContrato() {
  return (
    <>
      <MockHeader title="Contrato de Locação" right="#2024-042" />
      <div className="px-5 py-4 border-b border-border space-y-1 text-sm">
        <p className="text-foreground">
          <span className="text-muted-foreground">Imóvel:</span> Rua das Flores, 42 — Apto 101
        </p>
        <p className="text-foreground">
          <span className="text-muted-foreground">Locatário:</span> Ana Costa
        </p>
        <p className="text-foreground">
          <span className="text-muted-foreground">Vigência:</span> 01/07/2025 a 30/06/2026
        </p>
        <p className="text-foreground">
          <span className="text-muted-foreground">Valor:</span> R$ 1.200/mês · Reajuste: IGPM
        </p>
      </div>
      <div className="px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Status das assinaturas
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Locador (você)
            </span>
            <span className="text-xs text-muted-foreground">Assinado 20/06/2025</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4 text-amber-500" />
              Locatário
            </span>
            <span className="text-xs text-amber-600">Aguardando…</span>
          </li>
        </ul>
      </div>
      <div className="flex items-center gap-2 px-5 py-3 bg-muted/30 border-t border-border">
        <MockButton primary>Reenviar link</MockButton>
        <MockButton>Ver documento</MockButton>
      </div>
    </>
  );
}

/* ─── Block 4 — DRE ──────────────────────────────────────── */
function MockDRE() {
  const rows = [
    { l: '(+) Receita Aluguel', m: '8.400', a: '42.000' },
    { l: '(+) Multas/Juros', m: '330', a: '1.200' },
    { l: '(−) Manutenções', m: '(450)', a: '(2.100)' },
    { l: '(−) IPTU/Condomínio', m: '(0)', a: '(3.600)' },
  ];
  return (
    <>
      <MockHeader title="DRE — Junho 2025" />
      <div className="px-5 py-4">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2 text-sm">
          <span />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Mês</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Acumulado</span>
          {rows.map((r) => (
            <Row3 key={r.l} l={r.l} m={r.m} a={r.a} />
          ))}
          <div className="col-span-3 border-t border-border pt-2 mt-1 grid grid-cols-[1fr_auto_auto] gap-x-6">
            <span className="font-semibold text-foreground">Resultado Líquido</span>
            <span className="text-accent font-bold text-xl tabular-nums text-right">8.280</span>
            <span className="text-accent font-bold text-xl tabular-nums text-right">37.500</span>
          </div>
        </div>
      </div>
    </>
  );
}

function Row3({ l, m, a }: { l: string; m: string; a: string }) {
  return (
    <>
      <span className="text-foreground">{l}</span>
      <span className="text-foreground tabular-nums text-right">{m}</span>
      <span className="text-muted-foreground tabular-nums text-right">{a}</span>
    </>
  );
}

/* ─── Block 5 — CRM Pipeline ─────────────────────────────── */
function MockCRM() {
  const columns = [
    {
      title: 'Prospects',
      count: 2,
      cards: [{ name: 'Carlos M.', addr: 'Flores, 42', val: 'R$ 1.200', status: 'interest' as const }],
    },
    {
      title: 'Proposta',
      count: 1,
      cards: [{ name: 'Beatriz S.', addr: 'Augusta, 15', val: 'R$ 900', status: 'sent' as const }],
    },
    {
      title: 'Ativo',
      count: 9,
      cards: [{ name: 'Ana Costa', addr: 'Paulista, 800', val: 'R$ 2.100', status: 'active' as const }],
    },
  ];
  return (
    <>
      <MockHeader title="Pipeline de Locações" right="12 contratos" />
      <div className="grid grid-cols-3 gap-3 p-4 bg-muted/30">
        {columns.map((c) => (
          <div key={c.title} className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>{c.title}</span>
              <span>{c.count}</span>
            </div>
            {c.cards.map((card) => (
              <div key={card.name} className="rounded-lg border border-border bg-card p-2.5 text-[11px] space-y-1">
                <p className="font-semibold text-foreground">{card.name}</p>
                <p className="text-muted-foreground">{card.addr}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-medium text-foreground tabular-nums">{card.val}</span>
                  <StatusBadge status={card.status} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── Block 6 — Chat IA ──────────────────────────────────── */
function MockChatIA() {
  return (
    <>
      <MockHeader
        title="IA Slotimob"
        right={
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Online
          </span>
        }
      />
      <div className="px-5 py-4 space-y-3 bg-muted/20 min-h-[280px]">
        <UserMsg>Posso cobrar multa após 3 dias?</UserMsg>
        <AiMsg>
          Sim! Pela Lei 8.245/91, o locador pode cobrar multa de até 10% + juros de
          1% ao mês após o vencimento. No Slotimob isso é calculado automaticamente. 💡
        </AiMsg>
        <UserMsg>E o reajuste IGPM de junho?</UserMsg>
        <AiMsg>
          O IGPM de junho/2025 foi 0,68%. Para R$ 1.200, o novo valor é{' '}
          <span className="font-semibold text-foreground">R$ 1.208,16</span>.
        </AiMsg>
      </div>
      <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-card">
        <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          Digite sua dúvida…
        </div>
        <MockButton primary>Enviar</MockButton>
      </div>
    </>
  );
}

function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-primary text-primary-foreground rounded-lg rounded-tr-sm px-3 py-2 text-sm">
        {children}
      </div>
    </div>
  );
}
function AiMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-muted text-foreground rounded-lg rounded-tl-sm px-3 py-2 text-sm">
        {children}
      </div>
    </div>
  );
}

/* ─── Shared atoms ───────────────────────────────────────── */

function KPI({ label, value, color = 'text-foreground' }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, color = 'text-muted-foreground' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${color} tabular-nums`}>{value}</span>
    </div>
  );
}

function MockButton({ children, primary = false }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span
      className={
        primary
          ? 'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-accent text-accent-foreground'
          : 'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border border-border text-foreground bg-background'
      }
    >
      {children}
    </span>
  );
}

/* ─── Main section ───────────────────────────────────────── */

export function LpFeatures() {
  return (
    <SectionWrapper background="muted" id="funcionalidades">
      <Reveal>
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            Sistema que trabalha enquanto você dorme
          </h2>
          <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
            Tudo o que você precisa para gerir seus imóveis sem esforço, em um único lugar.
          </p>
        </div>
      </Reveal>

      <div className="space-y-20 md:space-y-28">
        <FeatureBlock
          index={0}
          icon={Receipt}
          badge="Cobranças"
          title="Boletos gerados no automático, todo mês"
          description="Boletos criados e enviados via email e WhatsApp sem você tocar em nada. Nunca mais perca o dia do vencimento."
          bullets={[
            'Geração automática no dia configurado',
            'Envio por email e WhatsApp simultaneamente',
            'Segunda via gerada em 1 clique',
          ]}
          mockup={<MockBoletos />}
        />

        <FeatureBlock
          index={1}
          reverse
          icon={TrendingUp}
          badge="Inadimplência"
          title="Atraso custa caro. Para quem não paga."
          description="Multa de 10% + juros automáticos a cada atraso. Você não precisa cobrar: o sistema cobra."
          bullets={[
            'Multa configurável (até 10%)',
            'Juros por dia de atraso calculados automaticamente',
            'Régua de cobrança: email D+1, D+3, D+7',
          ]}
          mockup={<MockMulta />}
        />

        <FeatureBlock
          index={2}
          icon={FileSignature}
          badge="Contratos"
          title="Contratos e documentos"
          description="Modelos prontos inclusos. Geração de PDF em um clique. Controle automático de vigências, reajustes e alertas de vencimento."
          bullets={[
            'Modelos prontos de contrato de locação',
            'Contratos digitais e documentos organizados no sistema',
            'Reajuste automático no vencimento (IGPM/IPCA)',
          ]}
          mockup={<MockContrato />}
        />

        <FeatureBlock
          index={3}
          reverse
          icon={BarChart3}
          badge="Financeiro"
          title="Saiba exatamente quanto cada imóvel rende"
          description="DRE, fluxo de caixa e relatórios prontos para o IR. Visão clara de receitas, despesas e lucro líquido por imóvel."
          bullets={[
            'DRE mensal e anual por imóvel',
            'Fluxo de caixa com projeção',
            'Relatório formatado para declaração de IR',
          ]}
          mockup={<MockDRE />}
        />

        <FeatureBlock
          index={4}
          icon={Users}
          badge="CRM"
          title="Todos os seus inquilinos, contratos e vencimentos em um lugar"
          description="Pipeline visual de locações: saiba o status de cada contrato, qual vence em breve e quem está em atraso."
          bullets={[
            'Pipeline Kanban por status de contrato',
            'Alertas automáticos de vencimento',
            'Histórico completo por inquilino',
          ]}
          mockup={<MockCRM />}
        />

        <FeatureBlock
          index={5}
          reverse
          icon={Sparkles}
          badge="Inteligência Artificial"
          title="IA especializada em gestão de imóveis"
          description="Tire dúvidas sobre contratos, leis de locação, reajustes e gestão. Disponível 24h."
          bullets={[
            'Treinada com a Lei do Inquilinato (Lei 8.245/91)',
            'Redige cláusulas contratuais sob demanda',
            'Calcula reajuste IGPM/IPCA na hora',
          ]}
          mockup={<MockChatIA />}
        />
      </div>
    </SectionWrapper>
  );
}
