import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Calculator, Home, TrendingUp, Landmark, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YearlyProjection {
  year: number;
  rentScenario: {
    propertyValue: number;
    accumulatedRent: number;
    totalWealth: number;
  };
  sellScenario: {
    investedValue: number;
    totalWealth: number;
  };
}

export const PropertyComparison = () => {
  const [formData, setFormData] = useState({
    propertyValue: '',
    annualAppreciation: '5',
    monthlyNetRent: '',
    investmentRate: '12',
    years: '10',
  });

  const [result, setResult] = useState<{
    projections: YearlyProjection[];
    rentFinalWealth: number;
    sellFinalWealth: number;
    difference: number;
    winner: 'rent' | 'sell';
  } | null>(null);

  const calculateComparison = () => {
    const propertyValue = parseFloat(formData.propertyValue);
    const appreciation = parseFloat(formData.annualAppreciation) / 100;
    const monthlyRent = parseFloat(formData.monthlyNetRent);
    const investmentRate = parseFloat(formData.investmentRate) / 100;
    const years = parseInt(formData.years);

    if (!propertyValue || !monthlyRent || !years) return;

    const projections: YearlyProjection[] = [];
    
    // Calculate year by year
    let currentPropertyValue = propertyValue;
    let accumulatedRent = 0;
    let rentReinvested = 0; // Rent reinvested at investment rate
    
    let investedValue = propertyValue; // If sold, amount invested

    for (let year = 1; year <= years; year++) {
      // Cenário A: Alugar
      currentPropertyValue = currentPropertyValue * (1 + appreciation);
      const yearlyRent = monthlyRent * 12;
      
      // Reinvest rent at the investment rate (compound monthly)
      rentReinvested = (rentReinvested + yearlyRent) * (1 + investmentRate);
      accumulatedRent += yearlyRent;
      
      const rentTotalWealth = currentPropertyValue + rentReinvested;
      
      // Cenário B: Vender e Investir
      investedValue = investedValue * (1 + investmentRate);
      
      projections.push({
        year,
        rentScenario: {
          propertyValue: currentPropertyValue,
          accumulatedRent: rentReinvested,
          totalWealth: rentTotalWealth,
        },
        sellScenario: {
          investedValue,
          totalWealth: investedValue,
        },
      });
    }

    const rentFinalWealth = projections[projections.length - 1]?.rentScenario.totalWealth || 0;
    const sellFinalWealth = projections[projections.length - 1]?.sellScenario.totalWealth || 0;
    const difference = Math.abs(rentFinalWealth - sellFinalWealth);
    const winner: 'rent' | 'sell' = rentFinalWealth > sellFinalWealth ? 'rent' : 'sell';

    setResult({
      projections,
      rentFinalWealth,
      sellFinalWealth,
      difference,
      winner,
    });
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="propertyValue">Valor Atual do Imóvel (R$)</Label>
          <CurrencyInput
            id="propertyValue"
            value={formData.propertyValue}
            onChange={(value) => setFormData({ ...formData, propertyValue: value })}
            placeholder="500.000,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="annualAppreciation">Valorização Anual do Imóvel (%)</Label>
          <Input
            id="annualAppreciation"
            type="number"
            step="0.1"
            value={formData.annualAppreciation}
            onChange={(e) => setFormData({ ...formData, annualAppreciation: e.target.value })}
            placeholder="5"
          />
          <p className="text-xs text-muted-foreground">Histórico BR: 3-6% a.a.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyNetRent">Aluguel Líquido Mensal (R$)</Label>
          <CurrencyInput
            id="monthlyNetRent"
            value={formData.monthlyNetRent}
            onChange={(value) => setFormData({ ...formData, monthlyNetRent: value })}
            placeholder="2.000,00"
          />
          <p className="text-xs text-muted-foreground">Já descontadas taxas e despesas</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="investmentRate">Taxa de Investimento Alternativo (%)</Label>
          <Input
            id="investmentRate"
            type="number"
            step="0.1"
            value={formData.investmentRate}
            onChange={(e) => setFormData({ ...formData, investmentRate: e.target.value })}
            placeholder="12"
          />
          <p className="text-xs text-muted-foreground">CDI/SELIC: ~10-13% a.a.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="years">Horizonte (Anos)</Label>
          <Input
            id="years"
            type="number"
            min="1"
            max="30"
            value={formData.years}
            onChange={(e) => setFormData({ ...formData, years: e.target.value })}
            placeholder="10"
          />
        </div>
      </div>

      <Button onClick={calculateComparison} className="w-full" size="lg">
        <Calculator className="mr-2 h-4 w-4" />
        Comparar Cenários
      </Button>

      {result && (
        <div className="space-y-6">
          {/* Winner Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className={cn(
              "transition-all",
              result.winner === 'rent' && "border-accent bg-accent/5 ring-2 ring-accent/20"
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Cenário A: Alugar
                  {result.winner === 'rent' && (
                    <CheckCircle2 className="h-5 w-5 text-accent ml-auto" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Manter o imóvel + reinvestir aluguéis
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  result.winner === 'rent' ? "text-accent" : "text-foreground"
                )}>
                  {formatCurrency(result.rentFinalWealth)}
                </p>
                <div className="mt-3 text-sm text-muted-foreground space-y-1">
                  <p>Imóvel valorizado: {formatCurrency(result.projections[result.projections.length - 1]?.rentScenario.propertyValue || 0)}</p>
                  <p>Aluguéis reinvestidos: {formatCurrency(result.projections[result.projections.length - 1]?.rentScenario.accumulatedRent || 0)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "transition-all",
              result.winner === 'sell' && "border-primary bg-primary/5 ring-2 ring-primary/20"
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Cenário B: Vender e Investir
                  {result.winner === 'sell' && (
                    <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Vender agora e aplicar o valor
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  result.winner === 'sell' ? "text-primary" : "text-foreground"
                )}>
                  {formatCurrency(result.sellFinalWealth)}
                </p>
                <div className="mt-3 text-sm text-muted-foreground">
                  <p>Capital inicial aplicado à taxa de {formData.investmentRate}% a.a.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Difference Banner */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-lg">
                  <strong className={result.winner === 'rent' ? 'text-green-600' : 'text-primary'}>
                    {result.winner === 'rent' ? 'Alugar' : 'Vender e Investir'}
                  </strong>
                  {' '}gera{' '}
                  <strong>{formatCurrency(result.difference)}</strong>
                  {' '}a mais em {formData.years} anos
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Yearly Projection Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Projeção Ano a Ano</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">Ano</TableHead>
                        <TableHead className="text-right" colSpan={2}>
                          <span className="flex items-center justify-end gap-1">
                            <Home className="h-4 w-4" /> Cenário Alugar
                          </span>
                        </TableHead>
                        <TableHead className="text-right">
                          <span className="flex items-center justify-end gap-1">
                            <Landmark className="h-4 w-4" /> Cenário Vender
                          </span>
                        </TableHead>
                        <TableHead className="text-right">Diferença</TableHead>
                      </TableRow>
                      <TableRow className="text-xs text-muted-foreground">
                        <TableHead></TableHead>
                        <TableHead className="text-right">Imóvel</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.projections.map((row) => {
                        const diff = row.rentScenario.totalWealth - row.sellScenario.totalWealth;
                        return (
                          <TableRow key={row.year}>
                            <TableCell className="text-center font-medium">{row.year}</TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(row.rentScenario.propertyValue)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(row.rentScenario.totalWealth)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(row.sellScenario.totalWealth)}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              diff > 0 ? "text-accent" : "text-primary"
                            )}>
                              {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Assumptions Note */}
          <p className="text-xs text-muted-foreground text-center">
            * Cálculo simplificado. Não considera impostos (IR, ITBI), custos de transação, 
            inflação diferenciada ou variações de mercado. Consulte um especialista para decisões reais.
          </p>
        </div>
      )}
    </div>
  );
};
