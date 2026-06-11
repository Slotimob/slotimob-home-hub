import { useState, useRef, KeyboardEvent } from 'react';
import { Reveal } from './Reveal';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Send } from 'lucide-react';

type TabId = 'dashboard' | 'pipeline' | 'financeiro' | 'whatsapp';

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'dashboard' },
  { id: 'pipeline', label: 'pipeline' },
  { id: 'financeiro', label: 'financeiro' },
  { id: 'whatsapp', label: 'whatsapp' },
];

export default function LpDemo() {
  const [active, setActive] = useState<TabId>('dashboard');
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    dashboard: null, pipeline: null, financeiro: null, whatsapp: null,
  });

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = TABS.findIndex((t) => t.id === active);
    if (e.key === 'ArrowRight') {
      const next = TABS[(idx + 1) % TABS.length].id;
      setActive(next);
      tabRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft') {
      const prev = TABS[(idx - 1 + TABS.length) % TABS.length].id;
      setActive(prev);
      tabRefs.current[prev]?.focus();
    }
  };

  return (
    <section id="demo" className="py-24 md:py-36 lp-dark">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-4">
            <Reveal>
              <p className="lp-eyebrow">04 — quick peek</p>
            </Reveal>
          </div>
          <div className="col-span-12 md:col-span-8">
            <Reveal delay={80}>
              <h2 className="lp-display text-[40px] md:text-[80px]">
                sinta o produto
                <br />
                <em className="lp-serif" style={{ fontStyle: 'italic', color: '#2FC9AF' }}>antes</em> de assinar.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-6 max-w-[55ch] text-[15px] md:text-[16px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Uma amostra interativa do sistema. Tudo abaixo roda no seu navegador,
                com dados fictícios — arraste, troque de abas, marque transações.
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={200}>
          <div className="lp-card" style={{ background: '#1F1E1B', borderColor: 'rgba(255,255,255,0.12)' }}>
            {/* Window chrome */}
            <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
              </div>
              <span className="ml-auto text-[10px] tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
                demonstração · dados fictícios
              </span>
            </div>

            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Demonstração do sistema"
              className="flex overflow-x-auto lp-scroll-x border-b"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              {TABS.map((t) => {
                const isActive = active === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${t.id}`}
                    id={`tab-${t.id}`}
                    tabIndex={isActive ? 0 : -1}
                    ref={(el) => (tabRefs.current[t.id] = el)}
                    onClick={() => setActive(t.id)}
                    onKeyDown={onTabKey}
                    className="px-5 md:px-7 py-4 text-[13px] tracking-wide whitespace-nowrap transition-colors relative"
                    style={{
                      color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {t.label}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-px"
                        style={{ background: '#2FC9AF' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-5 md:p-8 min-h-[520px]">
              {active === 'dashboard' && <DemoDashboard />}
              {active === 'pipeline' && <DemoPipeline />}
              {active === 'financeiro' && <DemoFinance />}
              {active === 'whatsapp' && <DemoWhatsApp />}
            </div>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <div className="mt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              isso é só uma amostra. teste o sistema completo grátis por 14 dias.
            </p>
            <Link to="/auth?trial=pro" className="lp-btn lp-btn-primary" style={{ background: '#FFFFFF', color: '#0B0073' }}>
              começar trial pro <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────── DASHBOARD ─────────────── */

function DemoDashboard() {
  return (
    <div
      id="panel-dashboard"
      role="tabpanel"
      aria-labelledby="tab-dashboard"
      tabIndex={0}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { l: 'vgv', v: 'R$ 8,4M', d: '+12%' },
          { l: 'negociações', v: '31', d: '+5' },
          { l: 'receita mês', v: 'R$ 62k', d: '+8%' },
          { l: 'visitas', v: '24', d: '+11' },
        ].map((k) => (
          <div key={k.l} className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
            <p className="lp-eyebrow mb-1.5">{k.l}</p>
            <p className="lp-serif text-2xl md:text-3xl" style={{ color: '#FFFFFF' }}>{k.v}</p>
            <p className="text-[11px] mt-1" style={{ color: '#2FC9AF' }}>{k.d}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 p-5 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex justify-between items-baseline mb-4">
            <p className="text-[13px] font-medium" style={{ color: '#FFFFFF' }}>receita por mês</p>
            <span className="lp-eyebrow">últimos 6 meses</span>
          </div>
          <div className="flex items-end gap-3 h-44">
            {[40, 55, 48, 70, 62, 88].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t transition-all duration-700"
                  style={{ height: `${h}%`, background: i === 5 ? '#2FC9AF' : 'rgba(255,255,255,0.18)' }}
                />
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {['out', 'nov', 'dez', 'jan', 'fev', 'mar'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 md:col-span-4 p-5 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-[13px] font-medium mb-3" style={{ color: '#FFFFFF' }}>próximas visitas</p>
          {[
            { h: '10:30', n: 'Marina Souza', i: 'Apto 401 · Vila Madalena' },
            { h: '14:00', n: 'Roberto Castro', i: 'Casa · Pinheiros' },
            { h: '17:15', n: 'Ana Lima', i: 'Studio · Itaim' },
          ].map((v) => (
            <div key={v.h} className="flex gap-3 py-3 border-b text-[12px]" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <span className="lp-num lp-serif text-lg" style={{ color: '#2FC9AF' }}>{v.h}</span>
              <div>
                <p style={{ color: '#FFFFFF' }}>{v.n}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{v.i}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── PIPELINE (drag & drop) ─────────────── */

type Card = { id: string; name: string; prop: string; value: string };
type Cols = Record<string, { title: string; cards: Card[] }>;

const initialCols: Cols = {
  novos: { title: 'novos', cards: [
    { id: 'c1', name: 'Marina Souza', prop: 'Apto 2q · Vila Madalena', value: 'R$ 720k' },
    { id: 'c2', name: 'João Pereira', prop: 'Casa · Pinheiros', value: 'R$ 1,2M' },
    { id: 'c3', name: 'Ana Lima', prop: 'Studio · Itaim', value: 'R$ 480k' },
  ]},
  visita: { title: 'visita', cards: [
    { id: 'c4', name: 'Carlos Mendes', prop: 'Cobertura · Jardins', value: 'R$ 2,8M' },
    { id: 'c5', name: 'Paula Reis', prop: 'Apto 3q · Moema', value: 'R$ 980k' },
  ]},
  proposta: { title: 'proposta', cards: [
    { id: 'c6', name: 'Roberto Castro', prop: 'Casa · Alto de Pinheiros', value: 'R$ 1,9M' },
  ]},
  fechando: { title: 'fechando', cards: [
    { id: 'c7', name: 'Helena Tavares', prop: 'Apto 2q · Perdizes', value: 'R$ 680k' },
  ]},
};

function DemoPipeline() {
  const [cols, setCols] = useState<Cols>(initialCols);
  const dragId = useRef<string | null>(null);
  const dragFrom = useRef<string | null>(null);

  const onDragStart = (cardId: string, fromCol: string) => {
    dragId.current = cardId;
    dragFrom.current = fromCol;
  };

  const onDrop = (toCol: string) => {
    const cardId = dragId.current;
    const fromCol = dragFrom.current;
    if (!cardId || !fromCol || fromCol === toCol) return;
    setCols((prev) => {
      const card = prev[fromCol].cards.find((c) => c.id === cardId);
      if (!card) return prev;
      return {
        ...prev,
        [fromCol]: { ...prev[fromCol], cards: prev[fromCol].cards.filter((c) => c.id !== cardId) },
        [toCol]: { ...prev[toCol], cards: [...prev[toCol].cards, card] },
      };
    });
    dragId.current = null;
    dragFrom.current = null;
  };

  return (
    <div id="panel-pipeline" role="tabpanel" aria-labelledby="tab-pipeline">
      <p className="text-[12px] mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
        arraste os cartões entre as colunas →
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lp-scroll-x">
        {Object.entries(cols).map(([key, col]) => (
          <div
            key={key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(key)}
            className="p-3 rounded min-h-[280px]"
            style={{ background: 'rgba(255,255,255,0.04)' }}
            aria-label={`Coluna ${col.title}`}
          >
            <div className="flex justify-between items-baseline mb-3">
              <span className="lp-eyebrow">{col.title}</span>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{col.cards.length}</span>
            </div>
            <div className="space-y-2">
              {col.cards.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => onDragStart(c.id, key)}
                  className="p-3 rounded text-[12px] cursor-grab active:cursor-grabbing transition-all hover:translate-x-0.5"
                  style={{ background: '#FFFFFF', color: '#0B0073' }}
                  aria-grabbed={dragId.current === c.id}
                >
                  <p className="font-medium">{c.name}</p>
                  <p style={{ color: 'var(--lp-mute)', fontSize: 11 }}>{c.prop}</p>
                  <p className="lp-num mt-1.5" style={{ color: 'var(--lp-accent)', fontSize: 13 }}>{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── FINANCEIRO ─────────────── */

const initialTxs = [
  { id: 't1', d: '02/mar', desc: 'Aluguel Apto 301', cat: 'receita', v: 3200, ok: false },
  { id: 't2', d: '04/mar', desc: 'Condomínio Sala 12', cat: 'despesa', v: -980, ok: true },
  { id: 't3', d: '08/mar', desc: 'Comissão venda Apto 71', cat: 'receita', v: 12500, ok: false },
  { id: 't4', d: '12/mar', desc: 'IPTU parcela 3/10', cat: 'despesa', v: -640, ok: false },
  { id: 't5', d: '18/mar', desc: 'Repasse proprietário M.S.', cat: 'despesa', v: -2880, ok: true },
];

function DemoFinance() {
  const [txs, setTxs] = useState(initialTxs);
  const toggle = (id: string) =>
    setTxs((prev) => prev.map((t) => (t.id === id ? { ...t, ok: !t.ok } : t)));

  const receita = txs.filter((t) => t.v > 0).reduce((s, t) => s + t.v, 0);
  const despesa = txs.filter((t) => t.v < 0).reduce((s, t) => s + Math.abs(t.v), 0);
  const result = receita - despesa;

  return (
    <div id="panel-financeiro" role="tabpanel" aria-labelledby="tab-financeiro" className="grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-7">
        <p className="lp-eyebrow mb-3">transações · março</p>
        <div className="rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {txs.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b text-[12px]"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => toggle(t.id)}
                className="w-4 h-4 rounded-sm flex items-center justify-center transition-all"
                style={{
                  background: t.ok ? '#2FC9AF' : 'transparent',
                  border: `1px solid ${t.ok ? '#2FC9AF' : 'rgba(255,255,255,0.3)'}`,
                }}
                aria-label={t.ok ? `Desmarcar ${t.desc}` : `Conciliar ${t.desc}`}
              >
                {t.ok && <Check className="w-3 h-3" style={{ color: '#0B0073' }} />}
              </button>
              <span className="lp-num w-12" style={{ color: 'rgba(255,255,255,0.55)' }}>{t.d}</span>
              <span className="flex-1" style={{ color: '#FFFFFF' }}>{t.desc}</span>
              <span className="lp-num" style={{ color: t.v > 0 ? '#2FC9AF' : 'rgba(255,255,255,0.7)' }}>
                {t.v > 0 ? '+' : ''}R$ {Math.abs(t.v).toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-12 md:col-span-5">
        <p className="lp-eyebrow mb-3">mini dre</p>
        <div className="space-y-4 p-5 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <BarRow label="receitas" value={receita} max={Math.max(receita, despesa)} color="#2FC9AF" />
          <BarRow label="despesas" value={despesa} max={Math.max(receita, despesa)} color="rgba(255,255,255,0.4)" />
          <div className="pt-4 border-t flex items-baseline justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
            <span className="lp-eyebrow">resultado</span>
            <span className="lp-serif text-2xl" style={{ color: result >= 0 ? '#2FC9AF' : '#E07A5F' }}>
              {result >= 0 ? '+' : ''}R$ {result.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[12px] mb-1.5">
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
        <span className="lp-num" style={{ color: '#FFFFFF' }}>R$ {value.toLocaleString('pt-BR')}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─────────────── WHATSAPP ─────────────── */

function DemoWhatsApp() {
  return (
    <div id="panel-whatsapp" role="tabpanel" aria-labelledby="tab-whatsapp" className="grid grid-cols-12 gap-4 min-h-[440px]">
      {/* Conv list */}
      <aside className="col-span-12 md:col-span-3 rounded p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[
          { n: 'Marina Souza', l: 'Topo, vou agendar', t: '10:42', a: true },
          { n: 'Roberto Castro', l: 'Recebi a proposta', t: '09:15', a: false },
          { n: 'Ana Lima', l: 'Posso ver hoje?', t: 'ontem', a: false },
        ].map((c) => (
          <div key={c.n} className={`p-2.5 rounded text-[11px] mb-1 ${c.a ? 'ring-1' : ''}`}
            style={{ background: c.a ? 'rgba(47,201,175,0.1)' : 'transparent' }}>
            <div className="flex justify-between mb-0.5">
              <span style={{ color: '#FFFFFF' }}>{c.n}</span>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>{c.t}</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>{c.l}</p>
          </div>
        ))}
      </aside>

      {/* Chat */}
      <div className="col-span-12 md:col-span-6 rounded flex flex-col" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="w-8 h-8 rounded-full" style={{ background: '#2FC9AF' }} />
          <div>
            <p className="text-[12px]" style={{ color: '#FFFFFF' }}>Marina Souza</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>+55 11 9 8765-4321</p>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3 text-[12px]">
          <Bubble side="them">Oi! Tem visita disponível pro apto 401?</Bubble>
          <Bubble side="me">Olá Marina! Tenho às 10h30 amanhã. Funciona?</Bubble>
          <Bubble side="them">Topo, vou agendar 🙂</Bubble>
        </div>
        <div className="px-4 py-3 border-t flex gap-2 items-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex-1 px-3 py-2 rounded text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
            digite uma mensagem...
          </div>
          <button className="p-2 rounded" style={{ background: '#2FC9AF' }} aria-label="Enviar mensagem">
            <Send className="w-4 h-4" style={{ color: '#0B0073' }} />
          </button>
        </div>
      </div>

      {/* Contact panel */}
      <aside className="col-span-12 md:col-span-3 rounded p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <p className="lp-eyebrow mb-3">contato</p>
        <p className="lp-serif text-lg mb-1" style={{ color: '#FFFFFF' }}>Marina Souza</p>
        <p className="text-[11px] mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Lead · WhatsApp</p>
        <div className="space-y-2 text-[11px]">
          {[
            ['origem', 'Instagram Ads'],
            ['interesse', 'Apto 2q · até R$ 750k'],
            ['estágio', 'visita agendada'],
            ['temperatura', 'quente'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b pb-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{k}</span>
              <span style={{ color: '#FFFFFF' }}>{v}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Bubble({ side, children }: { side: 'me' | 'them'; children: React.ReactNode }) {
  const me = side === 'me';
  return (
    <div className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
      <div className="px-3 py-2 rounded-2xl max-w-[80%]"
        style={{
          background: me ? '#2FC9AF' : 'rgba(255,255,255,0.1)',
          color: me ? '#0B0073' : '#FFFFFF',
          borderBottomRightRadius: me ? 4 : 16,
          borderBottomLeftRadius: me ? 16 : 4,
        }}>
        {children}
      </div>
    </div>
  );
}
