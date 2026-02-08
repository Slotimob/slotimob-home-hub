import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Corretores de todo o Brasil já transformaram sua rotina com o SLOTIMOB.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-secondary text-secondary" />
                  ))}
                </div>
                
                <p className="text-muted-foreground mb-6 italic">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
