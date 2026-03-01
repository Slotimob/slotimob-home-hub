import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CTASectionProps {
  utmSource?: string;
}

export function CTASection({ utmSource = 'lp_geral' }: CTASectionProps) {
  const authUrl = `/auth?utm_source=${utmSource}`;

  return (
    <section className="py-24 md:py-32 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.15),transparent_70%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6" style={{ textWrap: 'balance' }}>
            Pronto para profissionalizar sua gestão hoje?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-4 leading-relaxed">
            Não importa se você é uma grande imobiliária, um corretor autônomo ou dono de imóveis: a SlotiMob foi feita para você eliminar a bagunça e focar no que importa: fechar negócios.
          </p>
          <p className="text-base text-primary-foreground/60 mb-10">
            Comece agora. 14 dias de acesso total ao Plano PRO por nossa conta. Sem cartão de crédito, sem compromisso.
          </p>

          <Button
            asChild
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground px-10 py-6 text-lg font-semibold shadow-lg"
          >
            <Link to={authUrl}>
              Começar Meu Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-primary-foreground/60 text-sm">
            {['14 dias de PRO grátis', 'Sem cartão de crédito', 'Cancele quando quiser'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
