import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { LpHeader } from '@/components/landing/v2/LpHeader';
import { LpFooter } from '@/components/landing/v2/LpFooter';
import '@/components/landing/v2/lp.css';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { CALCULATORS } from '@/data/calculators';
import { CalculatorIcon } from '@/components/calculators/CalculatorIcon';

const BASE_URL = 'https://slotimob.com.br';

export default function Calculators() {
  const activeCalculators = CALCULATORS.filter((c) => c.status === 'ativa');

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SLOTI',
      url: BASE_URL,
      logo: `${BASE_URL}/sloti-logo.png`,
      description:
        'Empresa de tecnologia especializada em soluções otimizadas para o mercado imobiliário',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Calculadoras Imobiliárias Gratuitas',
      itemListElement: activeCalculators.map((calc, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: calc.title,
        url: `${BASE_URL}/calculadoras/${calc.slug}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Calculadoras', item: `${BASE_URL}/calculadoras` },
      ],
    },
  ];

  return (
    <>
      <SEOHead
        title="Calculadoras Imobiliárias Grátis Online"
        description="Calculadoras imobiliárias grátis online: financiamento SAC e Price, CET, renda mínima, rentabilidade e reajuste de aluguel. Simule na hora, sem cadastro."
        path="/calculadoras"
        structuredData={structuredData}
      />

      <div data-lp="v2" className="min-h-screen bg-background">
        <LpHeader />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Calculadoras Imobiliárias Gratuitas
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Ferramentas gratuitas para simular financiamento, rentabilidade e reajustes antes de
                fechar negócio. Sem cadastro, resultado na hora.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {CALCULATORS.map((calc) => {
                const isActive = calc.status === 'ativa';

                const inner = (
                  <Card
                    className={`h-full transition-all ${
                      isActive
                        ? 'hover:shadow-lg hover:border-primary/50'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <CardContent className="pt-6 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CalculatorIcon name={calc.icon} className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant={isActive ? 'secondary' : 'outline'}>
                          {isActive ? calc.category : 'Em breve'}
                        </Badge>
                      </div>
                      <h2 className="text-lg font-semibold text-foreground mb-2">{calc.title}</h2>
                      <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                        {calc.seoDescription}
                      </p>
                      {isActive && (
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                          Abrir calculadora <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </CardContent>
                  </Card>
                );

                return isActive ? (
                  <Link key={calc.slug} to={`/calculadoras/${calc.slug}`} className="block">
                    {inner}
                  </Link>
                ) : (
                  <div key={calc.slug} aria-disabled="true">
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        <LpFooter />
      </div>
    </>
  );
}
