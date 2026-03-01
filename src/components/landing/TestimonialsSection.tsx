import { useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    name: 'Carlos Mendes',
    role: 'Corretor Autônomo',
    content: 'Antes eu perdia horas organizando planilhas. Agora tenho tudo no SLOTIMOB e fechei 30% mais vendas no primeiro trimestre. O financeiro ficou no automático.',
    rating: 5,
    initials: 'CM',
    result: '+30% em vendas',
  },
  {
    name: 'Ana Paula Silva',
    role: 'Corretora Premium',
    content: 'O simulador de financiamento é fantástico. Meus clientes decidem mais rápido porque veem tudo na hora, direto na visita. Minha taxa de fechamento disparou.',
    rating: 5,
    initials: 'AS',
    result: 'Fechamentos 2x mais rápidos',
  },
  {
    name: 'Roberto Ferreira',
    role: 'Dono de Imobiliária',
    content: 'Consigo acompanhar toda a equipe em tempo real. A distribuição automática de clientes aumentou a produtividade em 40% no primeiro mês. Nenhum lead fica perdido.',
    rating: 5,
    initials: 'RF',
    result: '+40% de produtividade',
  },
  {
    name: 'Fernanda Costa',
    role: 'Gestora de Ativos',
    content: 'A conciliação bancária que antes levava meio dia agora leva 5 minutos. O lucro real de cada imóvel aparece sem eu precisar fazer nenhuma conta.',
    rating: 5,
    initials: 'FC',
    result: 'De 4h para 5min no caixa',
  },
];

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);

  const goTo = (dir: number) => {
    setCurrent((prev) => (prev + dir + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-24 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Quem Usa, Recomenda
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" style={{ textWrap: 'balance' }}>
            Resultados reais de quem já modernizou
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Corretores e imobiliárias de todo o Brasil já transformaram sua rotina com o SlotiMob.
          </p>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} testimonial={t} />
          ))}
        </div>

        {/* Mobile slider */}
        <div className="md:hidden">
          <TestimonialCard testimonial={testimonials[current]} />
          <div className="flex justify-center gap-4 mt-6">
            <button onClick={() => goTo(-1)} className="p-2 rounded-full border border-border hover:bg-muted transition-colors" aria-label="Anterior">
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <div key={i} className={cn('w-2 h-2 rounded-full transition-colors', i === current ? 'bg-primary' : 'bg-border')} />
              ))}
            </div>
            <button onClick={() => goTo(1)} className="p-2 rounded-full border border-border hover:bg-muted transition-colors" aria-label="Próximo">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial: t }: { testimonial: typeof testimonials[0] }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: t.rating }).map((_, j) => (
          <Star key={j} className="h-4 w-4 fill-warning text-warning" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-1">
        "{t.content}"
      </p>
      <div className="bg-accent/10 text-accent text-xs font-semibold px-3 py-1.5 rounded-md w-fit mb-4">
        {t.result}
      </div>
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {t.initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-foreground">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.role}</p>
        </div>
      </div>
    </div>
  );
}
