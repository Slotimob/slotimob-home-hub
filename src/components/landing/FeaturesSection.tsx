import {
  Building2,
  MessageSquare,
  ShieldCheck,
  FileText,
} from 'lucide-react';

const pillars = [
  {
    icon: Building2,
    title: 'Ativos',
    pain: 'Perder o controle de contratos e vencimentos',
    solution: 'Gerencie imóveis, contratos, reajustes e obrigações em um painel unificado com alertas automáticos.',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    icon: MessageSquare,
    title: 'CRM Conversacional',
    pain: 'Leads se perdem no WhatsApp pessoal',
    solution: 'Pipeline visual + WhatsApp integrado com IA que resume conversas e sugere próximos passos.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: ShieldCheck,
    title: 'Financeiro Blindado',
    pain: 'Planilhas frágeis e conciliação manual',
    solution: 'Fluxo de caixa, DRE por unidade, conciliação bancária e cobranças — tudo reconciliado automaticamente.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: FileText,
    title: 'Documentos com IA',
    pain: 'Horas preenchendo contratos repetitivos',
    solution: 'Templates inteligentes que preenchem automaticamente dados de contatos, imóveis e negociações.',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Quatro pilares. Zero improviso.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cada módulo resolve uma dor real do mercado imobiliário.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 max-w-5xl mx-auto">
          {pillars.map((p, i) => (
            <div
              key={i}
              className="group rounded-xl border border-border/50 bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-lg ${p.bg} flex items-center justify-center mb-4`}>
                <p.icon className={`h-6 w-6 ${p.color}`} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{p.title}</h3>
              <p className="text-sm text-destructive/80 mb-2 font-medium">
                🔴 {p.pain}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ✅ {p.solution}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
