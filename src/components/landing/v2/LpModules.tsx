import { Reveal } from './Reveal';

const MODULES = [
  {
    n: '01',
    name: 'crm e pipeline',
    desc: 'Kanban com drag-and-drop, estágios personalizados, histórico automático de cada negociação, ações em massa e temperatura de lead.',
  },
  {
    n: '02',
    name: 'contatos',
    desc: 'Base centralizada com filtros avançados, vínculo automático com conversas, propostas e negociações em aberto.',
  },
  {
    n: '03',
    name: 'imóveis e unidades',
    desc: 'Inventário completo por empreendimento, status de disponibilidade, fotos, documentos e limites por plano.',
  },
  {
    n: '04',
    name: 'financeiro',
    desc: 'Transações, DRE por categoria, conciliação bancária com importação OFX e matcher automático, recorrências, parcelas e exportação PDF/Excel.',
  },
  {
    n: '05',
    name: 'contratos e locação',
    desc: 'Geração automatizada de contratos em PDF com variáveis preenchidas a partir do imóvel, locatário e proprietário.',
  },
  {
    n: '06',
    name: 'documentos',
    desc: 'Templates prontos por categoria e geração automática em PDF, com armazenamento auditado por imóvel e contrato.',
  },
  {
    n: '07',
    name: 'relatórios',
    desc: 'Relatórios semanal, mensal e DIMOB para prestação de contas, obrigações fiscais e tomada de decisão.',
  },
  {
    n: '08',
    name: 'whatsapp integrado',
    desc: 'Instâncias conectadas via integração inteligente, painel de CRM ao lado do chat, vínculo automático de conversa a contato e controle de créditos.',
  },
  {
    n: '09',
    name: 'chat ia',
    desc: 'Assistente de IA com créditos mensais para resumir conversas, gerar respostas e acelerar a rotina do corretor.',
  },
  {
    n: '10',
    name: 'agenda e equipe',
    desc: 'Agenda integrada com visitas e prazos, gestão de equipe com papéis (plano Business), tema claro/escuro e PWA instalável.',
  },
];

export function LpModules() {
  return (
    <section id="modulos" className="py-16 md:py-24">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 mb-16 md:mb-24">
          <div className="col-span-12 md:col-span-3">
            <Reveal>
              <p className="lp-eyebrow">o que está incluído</p>
            </Reveal>
          </div>
          <div className="col-span-12 md:col-span-9">
            <Reveal delay={80}>
              <h2 className="lp-display text-[44px] md:text-[88px]">
                dez módulos.
                <br />
                <em className="lp-serif" style={{ fontStyle: 'italic', color: 'var(--lp-accent)' }}>uma</em> só plataforma.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 md:mt-8 text-[15px] md:text-[17px] leading-relaxed max-w-[55ch]"
                style={{ color: 'var(--lp-ink-soft)' }}>
                Cada módulo foi desenhado para conversar com os outros. Sem integrações
                instáveis, sem dados duplicados, sem trocar de aba para fechar um negócio.
              </p>
            </Reveal>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {MODULES.map((m, i) => (
            <Reveal key={m.n} delay={i * 35} y={20}>
              <div
                className="group relative flex flex-col gap-3 p-6 rounded-2xl border transition-all duration-300 cursor-default hover:shadow-lg hover:-translate-y-1"
                style={{
                  borderColor: 'var(--lp-line)',
                  background: 'var(--lp-card)',
                }}
              >
                <span
                  className="lp-num lp-serif text-[13px]"
                  style={{ color: 'var(--lp-mute)' }}
                >
                  {m.n}
                </span>
                <h3
                  className="lp-serif text-[22px] leading-tight transition-colors duration-300 group-hover:text-[var(--lp-accent)]"
                  style={{ color: 'var(--lp-ink)' }}
                >
                  {m.name}
                </h3>
                <p
                  className="text-[13px] leading-relaxed flex-1"
                  style={{ color: 'var(--lp-ink-soft)' }}
                >
                  {m.desc}
                </p>
                <span
                  className="w-6 h-0.5 transition-all duration-300 group-hover:w-10"
                  style={{ background: 'var(--lp-accent)' }}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
