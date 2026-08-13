import { Link, Navigate, useParams } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { LpHeader } from '@/components/landing/v2/LpHeader';
import { LpFooter } from '@/components/landing/v2/LpFooter';
import '@/components/landing/v2/lp.css';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AlertCircle, ArrowRight, ChevronRight } from 'lucide-react';
import { getCalculatorBySlug, getRelatedCalculators } from '@/data/calculators';
import { CalculatorIcon } from '@/components/calculators/CalculatorIcon';
import { FinanciamentoCalculator } from '@/components/calculators/FinanciamentoCalculator';
import { ReajusteAluguelCalculator } from '@/components/calculators/ReajusteAluguelCalculator';
import { ValorImovelCalculator } from '@/components/calculators/ValorImovelCalculator';
import { ComprarAlugarCalculator } from '@/components/calculators/ComprarAlugarCalculator';
import { CarneLeaoCalculator } from '@/components/calculators/CarneLeaoCalculator';
import { GanhoCapitalCalculator } from '@/components/calculators/GanhoCapitalCalculator';
import { IncCalculator } from '@/components/calculators/IncCalculator';
import { AmortizacaoPortabilidadeCalculator } from '@/components/calculators/AmortizacaoPortabilidadeCalculator';
import { RentabilidadeCalculator } from '@/components/calculators/RentabilidadeCalculator';

const BASE_URL = 'https://slotimob.com.br';

const CALCULATOR_COMPONENTS: Record<string, () => JSX.Element> = {
  'financiamento-imobiliario': FinanciamentoCalculator,
  'reajuste-de-aluguel': ReajusteAluguelCalculator,
  'valor-do-imovel': ValorImovelCalculator,
  'comprar-ou-alugar': ComprarAlugarCalculator,
  'imposto-de-renda-aluguel': CarneLeaoCalculator,
  'ganho-de-capital': GanhoCapitalCalculator,
  'incc-imovel-na-planta': IncCalculator,
  'amortizacao-e-portabilidade': AmortizacaoPortabilidadeCalculator,
  'rentabilidade-imobiliaria': RentabilidadeCalculator,
};


export default function CalculatorDetail() {
  const { slug } = useParams<{ slug: string }>();
  const calc = getCalculatorBySlug(slug);

  if (!calc || calc.status !== 'ativa') {
    return <Navigate to="/calculadoras" replace />;
  }

  const CalculatorComponent = CALCULATOR_COMPONENTS[calc.slug];
  const related = getRelatedCalculators(calc.relatedSlugs).filter((c) => c.slug !== calc.slug);
  const canonicalPath = `/calculadoras/${calc.slug}`;

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Calculadoras', item: `${BASE_URL}/calculadoras` },
        { '@type': 'ListItem', position: 3, name: calc.title, item: `${BASE_URL}${canonicalPath}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: calc.title,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      url: `${BASE_URL}${canonicalPath}`,
      description: calc.seoDescription,
      author: { '@type': 'Organization', name: 'SLOTI' },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: calc.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ];

  return (
    <>
      <SEOHead
        title={calc.seoTitle.replace(/\s*\|\s*Slotimob\s*$/i, '')}
        description={calc.seoDescription}
        path={canonicalPath}
        structuredData={structuredData}
      />

      <div data-lp="v2" className="min-h-screen bg-background">
        <LpHeader />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="hover:text-foreground">
                    Home
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <li>
                  <Link to="/calculadoras" className="hover:text-foreground">
                    Calculadoras
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <li className="text-foreground font-medium">{calc.title}</li>
              </ol>
            </nav>

            <header className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalculatorIcon name={calc.icon} className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{calc.category}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{calc.heroH1}</h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {calc.intro}
              </p>
            </header>

            {/* Calculadora */}
            {CalculatorComponent && (
              <Card className="mb-12">
                <CardContent className="pt-6">
                  <CalculatorComponent />
                </CardContent>
              </Card>
            )}

            {/* Como funciona */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">Como funciona o cálculo</h2>
              <div className="space-y-6">
                {calc.howItWorks.map((block) => (
                  <div key={block.heading}>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{block.heading}</h3>
                    <p className="text-muted-foreground leading-relaxed">{block.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">Perguntas frequentes</h2>
              <Accordion type="single" collapsible className="w-full">
                {calc.faq.map((item, i) => (
                  <AccordionItem key={item.question} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* Disclaimer */}
            {calc.disclaimer && (
              <Card className="mb-12 bg-muted/40">
                <CardContent className="pt-6 flex gap-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{calc.disclaimer}</p>
                </CardContent>
              </Card>
            )}

            {/* Relacionadas */}
            {related.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Calculadoras relacionadas
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {related.map((item) => (
                    <Link key={item.slug} to={`/calculadoras/${item.slug}`} className="block">
                      <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3 mb-2">
                            <CalculatorIcon name={item.icon} className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-foreground">{item.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.seoDescription}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                            Abrir <ArrowRight className="h-4 w-4" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>

        <LpFooter />
      </div>
    </>
  );
}
