import {
  BarChart3, Users, Building2, Wallet, FileText, FolderOpen,
  TrendingUp, MessageSquare, Sparkles, CalendarDays,
} from 'lucide-react';
import { Reveal } from './Reveal';

const MODULES = [
  {
    n: '01', icon: Users, color: '#7B2FBE', bg: 'rgba(123,47,190,0.08)',
    name: 'crm e pipeline',
    desc: 'Kanban com drag-and-drop, estágios personalizados, histórico automático de cada negociação, ações em massa e temperatura de lead.',
  },
  {
    n: '02', icon: Building2, color: '#0B0073', bg: 'rgba(11,0,115,0.07)',
    name: 'imóveis e unidades',
    desc: 'Inventário completo por empreendimento, status de disponibilidade, fotos, documentos e limites por plano.',
  },
  {
    n: '03', icon: Wallet, color: '#14D9B4', bg: 'rgba(20,217,180,0.10)',
    name: 'financeiro',
    desc: 'Transações, DRE por categoria, conciliação bancária OFX, matcher automático, recorrências, parcelas e exportação PDF/Excel.',
  },
  {
    n: '04', icon: FileText, color: '#E05C2A', bg: 'rgba(224,92,42,0.08)',
    name: 'contratos e locação',
    desc: 'Geração automatizada de contratos em PDF com variáveis preenchidas a partir do imóvel, locatário e proprietário.',
  },
  {
    n: '05', icon: FolderOpen, color: '#2E7BEA', bg: 'rgba(46,123,234,0.08)',
    name: 'documentos',
    desc: 'Templates prontos por categoria e geração automática em PDF, com armazenamento auditado por imóvel e contrato.',
  },
  {
.    n: '06', icon: TrendingUp, color: '#059669', bg: 'rgba(5,150,105,0.08)',
    name: 'relatórios',
    desc: 'Relatórios semanal, mensal e DIMOB para prestação de contas, obrigações fiscais e tomada de decisão.',
  },
  {
    n: '07', icon: MessageSquare, color: '#25D366', bg: 'rgba(37,211,102,0.10)',
    name: 'whatsapp integrado',
    desc: 'Instâncias conectadas via integração inteligente, painel de CRM ao lado do chat e controle de créditos.',
  },
  {
    n: '08', icon: Sparkles, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',
    name: 'chat ia',
    desc: 'Assistente de IA com créditos mensais para resumir conversas, gerar respostas e acelerar a rotina do corretor.',
  },
  {
    n: '09', icon: BarChart3, color: '#6366F1', bg: 'rgba(99,102,241,0.08)',
    name: 'contatos',
    desc: 'Base centralizada com filtros avançados, vínculo automático com conversas, propostas e negociações em aberto.',
  },
  {
    n: '10', icon: CalendarDays, color: '#0B0073', bg: 'rgba(11,0,115,0.07)',
    name: 'agenda e equipe',
    desc: 'Agenda integrada com visitas e prazos, gestão de equipe com papéis (plano Business), tema claro/escuro e PWA instalável.',
  },
];

export function LpModules() {
  return (
    <section id="modulos" className="py-16 md:py-24">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-20">
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
          {MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <Reveal key={m.n} delay={i * 35} y={20}>
                <div
                  className="group relative flex flex-col gap-4 p-6 rounded-2xl border transition-all duration-300 cursor-default hover:shadow-md hover:-translate-y-1"
                  style={{
                    borderColor: 'var(--lp-line)',
                    background: 'var(--lp-card)',
                  }}
                >
                  {/* Ícone colorido */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: m.bg }}
                  >
                    <Icon size={20} style={{ color: m.color }} strokeWidth={1.8} />
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1">
                    <span className="lp-num lp-serif text-[11px]" style={{ color: 'var(--lp-mute)' }}>
                      {m.n}
                    </span>
                    <h3
                      className="lp-serif text-[19px] leading-tight transition-colors duration-300 group-hover:text-[var(--lp-accent)]"
                      style={{ color: 'var(--lp-ink)' }}
                    >
                      {m.name}
                    </h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--lp-ink-soft)' }}>
                      {m.desc}
                    </p>
                  </div>

                  {/* Acento animado no hover */}
                  <span
                    className="w-6 h-0.5 transition-all duration-300 group-hover:w-10"
                    style={{ background: m.color }}
                  />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
