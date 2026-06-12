import { motion } from 'framer-motion';
import {
  Users,
  Shuffle,
  Target,
  Filter,
  ArrowRight,
  TrendingUp,
  Eye,
  BarChart3,
  CheckCircle2,
  Zap,
  Globe,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

/* ── Sub-feature card ── */
function FeatureDetail({
  icon: Icon,
  title,
  description,
  highlights,
  index,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  highlights: string[];
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className="group relative rounded-2xl border border-border/50 bg-card p-8 hover:shadow-xl hover:border-primary/20 transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed mb-5">{description}</p>

      <ul className="space-y-2">
        {highlights.map((h) => (
          <li key={h} className="flex items-start gap-2 text-sm text-foreground/80">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-accent shrink-0" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ── Kanban Visual Mockup ── */
function KanbanMockup() {
  const columns = [
    { label: 'Novos Clientes', count: 8, value: 'R$ 2.4M', color: 'bg-blue-500/20 text-blue-700' },
    { label: 'Visita Marcada', count: 5, value: 'R$ 1.8M', color: 'bg-amber-500/20 text-amber-700' },
    { label: 'Proposta Enviada', count: 3, value: 'R$ 950K', color: 'bg-purple-500/20 text-purple-700' },
    { label: 'Fechamento', count: 2, value: 'R$ 620K', color: 'bg-accent/20 text-accent' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-muted rounded-md px-3 py-1 text-[11px] text-muted-foreground">
            app.slotimob.com.br/pipeline
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-4 gap-3">
        {columns.map((col) => (
          <div key={col.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{col.label}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${col.color}`}>
                {col.count}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">{col.value}</div>
            {Array.from({ length: Math.min(col.count, 3) }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-background p-2.5 space-y-1.5"
              >
                <div className="h-2 bg-muted-foreground/15 rounded w-3/4" />
                <div className="h-1.5 bg-muted-foreground/10 rounded w-1/2" />
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-4 h-4 rounded-full bg-primary/20" />
                  <div className="h-1.5 bg-muted-foreground/10 rounded w-10" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Lead Flow Diagram (simplified, no jargon) ── */
function LeadFlowDiagram() {
  const steps = [
    { icon: Globe, label: 'Anúncio', detail: 'Instagram, Google ou Portal' },
    { icon: Target, label: 'Cliente chega', detail: 'Origem identificada' },
    { icon: Users, label: 'Corretor recebe', detail: 'Distribuição automática' },
    { icon: BarChart3, label: 'Resultado medido', detail: 'Você sabe o que funciona' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border/50 bg-card p-6"
    >
      <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        Como o sistema encontra seus melhores clientes
      </h4>
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground">{step.label}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{step.detail}</span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 -mt-4" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Main Export ── */
export function CrmProductTour() {
  return (
    <section id="modulo-crm" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-5"
          >
            <Zap className="h-3.5 w-3.5" />
            Módulo de Vendas
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-5 leading-tight"
          >
            Do primeiro clique do cliente
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              até a assinatura do contrato.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            O sistema persegue cada oportunidade para você. Sabe quem é o cliente, 
            o que ele quer, e já abre o WhatsApp com a mensagem pronta. 
            Você só precisa fechar o negócio.
          </motion.p>
        </div>

        {/* Kanban visual + Lead flow */}
        <div className="max-w-5xl mx-auto space-y-6 mb-16">
          <KanbanMockup />
          <LeadFlowDiagram />
        </div>

        {/* Feature detail cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto mb-16">
          <FeatureDetail
            index={0}
            icon={Shuffle}
            title="Distribuição Automática de Clientes"
            description="Nenhum lead fica esperando. O sistema distribui automaticamente para o próximo corretor disponível, garantindo que todos recebam oportunidades iguais."
            highlights={[
              'Cada corretor recebe na sua vez, sem favoritismo',
              'Regras por tipo de imóvel ou região',
              'Você acompanha quem recebeu e quem converteu',
            ]}
          />

          <FeatureDetail
            index={1}
            icon={Target}
            title="Saiba de onde vem cada cliente"
            description="O sistema identifica automaticamente se o cliente veio do Instagram, Google ou portal — sem configuração extra. Você descobre quais anúncios trazem resultado de verdade."
            highlights={[
              'Identificação automática do canal de origem',
              'Descubra qual campanha trouxe mais vendas',
              'Pare de gastar com o que não funciona',
            ]}
          />

          <FeatureDetail
            index={2}
            icon={Filter}
            title="Seu funil do jeito que você trabalha"
            description="Monte as etapas da negociação como quiser. Arraste os clientes entre colunas e veja o valor total em cada fase — tudo visual e intuitivo."
            highlights={[
              'Crie etapas personalizadas para seu processo',
              'Mova negociações com arrastar e soltar',
              'Veja quais clientes estão quentes, mornos ou frios',
            ]}
          />

          <FeatureDetail
            index={3}
            icon={Eye}
            title="Histórico completo de cada cliente"
            description="Conversas de WhatsApp, visitas, propostas e documentos — tudo reunido em um só lugar. Qualquer pessoa da equipe pode continuar o atendimento sem perder o contexto."
            highlights={[
              'Linha do tempo de tudo que aconteceu',
              'Notas e arquivos organizados por negociação',
              'Saiba o nível de interesse de cada cliente',
            ]}
          />

          <FeatureDetail
            index={4}
            icon={TrendingUp}
            title="Números que ajudam a decidir"
            description="Veja quantos clientes avançam em cada etapa, quanto tempo levam para fechar e qual a previsão de faturamento do mês."
            highlights={[
              'Funil de conversão visual e simples',
              'Previsão de receita para o mês',
              'Compare a performance mês a mês',
            ]}
          />

          <FeatureDetail
            index={5}
            icon={Wallet}
            title="Comissões calculadas na hora"
            description="Fechou o negócio? O sistema já calcula a comissão. Perdeu uma venda? Registre o motivo e aprenda com cada oportunidade."
            highlights={[
              'Cálculo automático de comissão',
              'Registro de motivo de perda para análise',
              'Relatório de negócios ganhos e perdidos',
            ]}
          />
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Link to="/auth?utm_source=landing_crm_tour">
              Testar grátis agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            14 dias grátis · Sem cartão de crédito · Pronto em 2 minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
}
