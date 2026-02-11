import { Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const testimonials = [
  {
    name: 'Carlos Mendes',
    role: 'Corretor Autônomo',
    content: 'Antes eu perdia horas organizando planilhas. Agora tenho tudo no SLOTIMOB e fechei 30% mais vendas.',
    rating: 5,
    initials: 'CM',
  },
  {
    name: 'Ana Paula Silva',
    role: 'Corretora Premium',
    content: 'O simulador de financiamento é fantástico. Meus clientes decidem mais rápido porque veem tudo na hora.',
    rating: 5,
    initials: 'AS',
  },
  {
    name: 'Roberto Ferreira',
    role: 'Gerente Imobiliária',
    content: 'Consegui acompanhar toda a equipe em tempo real. A produtividade aumentou 40% no primeiro mês.',
    rating: 5,
    initials: 'RF',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Quem usa, recomenda
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Corretores de todo o Brasil já transformaram sua rotina.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-6">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-secondary text-secondary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-5 italic leading-relaxed">
                "{t.content}"
              </p>
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
          ))}
        </div>
      </div>
    </section>
  );
}
