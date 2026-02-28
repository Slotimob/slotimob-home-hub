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
  DollarSign,
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
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed mb-5">{description}</p>

      {/* Highlight chips */}
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
    { label: 'Prospecção', count: 8, value: 'R$ 2.4M', color: 'bg-blue-500/20 text-blue-700' },
    { label: 'Visita Agendada', count: 5, value: 'R$ 1.8M', color: 'bg-amber-500/20 text-amber-700' },
    { label: 'Proposta', count: 3, value: 'R$ 950K', color: 'bg-purple-500/20 text-purple-700' },
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
      {/* Browser bar */}
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

      {/* Kanban columns */}
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
            {/* Mock cards */}
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

/* ── UTM Flow Diagram ── */
function UtmFlowDiagram() {
  const steps = [
    { icon: Globe, label: 'Anúncio', detail: 'Instagram / Google / Portal' },
    { icon: Target, label: 'UTM Capturado', detail: 'source, medium, campaign' },
    { icon: Users, label: 'Lead Criado', detail: 'Origem rastreada no perfil' },
    { icon: BarChart3, label: 'ROI por Canal', detail: 'Custo/lead calculado' },
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
        Rastreamento de Origem — Fluxo Automático
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
            CRM Imobiliário & Motor de Growth
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-5 leading-tight"
          >
            Rastreamento total:
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              do anúncio à comissão.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            Pare de perder leads em planilhas. Centralize prospecção, distribuição e negociação 
            em um CRM construído exclusivamente para o mercado imobiliário — com rastreio de 
            origem nativo e funil 100% personalizável.
          </motion.p>
        </div>

        {/* Kanban visual + UTM flow */}
        <div className="max-w-5xl mx-auto space-y-6 mb-16">
          <KanbanMockup />
          <UtmFlowDiagram />
        </div>

        {/* Feature detail cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto mb-16">
          <FeatureDetail
            index={0}
            icon={Shuffle}
            title="Roleta de Leads Inteligente"
            description='Distribuição automática "Fair Share" para corretores logados. Balanceamento de carga garante equidade na equipe.'
            highlights={[
              'Round-robin com prioridade por disponibilidade',
              'Regras por tipo de imóvel ou região',
              'Relatório de leads distribuídos por corretor',
            ]}
          />

          <FeatureDetail
            index={1}
            icon={Target}
            title="Rastreio UTM Nativo"
            description="Cada lead carrega a origem completa: utm_source, utm_medium, utm_campaign e gclid. Sem integrações extras."
            highlights={[
              'Captura automática na URL de entrada',
              'Persistência em sessionStorage por 24h',
              'Métricas de custo por lead por canal',
            ]}
          />

          <FeatureDetail
            index={2}
            icon={Filter}
            title="Kanban de Negociações"
            description="Funil visual com etapas 100% personalizáveis. Arraste deals entre colunas e veja valor consolidado por estágio."
            highlights={[
              'Etapas customizáveis com drag & drop',
              'Gatilhos automáticos de mudança de estágio',
              'Classificação de temperatura (Quente/Morno/Frio)',
            ]}
          />

          <FeatureDetail
            index={3}
            icon={Eye}
            title="Visibilidade 360° do Lead"
            description="Timeline completa de interações: WhatsApp, visitas, propostas e documentos vinculados ao perfil do contato."
            highlights={[
              'Histórico de atividades unificado',
              'Notas e anexos por negociação',
              'Score de engajamento automático',
            ]}
          />

          <FeatureDetail
            index={4}
            icon={TrendingUp}
            title="Métricas de Conversão"
            description="Dashboard com taxa de conversão por etapa, tempo médio no funil e forecast de receita mensal."
            highlights={[
              'Funil de conversão visual',
              'Previsão de receita (forecast)',
              'Comparativo mensal de performance',
            ]}
          />

          <FeatureDetail
            index={5}
            icon={DollarSign}
            title="Comissões & Fechamento"
            description="Calcule comissões automaticamente ao fechar negócios. Registre motivos de perda para análise estratégica."
            highlights={[
              'Cálculo automático de comissão',
              'Registro de motivo de perda',
              'Relatório de deals ganhos vs. perdidos',
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
              Testar CRM Gratuitamente
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            14 dias grátis · Sem cartão de crédito · Setup em 2 minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
}
