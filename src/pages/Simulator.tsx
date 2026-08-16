import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { CALCULATORS, getCalculatorBySlug } from '@/data/calculators';
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
import { MultaRescisoriaCalculator } from '@/components/calculators/MultaRescisoriaCalculator';
import { CustoMudancaCalculator } from '@/components/calculators/CustoMudancaCalculator';

/** Mesmo mapa usado na página pública `/calculadoras/:slug` */
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
  'multa-rescisoria-aluguel': MultaRescisoriaCalculator,
  'custo-de-mudanca': CustoMudancaCalculator,
};

/** Ordem de exibição das categorias no hub interno */
const CATEGORY_ORDER = [
  'Financiamento',
  'Locação',
  'Avaliação',
  'Decisão Financeira',
  'Imposto de Renda',
  'Investimento',
  'Planejamento',
];

const Simulator = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // ---- Detalhe de uma calculadora ----
  if (slug) {
    const calc = getCalculatorBySlug(slug);
    if (!calc || calc.status !== 'ativa' || !CALCULATOR_COMPONENTS[calc.slug]) {
      return <Navigate to="/simulator" replace />;
    }
    const CalculatorComponent = CALCULATOR_COMPONENTS[calc.slug];

    return (
      <AppLayout title={calc.title}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/simulator')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Todas as calculadoras
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/calculadoras/${calc.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Versão pública (compartilhar)
              </a>
            </Button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">{calc.category}</Badge>
            </div>
            <h2 className="text-xl font-semibold text-foreground">{calc.heroH1}</h2>
          </div>

          <CalculatorComponent />
        </div>
      </AppLayout>
    );
  }

  // ---- Hub: grid de cards por categoria ----
  const categories = CATEGORY_ORDER.filter((cat) =>
    CALCULATORS.some((c) => c.category === cat)
  ).concat(
    Array.from(new Set(CALCULATORS.map((c) => c.category))).filter(
      (c) => !CATEGORY_ORDER.includes(c)
    )
  );

  return (
    <AppLayout title="Calculadoras">
      <div className="space-y-8">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Todas as calculadoras imobiliárias do Sloti, com memorial de cálculo exportável em PDF
          para enviar ao seu cliente.
        </p>

        {categories.map((category) => {
          const items = CALCULATORS.filter((c) => c.category === category);
          if (items.length === 0) return null;

          return (
            <section key={category} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((calc) => {
                  const isActive = calc.status === 'ativa' && !!CALCULATOR_COMPONENTS[calc.slug];

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
                          {!isActive && <Badge variant="outline">Em breve</Badge>}
                        </div>
                        <h4 className="text-base font-semibold text-foreground mb-2">
                          {calc.title}
                        </h4>
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
                    <Link key={calc.slug} to={`/simulator/${calc.slug}`} className="block">
                      {inner}
                    </Link>
                  ) : (
                    <div key={calc.slug} aria-disabled="true">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default Simulator;
