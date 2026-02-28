import { Briefcase, UserCheck, Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const segments = [
  {
    icon: Briefcase,
    title: 'Para a Imobiliária',
    description: 'Escalabilidade e Auditoria. Tenha controle total sobre sua equipe de corretores e a certeza de que cada centavo do seu financeiro está auditado.',
    highlights: ['Gestão de equipe com permissões individuais', 'Auditoria financeira automática', 'Distribuição justa de clientes pela roleta'],
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: UserCheck,
    title: 'Para o Corretor',
    description: 'Sua agência no bolso. Use ferramentas de cálculo de financiamento na hora do atendimento e feche mais negócios com agilidade.',
    highlights: ['Simulador de financiamento na frente do cliente', 'Pipeline visual de negociações', 'Comissões calculadas automaticamente'],
    color: 'bg-accent/10 text-accent',
  },
  {
    icon: Home,
    title: 'Para o Proprietário',
    description: 'Transparência e Rentabilidade. Acompanhe a saúde dos seus imóveis, documentos e recebimentos em tempo real, sem precisar ligar para ninguém.',
    highlights: ['Lucro real por imóvel, sem surpresas', 'Documentos sempre acessíveis online', 'Alertas de vencimento e inadimplência'],
    color: 'bg-secondary/10 text-secondary',
  },
];

export function AudienceSegments() {
  return (
    <section id="segmentos" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Feito Para Você
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Uma solução para cada perfil
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Não importa se você é dono de imobiliária, corretor autônomo ou proprietário de imóveis — o SlotiMob se adapta à sua realidade.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {segments.map((seg) => (
            <div
              key={seg.title}
              className="rounded-2xl border border-border/50 bg-card p-8 hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col"
            >
              <div className={`w-12 h-12 rounded-xl ${seg.color} flex items-center justify-center mb-5`}>
                <seg.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{seg.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-5 flex-1">{seg.description}</p>
              <ul className="space-y-2 mb-6">
                {seg.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-foreground/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            asChild
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg font-semibold shadow-lg"
          >
            <Link to="/auth">
              Testar grátis agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
