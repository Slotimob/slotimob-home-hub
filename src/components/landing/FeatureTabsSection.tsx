import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Users, Wallet, Building2, MessageSquare,
  Shuffle, BarChart3, FileText,
  Shield, CalendarClock, Brain, Bot, PenTool,
  ArrowLeftRight, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

interface TabData {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  subheadline: string;
  features: Feature[];
  mockContent: React.ReactNode;
}

const tabs: TabData[] = [
  {
    id: 'crm',
    label: 'CRM & Vendas',
    icon: Users,
    headline: 'WhatsApp + Pipeline + Financeiro. Tudo conectado.',
    subheadline: 'Ao abrir uma conversa, o corretor já vê o histórico do imóvel e do cliente na tela. O pipeline de vendas está integrado ao WhatsApp e ao financeiro. No plano Business, a roleta distribui os leads automaticamente.',
    features: [
      { icon: MessageSquare, title: 'WhatsApp com Contexto Completo', desc: 'O corretor abre o WhatsApp e já vê: qual imóvel o cliente viu, histórico de conversas e próximo passo.' },
      { icon: Shuffle, title: 'Roleta de Leads (Plano Business)', desc: 'Distribuição automática e justa. Cada corretor recebe na sua vez, sem favoritismo.' },
      { icon: FileText, title: 'Gestão de Contratos', desc: 'Gere contratos prontos a partir dos dados do negócio. Sem redigitar, sem erros.' },
    ],
    mockContent: (
      <div className="p-4 space-y-3">
        {[
          { label: 'Novos Clientes', count: 8, value: 'R$ 2.4M', color: 'bg-blue-500' },
          { label: 'Visita Marcada', count: 5, value: 'R$ 1.8M', color: 'bg-warning' },
          { label: 'Proposta Enviada', count: 3, value: 'R$ 950K', color: 'bg-purple-500' },
          { label: 'Fechamento', count: 2, value: 'R$ 620K', color: 'bg-accent' },
        ].map((col) => (
          <div key={col.label} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
            <div className="flex items-center gap-3">
              <div className={cn('w-2 h-8 rounded-full', col.color)} />
              <div>
                <p className="text-sm font-medium text-foreground">{col.label}</p>
                <p className="text-xs text-muted-foreground">{col.value}</p>
              </div>
            </div>
            <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-full text-muted-foreground">{col.count}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'financeiro',
    label: 'Hub Financeiro',
    icon: Wallet,
    headline: 'Bata o caixa em segundos, não em horas.',
    subheadline: 'Importe o extrato do banco e o sistema mostra o que foi pago. Você só confirma. O DRE funcional analisa o lucro real — por imóvel ou do negócio inteiro.',
    features: [
      { icon: ArrowLeftRight, title: 'Bater o Caixa em Segundos', desc: 'O sistema lê o extrato e identifica cada pagamento. Sem digitar, sem conferir linha por linha.' },
      { icon: BarChart3, title: 'DRE Funcional — Lucro Real', desc: 'Quanto a empresa realmente ganhou? O relatório separa receitas, despesas e mostra o lucro líquido.' },
      { icon: Zap, title: 'Cobranças Automáticas', desc: 'Gere boletos e envie lembretes de pagamento pelo WhatsApp. Controle parcelas e atrasos sem esforço.' },
    ],
    mockContent: (
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Receita Mensal', value: 'R$ 47.200', change: '+12%' },
            { label: 'Despesas', value: 'R$ 18.400', change: '-3%' },
            { label: 'Lucro Líquido', value: 'R$ 28.800', change: '+18%' },
            { label: 'Inadimplência', value: '2.1%', change: '-0.8%' },
          ].map((m) => (
            <div key={m.label} className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
              <span className="text-xs text-accent font-medium">{m.change}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'ativos',
    label: 'Gestão de Aluguéis',
    icon: Building2,
    headline: 'Reajustes, contratos e vencimentos no piloto automático.',
    subheadline: 'O sistema avisa sobre vencimentos, calcula reajustes automaticamente e gera os documentos sozinho. Você só acompanha.',
    features: [
      { icon: CalendarClock, title: 'Controle Automático de Reajustes', desc: 'O sistema calcula pelo índice correto (IGPM, IPCA) e avisa antes do vencimento. Sem planilha.' },
      { icon: Shield, title: 'Gestão de Contratos Completa', desc: 'Cadastre contratos, acompanhe vigência, gere renovações e rescisões com um clique.' },
      { icon: FileText, title: 'Documentos Gerados Automaticamente', desc: 'Recibos, demonstrativos e relatórios prontos para o proprietário. Sem redigitar nada.' },
    ],
    mockContent: (
      <div className="p-4 space-y-3">
        {[
          { name: 'Apto 301 — Ed. Solar', status: 'Em dia', color: 'bg-success' },
          { name: 'Sala 12 — Empresarial', status: 'Reajuste em 5 dias', color: 'bg-warning' },
          { name: 'Casa 7 — Cond. Flores', status: 'Contrato vencendo', color: 'bg-destructive' },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
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
    id: 'ia',
    label: 'Inteligência Artificial',
    icon: Brain,
    headline: 'A IA que trabalha por você.',
    subheadline: 'Resumos de conversas longas no WhatsApp. Análise instantânea da saúde do seu patrimônio. Textos de conversão para venda e aluguel de imóveis. Menos tempo digitando, mais tempo fechando.',
    features: [
      { icon: Bot, title: 'Resumos Automáticos de Conversas', desc: 'A IA lê conversas extensas e entrega: o que o cliente quer, quanto pode pagar e o próximo passo.' },
      { icon: BarChart3, title: 'Análise de Patrimônio', desc: 'Visão instantânea da saúde financeira dos seus imóveis. Quais rendem bem, quais precisam de atenção.' },
      { icon: PenTool, title: 'Textos de Conversão', desc: 'Descrições profissionais para anúncios de venda e aluguel, geradas em segundos pela IA.' },
    ],
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
        <div className="border-t border-border pt-3 mt-4">
          <div className="flex items-center gap-2 bg-accent/5 border border-accent/10 rounded-lg p-3">
            <Brain className="h-4 w-4 text-accent shrink-0" />
            <p className="text-xs text-muted-foreground"><strong className="text-foreground">Resumo IA:</strong> Cliente interessado em 2 quartos, orçamento ~R$350k. Visita sugerida para amanhã.</p>
          </div>
        </div>
      </div>
    ),
  },
];

export function FeatureTabsSection() {
  const [active, setActive] = useState('crm');
  const activeTab = tabs.find((t) => t.id === active)!;

  return (
    <section id="features" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Menos esforço, mais controle, mais lucro
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" style={{ textWrap: 'balance' }}>
            Cada módulo resolve um problema real
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore os módulos e veja como o SlotiMob otimiza cada etapa da sua operação imobiliária.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Tab buttons */}
          <div className="flex overflow-x-auto gap-2 pb-4 mb-10 scrollbar-none justify-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all shrink-0 border',
                  active === tab.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid md:grid-cols-2 gap-8 items-start mb-10">
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{activeTab.headline}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">{activeTab.subheadline}</p>

                  <div className="space-y-4">
                    {activeTab.features.map((feat) => (
                      <div key={feat.title} className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                          <feat.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{feat.title}</h4>
                          <p className="text-sm text-muted-foreground">{feat.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-card shadow-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/30">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
                    </div>
                  </div>
                  {activeTab.mockContent}
                </div>
              </div>

              {/* Video placeholder */}
              <div className="max-w-3xl mx-auto">
                <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                  <p className="text-sm text-primary font-medium">
                    🎬 Assista em 1 minuto como o módulo de {activeTab.label} vai acelerar seu negócio
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Vídeo em breve</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
