import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Calculator, TrendingUp, TrendingDown, Wallet, Percent, AlertCircle } from 'lucide-react';

export const TaxCalculator = () => {
  const [iptuData, setIptuData] = useState({
    annualIptu: '',
    monthsOwned: '',
  });

  const [rentalData, setRentalData] = useState({
    propertyValue: '',
    rentalValue: '',
    condoFee: '',
    iptuMonthly: '',
    adminFee: '10',
    insurance: '',
    maintenance: '',
    otherCharges: '',
  });

  const [iptuResult, setIptuResult] = useState<{
    monthlyIptu: number;
    proportionalIptu: number;
  } | null>(null);

  const [rentalResult, setRentalResult] = useState<{
    grossYield: number;
    netYield: number;
    monthlyGrossIncome: number;
    monthlyExpenses: number;
    monthlyNetIncome: number;
    annualNetIncome: number;
    adminFeeValue: number;
    expenseBreakdown: {
      label: string;
      value: number;
      percent: number;
    }[];
  } | null>(null);

  const calculateIptu = () => {
    const annual = parseFloat(iptuData.annualIptu);
    const months = parseInt(iptuData.monthsOwned);

    if (!annual || !months) return;

    const monthlyIptu = annual / 12;
    const proportionalIptu = monthlyIptu * months;

    setIptuResult({
      monthlyIptu,
      proportionalIptu,
    });
  };

  const calculateRental = () => {
    const propertyValue = parseFloat(rentalData.propertyValue);
    const rental = parseFloat(rentalData.rentalValue);
    const condo = parseFloat(rentalData.condoFee) || 0;
    const iptu = parseFloat(rentalData.iptuMonthly) || 0;
    const adminPercent = parseFloat(rentalData.adminFee) || 0;
    const insurance = parseFloat(rentalData.insurance) || 0;
    const maintenance = parseFloat(rentalData.maintenance) || 0;
    const otherCharges = parseFloat(rentalData.otherCharges) || 0;

    if (!rental || !propertyValue) return;

    const adminFeeValue = (rental * adminPercent) / 100;
    const totalExpenses = condo + iptu + adminFeeValue + insurance + maintenance + otherCharges;
    const netIncome = rental - totalExpenses;
    const annualNetIncome = netIncome * 12;

    const grossYield = ((rental * 12) / propertyValue) * 100;
    const netYield = (annualNetIncome / propertyValue) * 100;

    const expenseBreakdown = [
      { label: 'Condomínio', value: condo, percent: rental > 0 ? (condo / rental) * 100 : 0 },
      { label: 'IPTU Mensal', value: iptu, percent: rental > 0 ? (iptu / rental) * 100 : 0 },
      { label: `Taxa Admin. (${adminPercent}%)`, value: adminFeeValue, percent: adminPercent },
      { label: 'Seguro', value: insurance, percent: rental > 0 ? (insurance / rental) * 100 : 0 },
      { label: 'Manutenção', value: maintenance, percent: rental > 0 ? (maintenance / rental) * 100 : 0 },
      { label: 'Outros Encargos', value: otherCharges, percent: rental > 0 ? (otherCharges / rental) * 100 : 0 },
    ].filter(item => item.value > 0);

    setRentalResult({
      grossYield,
      netYield,
      monthlyGrossIncome: rental,
      monthlyExpenses: totalExpenses,
      monthlyNetIncome: netIncome,
      annualNetIncome,
      adminFeeValue,
      expenseBreakdown,
    });
  };

  return (
    <Tabs defaultValue="rental" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="rental">Rentabilidade</TabsTrigger>
        <TabsTrigger value="iptu">IPTU Proporcional</TabsTrigger>
      </TabsList>

      <TabsContent value="rental" className="space-y-6 mt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="propertyValue">Valor do Imóvel (R$)</Label>
            <CurrencyInput
              id="propertyValue"
              value={rentalData.propertyValue}
              onChange={(value) => setRentalData({ ...rentalData, propertyValue: value })}
              placeholder="500.000,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rentalValue">Valor do Aluguel (R$)</Label>
            <CurrencyInput
              id="rentalValue"
              value={rentalData.rentalValue}
              onChange={(value) => setRentalData({ ...rentalData, rentalValue: value })}
              placeholder="2.500,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminFee">Taxa de Administração (%)</Label>
            <Input
              id="adminFee"
              type="number"
              step="0.1"
              value={rentalData.adminFee}
              onChange={(e) => setRentalData({ ...rentalData, adminFee: e.target.value })}
              placeholder="10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condoFee">Condomínio Mensal (R$)</Label>
            <CurrencyInput
              id="condoFee"
              value={rentalData.condoFee}
              onChange={(value) => setRentalData({ ...rentalData, condoFee: value })}
              placeholder="300,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iptuMonthly">IPTU Mensal (R$)</Label>
            <CurrencyInput
              id="iptuMonthly"
              value={rentalData.iptuMonthly}
              onChange={(value) => setRentalData({ ...rentalData, iptuMonthly: value })}
              placeholder="100,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insurance">Seguro Fiança/Incêndio (R$)</Label>
            <CurrencyInput
              id="insurance"
              value={rentalData.insurance}
              onChange={(value) => setRentalData({ ...rentalData, insurance: value })}
              placeholder="50,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance">Manutenção Estimada (R$)</Label>
            <CurrencyInput
              id="maintenance"
              value={rentalData.maintenance}
              onChange={(value) => setRentalData({ ...rentalData, maintenance: value })}
              placeholder="100,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherCharges">Outros Encargos (R$)</Label>
            <CurrencyInput
              id="otherCharges"
              value={rentalData.otherCharges}
              onChange={(value) => setRentalData({ ...rentalData, otherCharges: value })}
              placeholder="0,00"
            />
          </div>
        </div>

        <Button onClick={calculateRental} className="w-full" size="lg">
          <Calculator className="mr-2 h-4 w-4" />
          Calcular Rentabilidade
        </Button>

        {rentalResult && (
          <div className="space-y-6">
            {/* Main Yield Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Percent className="h-4 w-4" />
                    Yield Bruto (a.a.)
                  </div>
                  <p className="text-2xl font-bold">
                    {rentalResult.grossYield.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <TrendingUp className="h-4 w-4" />
                    Yield Líquido (a.a.)
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {rentalResult.netYield.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>

              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <TrendingDown className="h-4 w-4" />
                    Despesas Mensais
                  </div>
                  <p className="text-2xl font-bold text-destructive">
                    R$ {rentalResult.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Wallet className="h-4 w-4" />
                    Fluxo Líquido/Mês
                  </div>
                  <p className={`text-2xl font-bold ${rentalResult.monthlyNetIncome >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    R$ {rentalResult.monthlyNetIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Expense Breakdown Table */}
            {rentalResult.expenseBreakdown.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Composição de Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Despesa</TableHead>
                        <TableHead className="text-right">Valor (R$)</TableHead>
                        <TableHead className="text-right">% do Aluguel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentalResult.expenseBreakdown.map((expense, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{expense.label}</TableCell>
                          <TableCell className="text-right">
                            R$ {expense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {expense.percent.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell>Total de Despesas</TableCell>
                        <TableCell className="text-right text-destructive">
                          R$ {rentalResult.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {((rentalResult.monthlyExpenses / rentalResult.monthlyGrossIncome) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Annual Summary */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-3 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Receita Bruta Anual</p>
                    <p className="text-xl font-bold">
                      R$ {(rentalResult.monthlyGrossIncome * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Despesas Anuais</p>
                    <p className="text-xl font-bold text-destructive">
                      R$ {(rentalResult.monthlyExpenses * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Renda Líquida Anual</p>
                    <p className={`text-xl font-bold ${rentalResult.annualNetIncome >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      R$ {rentalResult.annualNetIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </TabsContent>

      <TabsContent value="iptu" className="space-y-6 mt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="annualIptu">IPTU Anual (R$)</Label>
            <CurrencyInput
              id="annualIptu"
              value={iptuData.annualIptu}
              onChange={(value) => setIptuData({ ...iptuData, annualIptu: value })}
              placeholder="1.200,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthsOwned">Meses de Posse</Label>
            <Input
              id="monthsOwned"
              type="number"
              min="1"
              max="12"
              value={iptuData.monthsOwned}
              onChange={(e) => setIptuData({ ...iptuData, monthsOwned: e.target.value })}
              placeholder="6"
            />
          </div>
        </div>

        <Button onClick={calculateIptu} className="w-full" size="lg">
          <Calculator className="mr-2 h-4 w-4" />
          Calcular IPTU Proporcional
        </Button>

        {iptuResult && (
          <Card className="bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">IPTU Mensal</Label>
                  <p className="text-xl font-bold">
                    R$ {iptuResult.monthlyIptu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IPTU Proporcional ({iptuData.monthsOwned} meses)</Label>
                  <p className="text-2xl font-bold text-primary">
                    R$ {iptuResult.proportionalIptu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  O IPTU proporcional é calculado dividindo o valor anual por 12 e multiplicando pelos meses de posse. 
                  Útil para rateio em vendas e transferências.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
};
