import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, DollarSign, Calendar, PiggyBank, BarChart3, Calculator } from 'lucide-react';

// Map routes to tab values - order: yield, payback, comparison
const getTabFromPath = (pathname: string): string => {
  if (pathname.includes('/rentability/payback')) return 'payback';
  if (pathname.includes('/rentability/comparison')) return 'comparison';
  return 'yield';
};

const Rentability = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Rental Yield Calculator
  const [propertyValue, setPropertyValue] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [monthlyCosts, setMonthlyCosts] = useState('');
  const [rentalYield, setRentalYield] = useState<{ gross: number; net: number } | null>(null);

  // Investment Comparison
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentPeriod, setInvestmentPeriod] = useState('5');
  const [expectedAppreciation, setExpectedAppreciation] = useState('5');
  const [comparisonResults, setComparisonResults] = useState<any>(null);

  // Payback Calculator
  const [purchasePrice, setPurchasePrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [expectedRent, setExpectedRent] = useState('');
  const [paybackResult, setPaybackResult] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Sync tab with route
  const activeTab = getTabFromPath(location.pathname);
  
  const handleTabChange = (value: string) => {
    switch (value) {
      case 'payback':
        navigate('/rentability/payback');
        break;
      case 'comparison':
        navigate('/rentability/comparison');
        break;
      default:
        navigate('/rentability/yield');
    }
  };

  const calculateRentalYield = () => {
    const value = parseFloat(propertyValue.replace(/\D/g, '')) / 100;
    const rent = parseFloat(monthlyRent.replace(/\D/g, '')) / 100;
    const costs = parseFloat(monthlyCosts.replace(/\D/g, '') || '0') / 100;

    if (value && rent) {
      const annualRent = rent * 12;
      const annualCosts = costs * 12;
      const grossYield = (annualRent / value) * 100;
      const netYield = ((annualRent - annualCosts) / value) * 100;
      
      setRentalYield({ gross: grossYield, net: netYield });
    }
  };

  const calculateComparison = () => {
    const amount = parseFloat(investmentAmount.replace(/\D/g, '')) / 100;
    const years = parseInt(investmentPeriod);
    const appreciation = parseFloat(expectedAppreciation) / 100;

    if (amount && years) {
      // Real estate (with appreciation + rental income assumed at 6% annual)
      const rentalIncome = 0.06;
      const realEstateFinal = amount * Math.pow(1 + appreciation + rentalIncome, years);

      // Poupança (0.5% monthly = ~6.17% annual)
      const savingsRate = 0.0617;
      const savingsFinal = amount * Math.pow(1 + savingsRate, years);

      // CDB (100% CDI = ~13% annual)
      const cdbRate = 0.13;
      const cdbFinal = amount * Math.pow(1 + cdbRate, years);

      // Fundo Imobiliário (dividend yield ~8% + appreciation ~4%)
      const fiiReturn = 0.12;
      const fiiFinal = amount * Math.pow(1 + fiiReturn, years);

      setComparisonResults({
        realEstate: { final: realEstateFinal, return: ((realEstateFinal / amount) - 1) * 100 },
        savings: { final: savingsFinal, return: ((savingsFinal / amount) - 1) * 100 },
        cdb: { final: cdbFinal, return: ((cdbFinal / amount) - 1) * 100 },
        fii: { final: fiiFinal, return: ((fiiFinal / amount) - 1) * 100 },
      });
    }
  };

  const calculatePayback = () => {
    const price = parseFloat(purchasePrice.replace(/\D/g, '')) / 100;
    const down = parseFloat(downPayment.replace(/\D/g, '')) / 100;
    const rent = parseFloat(expectedRent.replace(/\D/g, '')) / 100;

    if (price && rent) {
      const amountFinanced = price - (down || 0);
      const monthlyPaybackMonths = down ? Math.ceil(down / rent) : 0;
      const totalPaybackMonths = Math.ceil(price / rent);
      const totalPaybackYears = (totalPaybackMonths / 12).toFixed(1);

      setPaybackResult({
        downPaymentPayback: monthlyPaybackMonths,
        totalPaybackMonths,
        totalPaybackYears,
        annualReturn: ((rent * 12) / price) * 100,
      });
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const formatted = (parseInt(numericValue) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    return formatted;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <AppLayout title="Rentabilidade">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="yield" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Retorno de Aluguel</span>
              <span className="sm:hidden">Retorno</span>
            </TabsTrigger>
            <TabsTrigger value="payback" className="gap-2">
              <Calculator className="h-4 w-4" />
              Payback
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Comparativo
            </TabsTrigger>
          </TabsList>

          {/* Rental Yield Calculator */}
          <TabsContent value="yield">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Calculadora de Yield
                  </CardTitle>
                  <CardDescription>
                    Calcule o retorno do aluguel sobre o valor do imóvel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Valor do Imóvel</Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={formatCurrency(propertyValue)}
                      onChange={(e) => setPropertyValue(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aluguel Mensal</Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={formatCurrency(monthlyRent)}
                      onChange={(e) => setMonthlyRent(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custos Mensais (condomínio, IPTU, etc.)</Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={formatCurrency(monthlyCosts)}
                      onChange={(e) => setMonthlyCosts(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <Button onClick={calculateRentalYield} className="w-full">
                    Calcular Yield
                  </Button>
                </CardContent>
              </Card>

              {rentalYield && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resultado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center p-6 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Yield Bruto Anual</p>
                      <p className="text-4xl font-bold text-primary">{rentalYield.gross.toFixed(2)}%</p>
                    </div>
                    <div className="text-center p-6 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Yield Líquido Anual</p>
                      <p className="text-4xl font-bold">{rentalYield.net.toFixed(2)}%</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>• Yield Bruto: não considera despesas</p>
                      <p>• Yield Líquido: considera custos mensais informados</p>
                      <p>• Um bom yield está entre 0,5% e 0,8% ao mês (6% a 10% ao ano)</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Investment Comparison */}
          <TabsContent value="comparison">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PiggyBank className="h-5 w-5" />
                    Comparativo de Investimentos
                  </CardTitle>
                  <CardDescription>
                    Compare o retorno de imóveis com outras opções
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Valor do Investimento</Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={formatCurrency(investmentAmount)}
                      onChange={(e) => setInvestmentAmount(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Período (anos)</Label>
                    <Select value={investmentPeriod} onValueChange={setInvestmentPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 ano</SelectItem>
                        <SelectItem value="3">3 anos</SelectItem>
                        <SelectItem value="5">5 anos</SelectItem>
                        <SelectItem value="10">10 anos</SelectItem>
                        <SelectItem value="15">15 anos</SelectItem>
                        <SelectItem value="20">20 anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valorização Anual Esperada do Imóvel (%)</Label>
                    <Input
                      type="number"
                      placeholder="5"
                      value={expectedAppreciation}
                      onChange={(e) => setExpectedAppreciation(e.target.value)}
                    />
                  </div>
                  <Button onClick={calculateComparison} className="w-full">
                    Comparar
                  </Button>
                </CardContent>
              </Card>

              {comparisonResults && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resultado em {investmentPeriod} anos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-primary/10 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">🏠 Imóvel</p>
                        <p className="text-sm text-muted-foreground">
                          Valorização + Aluguel
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          R$ {comparisonResults.realEstate.final.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-green-600">
                          +{comparisonResults.realEstate.return.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">📊 CDB (100% CDI)</p>
                        <p className="text-sm text-muted-foreground">~13% a.a.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          R$ {comparisonResults.cdb.final.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-green-600">
                          +{comparisonResults.cdb.return.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">🏢 Fundo Imobiliário</p>
                        <p className="text-sm text-muted-foreground">~12% a.a.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          R$ {comparisonResults.fii.final.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-green-600">
                          +{comparisonResults.fii.return.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">💰 Poupança</p>
                        <p className="text-sm text-muted-foreground">~6% a.a.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          R$ {comparisonResults.savings.final.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-green-600">
                          +{comparisonResults.savings.return.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Payback Calculator */}
          <TabsContent value="payback">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Calculadora de Payback
                  </CardTitle>
                  <CardDescription>
                    Calcule em quanto tempo o investimento se paga
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Preço de Compra</Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={formatCurrency(purchasePrice)}
                      onChange={(e) => setPurchasePrice(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Entrada (opcional)</Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={formatCurrency(downPayment)}
                      onChange={(e) => setDownPayment(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aluguel Mensal Esperado</Label>
                    <Input
                      placeholder="R$ 0,00"
                      value={formatCurrency(expectedRent)}
                      onChange={(e) => setExpectedRent(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <Button onClick={calculatePayback} className="w-full">
                    Calcular Payback
                  </Button>
                </CardContent>
              </Card>

              {paybackResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resultado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center p-6 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Payback Total</p>
                      <p className="text-4xl font-bold text-primary">{paybackResult.totalPaybackYears} anos</p>
                      <p className="text-sm text-muted-foreground">({paybackResult.totalPaybackMonths} meses)</p>
                    </div>
                    {paybackResult.downPaymentPayback > 0 && (
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Recuperar Entrada</p>
                        <p className="text-2xl font-bold">{paybackResult.downPaymentPayback} meses</p>
                      </div>
                    )}
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Retorno Anual</p>
                      <p className="text-2xl font-bold">{paybackResult.annualReturn.toFixed(2)}%</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>• Payback simples, sem considerar valorização</p>
                      <p>• Não considera custos de manutenção e impostos</p>
                      <p>• Imóveis com payback até 15 anos são considerados bons</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Rentability;
