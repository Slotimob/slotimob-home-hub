import { MessageCircle, TrendingDown, AlertCircle, FileX, type LucideIcon } from 'lucide-react';
import SectionWrapper from '@/components/marketing/SectionWrapper';
import { Reveal } from '../v2/Reveal';

interface PainPoint {
  icon: LucideIcon;
  question: string;
  consequence: string;
}

const painPoints: PainPoint[] = [
  {
    icon: MessageCircle,
    question: 'Cobra pelo WhatsApp pessoal?',
    consequence: 'Mistura vida pessoal com negócio. Sem histórico, sem recibo.',
  },
  {
    icon: TrendingDown,
    question: 'Esqueceu de reajustar?',
    consequence: 'R$ 1.800+/ano perdidos por imóvel. O IGPM não espera.',
  },
  {
    icon: AlertCircle,
    question: 'Atraso sem multa nem juros?',
    consequence: 'Até R$ 180 por ocorrência que a lei permite cobrar — e você deixa passar.',
  },
  {
    icon: FileX,
    question: 'Contrato de papel?',
    consequence: 'Sem validade digital. Difícil de provar, impossível de assinar à distância.',
  },
];

export function LpPainPoints() {
  return (
    <SectionWrapper background="white" id="dores">
      <Reveal>
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Seus imóveis deveriam te dar renda.
            <br />
            <span className="text-destructive">Não dor de cabeça.</span>
          </h2>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {painPoints.map(({ icon: Icon, question, consequence }, index) => (
          <Reveal key={question} delay={index * 80}>
            <div
              className="group rounded-xl border border-border bg-card p-6 hover:shadow-md hover:border-destructive/30 hover:-translate-y-1 transition-all duration-200"
            >
              <Icon className="h-8 w-8 text-destructive mb-4" />
              <h3 className="font-semibold text-foreground mb-2 leading-snug">
                {question}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {consequence}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionWrapper>
  );
}
