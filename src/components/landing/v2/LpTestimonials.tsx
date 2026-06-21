import { Star } from 'lucide-react';
import SectionWrapper from '@/components/marketing/SectionWrapper';
import { Reveal } from '../v2/Reveal';

interface Testimonial {
  name: string;
  city: string;
  units: string;
  quote: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Marcos Oliveira',
    city: 'São Paulo, SP',
    units: '8 imóveis',
    quote:
      'Antes eu passava todo dia 5 ligando para cobrar aluguel. Hoje o sistema manda boleto e cobra sozinho. Reduzi minha inadimplência em 40%.',
  },
  {
    name: 'Patrícia Souza',
    city: 'Belo Horizonte, MG',
    units: '3 imóveis',
    quote:
      'Não entendia nada de sistema de gestão. Em 30 minutos já tinha todos os meus contratos cadastrados e o primeiro boleto gerado.',
  },
  {
    name: 'Roberto Alves',
    city: 'Curitiba, PR',
    units: '15 imóveis',
    quote:
      'O DRE por imóvel mudou tudo. Descobri que 2 dos meus imóveis davam prejuízo depois de descontar IPTU e manutenção. Renegociei os contratos.',
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function LpTestimonials() {
  return (
    <SectionWrapper background="white" id="depoimentos">
      <Reveal>
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            O que dizem quem já automatizou
          </h2>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, index) => (
          <Reveal key={t.name} delay={index * 80}>
            <article
              className="bg-card border border-border rounded-2xl p-6 flex flex-col hover:shadow-md hover:-translate-y-1 transition-transform duration-200 h-full"
            >
              <div className="flex gap-0.5 mb-4" aria-label="5 estrelas">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>

              <p className="text-foreground/80 text-sm leading-relaxed italic flex-1">
                “{t.quote}”
              </p>

              <div className="mt-6 pt-5 border-t border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shrink-0">
                  {initials(t.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.city} · {t.units}
                  </p>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </SectionWrapper>
  );
}
