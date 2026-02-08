import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const TaxCalculator = () => {
  const [iptuData, setIptuData] = useState({
    annualIptu: '',
    monthsOwned: '',
  });

  const [rentalData, setRentalData] = useState({
    rentalValue: '',
    condoFee: '',
    iptu: '',
    propertyTax: '8',
  });

  const [iptuResult, setIptuResult] = useState<{
    monthlyIptu: number;
    proportionalIptu: number;
  } | null>(null);

  const [rentalResult, setRentalResult] = useState<{
    grossYield: number;
    netYield: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    annualIncome: number;
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
    const rental = parseFloat(rentalData.rentalValue);
    const condo = parseFloat(rentalData.condoFee) || 0;
    const iptu = parseFloat(rentalData.iptu) || 0;
    const propertyValue = parseFloat(rentalData.propertyTax);

    if (!rental || !propertyValue) return;

    const monthlyIncome = rental;
    const monthlyExpenses = condo + iptu;
    const netIncome = rental - monthlyExpenses;
    const annualIncome = netIncome * 12;

    const grossYield = (rental * 12 / propertyValue) * 100;
    const netYield = (annualIncome / propertyValue) * 100;

    setRentalResult({
      grossYield,
      netYield,
      monthlyIncome,
      monthlyExpenses,
      annualIncome,
    });
  };

  return (
    <Tabs defaultValue="iptu" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="iptu">IPTU Proporcional</TabsTrigger>
        <TabsTrigger value="rental">Rentabilidade</TabsTrigger>
      </TabsList>

      <TabsContent value="iptu" className="space-y-6 mt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="annualIptu">IPTU Anual (R$)</Label>
            <Input
              id="annualIptu"
              type="number"
              step="0.01"
              value={iptuData.annualIptu}
              onChange={(e) => setIptuData({ ...iptuData, annualIptu: e.target.value })}
              placeholder="1200.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthsOwned">Meses de Posse</Label>
            <Input
              id="monthsOwned"
              type="number"
              value={iptuData.monthsOwned}
              onChange={(e) => setIptuData({ ...iptuData, monthsOwned: e.target.value })}
              placeholder="6"
            />
          </div>
        </div>

        <Button onClick={calculateIptu} className="w-full">
          Calcular IPTU Proporcional
        </Button>

        {iptuResult && (
          <Card className="bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">IPTU Mensal</Label>
                <p className="text-lg font-bold">
                  R$ {iptuResult.monthlyIptu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground">IPTU Proporcional</Label>
                <p className="text-2xl font-bold text-primary">
                  R$ {iptuResult.proportionalIptu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor a ser pago por {iptuData.monthsOwned} meses de posse
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="rental" className="space-y-6 mt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rentalValue">Valor do Aluguel (R$)</Label>
            <Input
              id="rentalValue"
              type="number"
              step="0.01"
              value={rentalData.rentalValue}
              onChange={(e) => setRentalData({ ...rentalData, rentalValue: e.target.value })}
              placeholder="2500.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyTax">Valor do Imóvel (R$)</Label>
            <Input
              id="propertyTax"
              type="number"
              step="0.01"
              value={rentalData.propertyTax}
              onChange={(e) => setRentalData({ ...rentalData, propertyTax: e.target.value })}
              placeholder="500000.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condoFee">Condomínio Mensal (R$)</Label>
            <Input
              id="condoFee"
              type="number"
              step="0.01"
              value={rentalData.condoFee}
              onChange={(e) => setRentalData({ ...rentalData, condoFee: e.target.value })}
              placeholder="300.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iptu">IPTU Mensal (R$)</Label>
            <Input
              id="iptu"
              type="number"
              step="0.01"
              value={rentalData.iptu}
              onChange={(e) => setRentalData({ ...rentalData, iptu: e.target.value })}
              placeholder="100.00"
            />
          </div>
        </div>

        <Button onClick={calculateRental} className="w-full">
          Calcular Rentabilidade
        </Button>

        {rentalResult && (
          <Card className="bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Rendimento Bruto (anual)</Label>
                  <p className="text-2xl font-bold text-primary">
                    {rentalResult.grossYield.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rendimento Líquido (anual)</Label>
                  <p className="text-2xl font-bold text-green-600">
                    {rentalResult.netYield.toFixed(2)}%
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Receita Mensal</Label>
                  <p className="text-lg font-bold">
                    R$ {rentalResult.monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Despesas Mensais</Label>
                  <p className="text-lg font-bold text-destructive">
                    R$ {rentalResult.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground">Renda Líquida Anual</Label>
                <p className="text-xl font-bold text-green-600">
                  R$ {rentalResult.annualIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
};
