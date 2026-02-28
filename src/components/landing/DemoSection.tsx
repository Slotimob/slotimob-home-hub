import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Brain, Building2, BarChart3 } from 'lucide-react';

const tabs = [
  {
    id: 'whatsapp',
    label: 'WhatsApp + IA',
    icon: MessageSquare,
    title: 'Converse e venda sem sair do sistema',
    description:
      'Envie propostas, lembretes e acompanhe todo o histórico de conversas direto no CRM. Cada mensagem vira contexto para fechar mais rápido.',
    mockContent: (
      <div className="space-y-3 p-4">
        <div className="flex gap-3 items-end">
          <div className="bg-muted rounded-xl rounded-bl-none px-4 py-2 max-w-[70%]">
            <p className="text-sm text-foreground">Oi, vi o apartamento no portal. Ainda está disponível?</p>
            <span className="text-[10px] text-muted-foreground">14:32</span>
          </div>
        </div>
        <div className="flex gap-3 items-end justify-end">
          <div className="bg-primary/10 rounded-xl rounded-br-none px-4 py-2 max-w-[70%]">
            <p className="text-sm text-foreground">Sim! Posso agendar uma visita para amanhã às 15h?</p>
            <span className="text-[10px] text-muted-foreground">14:33</span>
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <div className="bg-muted rounded-xl rounded-bl-none px-4 py-2 max-w-[70%]">
            <p className="text-sm text-foreground">Perfeito! Fechado.</p>
            <span className="text-[10px] text-muted-foreground">14:34</span>
          </div>
        </div>
        <div className="border-t border-border pt-3 mt-4">
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg p-3">
            <Brain className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground"><strong className="text-foreground">IA:</strong> Lead quente, interesse em 2 quartos, orçamento ~R$350k. Visita agendada.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ai-summary',
    label: 'IA de Resumo',
    icon: Brain,
    title: 'Resumos inteligentes de cada lead',
    description:
      'A IA analisa o histórico e gera um resumo executivo: perfil, interesses, orçamento e próximo passo recomendado.',
    mockContent: (
      <div className="p-4 space-y-4">
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Resumo do Lead
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Nome:</strong> Maria Santos</p>
            <p><strong className="text-foreground">Interesse:</strong> Apartamento 2-3 quartos, zona sul</p>
            <p><strong className="text-foreground">Orçamento:</strong> R$ 300k — R$ 450k</p>
            <p><strong className="text-foreground">Temperatura:</strong> 🔥 Quente — respondeu em &lt;5min</p>
            <p><strong className="text-foreground">Próximo passo:</strong> Enviar 3 opções e agendar visita</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'assets',
    label: 'Gestão de Ativos',
    icon: Building2,
    title: 'Controle total do seu portfólio',
    description:
      'Contratos, reajustes, obrigações e inadimplência em uma visão consolidada. Saiba exatamente a saúde de cada ativo.',
    mockContent: (
      <div className="p-4 space-y-3">
        {[
          { name: 'Apto 301 — Ed. Solar', status: 'Em dia', color: 'bg-success' },
          { name: 'Sala 12 — Empresarial', status: 'Reajuste em 5 dias', color: 'bg-warning' },
          { name: 'Casa 7 — Cond. Flores', status: 'Inadimplente', color: 'bg-destructive' },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
            <p className="text-sm font-medium text-foreground">{item.name}</p>
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full text-white', item.color)}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: BarChart3,
    title: 'Dados que geram decisão',
    description:
      'DRE por unidade, fluxo de caixa projetado, taxa de ocupação e performance de canal — tudo em tempo real.',
    mockContent: (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Receita Mensal', value: 'R$ 47.200', change: '+12%' },
            { label: 'Ocupação', value: '94%', change: '+3%' },
            { label: 'Inadimplência', value: '2.1%', change: '-0.8%' },
            { label: 'Leads/mês', value: '142', change: '+28%' },
          ].map((m) => (
            <div key={m.label} className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
              <span className="text-xs text-primary font-medium">{m.change}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function DemoSection() {
  const [active, setActive] = useState('whatsapp');
  const activeTab = tabs.find((t) => t.id === active)!;

  return (
    <section id="demo" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Demonstração
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Veja o sistema em ação
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore os módulos que mais geram resultado para corretores e imobiliárias.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Tab buttons */}
          <div className="flex overflow-x-auto gap-2 pb-4 mb-8 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0',
                  active === tab.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-foreground mb-3">{activeTab.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{activeTab.description}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card shadow-lg overflow-hidden min-h-[300px]">
              {activeTab.mockContent}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
