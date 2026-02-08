import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const FinancingCalculator = () => {
  const [formData, setFormData] = useState({
    propertyValue: '',
    downPayment: '',
    monthsToFinance: '360',
    annualRate: '9.5',
    financingType: 'SAC',
  });

  const [result, setResult] = useState<{
    monthlyPayment: number;
    totalPaid: number;
    totalInterest: number;
    downPaymentAmount: number;
    financedAmount: number;
  } | null>(null);

  const calculateFinancing = () => {
    const value = parseFloat(formData.propertyValue);
    const down = parseFloat(formData.downPayment);
    const months = parseInt(formData.monthsToFinance);
    const yearlyRate = parseFloat(formData.annualRate);

    if (!value || !down || !months || !yearlyRate) return;

    const downPaymentAmount = (value * down) / 100;
    const financedAmount = value - downPaymentAmount;
    const monthlyRate = yearlyRate / 100 / 12;

    let monthlyPayment: number;
    let totalPaid: number;

    if (formData.financingType === 'PRICE') {
      // Tabela PRICE (parcelas fixas)
      monthlyPayment =
        financedAmount *
        ((monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1));
      totalPaid = monthlyPayment * months;
    } else {
      // Tabela SAC (parcelas decrescentes)
      const amortization = financedAmount / months;
      const firstMonthInterest = financedAmount * monthlyRate;
      monthlyPayment = amortization + firstMonthInterest;
      
      // Cálculo aproximado do total para SAC
      totalPaid = financedAmount + (financedAmount * monthlyRate * (months + 1)) / 2;
    }

    const totalInterest = totalPaid - financedAmount;

    setResult({
      monthlyPayment,
      totalPaid: totalPaid + downPaymentAmount,
      totalInterest,
      downPaymentAmount,
      financedAmount,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="propertyValue">Valor do Imóvel (R$)</Label>
          <CurrencyInput
            id="propertyValue"
            value={formData.propertyValue}
            onChange={(value) => setFormData({ ...formData, propertyValue: value })}
            placeholder="500.000,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="downPayment">Entrada (%)</Label>
          <Input
            id="downPayment"
            type="number"
            step="0.01"
            value={formData.downPayment}
            onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
            placeholder="20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthsToFinance">Prazo (meses)</Label>
          <Select
            value={formData.monthsToFinance}
            onValueChange={(value) => setFormData({ ...formData, monthsToFinance: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="120">10 anos (120 meses)</SelectItem>
              <SelectItem value="180">15 anos (180 meses)</SelectItem>
              <SelectItem value="240">20 anos (240 meses)</SelectItem>
              <SelectItem value="300">25 anos (300 meses)</SelectItem>
              <SelectItem value="360">30 anos (360 meses)</SelectItem>
              <SelectItem value="420">35 anos (420 meses)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="annualRate">Taxa de Juros Anual (%)</Label>
          <Input
            id="annualRate"
            type="number"
            step="0.01"
            value={formData.annualRate}
            onChange={(e) => setFormData({ ...formData, annualRate: e.target.value })}
            placeholder="9.5"
          />
          <p className="text-xs text-muted-foreground">
            SFH: ~8.5-9.5% | SBPE: ~9.5-11.5%
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="financingType">Sistema de Amortização</Label>
          <Select
            value={formData.financingType}
            onValueChange={(value) => setFormData({ ...formData, financingType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAC">SAC - Parcelas Decrescentes</SelectItem>
              <SelectItem value="PRICE">PRICE - Parcelas Fixas</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            SAC: Amortização constante, parcelas decrescem ao longo do tempo
            <br />
            PRICE: Prestações fixas durante todo o financiamento
          </p>
        </div>
      </div>

      <Button onClick={calculateFinancing} className="w-full">
        Calcular Financiamento
      </Button>

      {result && (
        <Card className="bg-primary/5">
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Valor de Entrada</Label>
                <p className="text-lg font-bold">
                  R$ {result.downPaymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor Financiado</Label>
                <p className="text-lg font-bold">
                  R$ {result.financedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground">
                {formData.financingType === 'SAC' ? 'Primeira Parcela' : 'Parcela Mensal'}
              </Label>
              <p className="text-2xl font-bold text-primary">
                R$ {result.monthlyPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Total de Juros</Label>
                <p className="text-lg font-bold text-destructive">
                  R$ {result.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total a Pagar</Label>
                <p className="text-lg font-bold">
                  R$ {result.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
