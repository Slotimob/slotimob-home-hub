import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CTASectionProps {
  utmSource?: string;
}

export function CTASection({ utmSource = 'lp_geral' }: CTASectionProps) {
  const authUrl = `/auth?utm_source=${utmSource}`;

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-accent/80" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Pronto para vender mais?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8">
            Comece grátis, sem compromisso. Sinta o poder do sistema por 14 dias.
          </p>

          <Button
            asChild
            size="lg"
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-6 text-lg font-semibold shadow-lg"
          >
            <Link to={authUrl}>
              Criar Conta Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>

          <p className="mt-6 text-sm text-primary-foreground/60">
            ✓ 14 dias grátis &nbsp;&nbsp; ✓ Sem cartão de crédito &nbsp;&nbsp; ✓ Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
}
