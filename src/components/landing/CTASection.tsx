import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CTASectionProps {
  utmSource?: string;
}

export function CTASection({ utmSource = 'lp_geral' }: CTASectionProps) {
  const authUrl = `/auth?utm_source=${utmSource}`;

  return (
    <section className="py-20 bg-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15),transparent_70%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-background mb-6">
            Pronto para centralizar sua operação?
          </h2>
          <p className="text-lg text-background/70 mb-10">
            Comece grátis, sem compromisso. Sinta o poder do sistema por 14 dias com acesso completo ao Plano Pro.
          </p>

          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 text-lg font-semibold shadow-lg"
          >
            <Link to={authUrl}>
              Criar Conta Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-background/60 text-sm">
            {['14 dias grátis', 'Sem cartão de crédito', 'Cancele quando quiser'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
