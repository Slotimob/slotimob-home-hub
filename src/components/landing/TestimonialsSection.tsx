import { Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const testimonials = [
  {
    name: 'Carlos Mendes',
    role: 'Corretor Autônomo',
    content: 'Antes eu perdia horas organizando planilhas. Agora tenho tudo no SLOTIMOB e fechei 30% mais vendas no primeiro trimestre.',
    rating: 5,
    initials: 'CM',
  },
  {
    name: 'Ana Paula Silva',
    role: 'Corretora Premium',
    content: 'O simulador de financiamento é fantástico. Meus clientes decidem mais rápido porque veem tudo na hora, direto na visita.',
    rating: 5,
    initials: 'AS',
  },
  {
    name: 'Roberto Ferreira',
    role: 'Dono de Imobiliária',
    content: 'Consigo acompanhar toda a equipe em tempo real. A distribuição automática de clientes aumentou a produtividade em 40% no primeiro mês.',
    rating: 5,
    initials: 'RF',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            Quem Usa, Recomenda
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Resultados reais de quem já modernizou
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Corretores e imobiliárias de todo o Brasil já transformaram sua rotina com o SLOTIMOB.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-6 hover:shadow-md transition-shadow">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
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
