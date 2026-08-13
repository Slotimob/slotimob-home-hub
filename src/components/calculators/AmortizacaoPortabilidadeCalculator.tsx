import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowRightLeft, Calculator, FileDown, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (n: number) => n.toFixed(2).replace('.', ',');

const toNumber = (value: string) => parseFloat(String(value).replace(',', '.'));

type System = 'sac' | 'price';

interface AmortizationResult {
  system: System;
  balance: number;
  extraPayment: number;
  newBalance: number;
  annualRate: number;
  monthlyRate: number;
  months: number;
  originalTotal: number;
  originalInstallment: number;
  /** Opção 1 — reduzir prazo */
  shorterTermMonths: number;
  shorterTermInstallment: number;
  shorterTermTotal: number;
  shorterTermSavings: number;
  /** Opção 2 — reduzir parcela */
  lowerInstallment: number;
  lowerInstallmentTotal: number;
  lowerInstallmentSavings: number;
}

interface PortabilityResult {
  balance: number;
  months: number;
  currentAnnualRate: number;
  newAnnualRate: number;
  currentInstallment: number;
  newInstallment: number;
  currentTotal: number;
  newTotal: number;
  grossSavings: number;
  costs: number;
  netSavings: number;
}

/** Parcela fixa da Tabela Price */
const priceInstallment = (principal: number, rate: number, months: number) =>
  rate === 0 ? principal / months : (principal * rate) / (1 - Math.pow(1 + rate, -months));

/** Total pago em um financiamento SAC */
const sacTotal = (principal: number, rate: number, months: number) => {
  const amortization = principal / months;
  let balance = principal;
  let total = 0;
  for (let m = 0; m < months; m++) {
    total += amortization + balance * rate;
    balance -= amortization;
  }
  return total;
};

/** Total pago em SAC com prazo fracionário (última parcela reduzida) */
const sacTotalFractional = (principal: number, rate: number, amortization: number) => {
  let balance = principal;
  let total = 0;
  let guard = 0;
  while (balance > 0.005 && guard < 12000) {
    const quota = Math.min(amortization, balance);
    total += quota + balance * rate;
    balance -= quota;
    guard++;
  }
  return total;
};

export const AmortizacaoPortabilidadeCalculator = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<'amortizacao' | 'portabilidade'>('amortizacao');

  const [amortForm, setAmortForm] = useState({
    balance: '',
    annualRate: '9,5',
    months: '',
    system: 'price' as System,
    extraPayment: '',
  });
  const [amortResult, setAmortResult] = useState<AmortizationResult | null>(null);

  const [portForm, setPortForm] = useState({
    balance: '',
    currentAnnualRate: '11',
    months: '',
    newAnnualRate: '9,5',
    costs: '',
  });
  const [portResult, setPortResult] = useState<PortabilityResult | null>(null);

  const calculateAmortization = () => {
    const balance = parseFloat(amortForm.balance);
    const annualRate = toNumber(amortForm.annualRate);
    const months = parseInt(amortForm.months, 10);
    const extraPayment = parseFloat(amortForm.extraPayment);

    if (!balance || balance <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o saldo devedor atual do financiamento.',
        variant: 'destructive',
      });
      return;
    }
    if (!Number.isFinite(annualRate) || annualRate < 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe a taxa de juros anual do contrato.',
        variant: 'destructive',
      });
      return;
    }
    if (!months || months <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o prazo restante em meses.',
        variant: 'destructive',
      });
      return;
    }
    if (!extraPayment || extraPayment <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o valor do aporte extra.',
        variant: 'destructive',
      });
      return;
    }
    if (extraPayment >= balance) {
      toast({
        title: 'Aporte maior que o saldo',
        description: 'Com esse aporte o financiamento seria quitado integralmente.',
        variant: 'destructive',
      });
      return;
    }

    const monthlyRate = annualRate / 100 / 12;
    const newBalance = balance - extraPayment;

    let originalTotal: number;
    let originalInstallment: number;
    let shorterTermMonths: number;
    let shorterTermInstallment: number;
    let shorterTermTotal: number;
    let lowerInstallment: number;
    let lowerInstallmentTotal: number;

    if (amortForm.system === 'price') {
      const pmt = priceInstallment(balance, monthlyRate, months);
      originalInstallment = pmt;
      originalTotal = pmt * months;

      // Reduzir prazo: mantém a parcela
      const newMonths =
        monthlyRate === 0
          ? newBalance / pmt
          : -Math.log(1 - (newBalance * monthlyRate) / pmt) / Math.log(1 + monthlyRate);
      shorterTermMonths = newMonths;
      shorterTermInstallment = pmt;
      shorterTermTotal = pmt * newMonths;

      // Reduzir parcela: mantém o prazo
      lowerInstallment = priceInstallment(newBalance, monthlyRate, months);
      lowerInstallmentTotal = lowerInstallment * months;
    } else {
      const amortQuota = balance / months;
      originalInstallment = amortQuota + balance * monthlyRate;
      originalTotal = sacTotal(balance, monthlyRate, months);

      // Reduzir prazo: mantém a quota de amortização original
      shorterTermMonths = newBalance / amortQuota;
      shorterTermInstallment = amortQuota + newBalance * monthlyRate;
      shorterTermTotal = sacTotalFractional(newBalance, monthlyRate, amortQuota);

      // Reduzir parcela: mantém o prazo, reduz a quota
      const newQuota = newBalance / months;
      lowerInstallment = newQuota + newBalance * monthlyRate;
      lowerInstallmentTotal = sacTotal(newBalance, monthlyRate, months);
    }

    const originalInterest = originalTotal - balance;
    const shorterTermInterest = shorterTermTotal - newBalance;
    const lowerInstallmentInterest = lowerInstallmentTotal - newBalance;

    setAmortResult({
      system: amortForm.system,
      balance,
      extraPayment,
      newBalance,
      annualRate,
      monthlyRate,
      months,
      originalTotal,
      originalInstallment,
      shorterTermMonths,
      shorterTermInstallment,
      shorterTermTotal,
      shorterTermSavings: originalInterest - shorterTermInterest,
      lowerInstallment,
      lowerInstallmentTotal,
      lowerInstallmentSavings: originalInterest - lowerInstallmentInterest,
    });

    toast({
      title: 'Simulação calculada',
      description: 'Compare as duas opções de uso do aporte extra.',
    });
  };

  const calculatePortability = () => {
    const balance = parseFloat(portForm.balance);
    const currentAnnualRate = toNumber(portForm.currentAnnualRate);
    const newAnnualRate = toNumber(portForm.newAnnualRate);
    const months = parseInt(portForm.months, 10);
    const costsInput = parseFloat(portForm.costs);
    const costs = Number.isFinite(costsInput) && costsInput > 0 ? costsInput : 0;

    if (!balance || balance <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o saldo devedor atual do financiamento.',
        variant: 'destructive',
      });
      return;
    }
    if (!Number.isFinite(currentAnnualRate) || !Number.isFinite(newAnnualRate)) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe a taxa atual e a taxa oferecida pelo novo banco.',
        variant: 'destructive',
      });
      return;
    }
    if (!months || months <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o prazo restante em meses.',
        variant: 'destructive',
      });
      return;
    }

    const currentMonthly = currentAnnualRate / 100 / 12;
    const newMonthly = newAnnualRate / 100 / 12;

    const currentInstallment = priceInstallment(balance, currentMonthly, months);
    const newInstallment = priceInstallment(balance, newMonthly, months);
    const currentTotal = currentInstallment * months;
    const newTotal = newInstallment * months;
    const grossSavings = currentTotal - newTotal;

    setPortResult({
      balance,
      months,
      currentAnnualRate,
      newAnnualRate,
      currentInstallment,
      newInstallment,
      currentTotal,
      newTotal,
      grossSavings,
      costs,
      netSavings: grossSavings - costs,
    });

    toast({
      title: 'Simulação calculada',
      description: 'Comparação entre a taxa atual e a taxa do novo banco.',
    });
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    const isAmort = tab === 'amortizacao';

    if (isAmort && !amortResult) return;
    if (!isAmort && !portResult) return;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(
      isAmort
        ? 'Memorial de Calculo - Amortizacao Extraordinaria'
        : 'Memorial de Calculo - Portabilidade de Financiamento',
      105,
      20,
      { align: 'center' },
    );

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${today}`, 105, 28, { align: 'center' });

    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 35, 182, 40, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados Informados', 20, 45);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let y = 54;
    const line = (left: string, right?: string) => {
      doc.text(left, 20, y);
      if (right) doc.text(right, 115, y);
      y += 7;
    };

    if (isAmort && amortResult) {
      line(
        `Saldo devedor: R$ ${brl(amortResult.balance)}`,
        `Sistema: ${amortResult.system === 'sac' ? 'SAC' : 'Price'}`,
      );
      line(
        `Taxa: ${pct(amortResult.annualRate)}% a.a.`,
        `Prazo restante: ${amortResult.months} meses`,
      );
      line(
        `Aporte extra: R$ ${brl(amortResult.extraPayment)}`,
        `Novo saldo: R$ ${brl(amortResult.newBalance)}`,
      );

      y = 90;
      doc.setFont('helvetica', 'bold');
      doc.text('Opcao 1 - Reduzir prazo (mantem a parcela)', 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      line(`Novo prazo: ${Math.ceil(amortResult.shorterTermMonths)} meses`);
      line(`Parcela mantida: R$ ${brl(amortResult.shorterTermInstallment)}`);
      line(`Economia total de juros: R$ ${brl(amortResult.shorterTermSavings)}`);

      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Opcao 2 - Reduzir parcela (mantem o prazo)', 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      line(`Prazo mantido: ${amortResult.months} meses`);
      line(`Nova parcela: R$ ${brl(amortResult.lowerInstallment)}`);
      line(`Economia total de juros: R$ ${brl(amortResult.lowerInstallmentSavings)}`);

      y += 8;
      doc.setFontSize(9);
      doc.text(
        doc.splitTextToSize(
          'Reduzir o prazo costuma gerar mais economia total de juros, porque encurta o tempo de exposicao aos juros. Reduzir a parcela alivia o fluxo de caixa mensal. Trata-se de uma troca entre economia e folga no orcamento - nao existe opcao melhor de forma generica. Estimativa educativa com base nos valores informados; taxas e condicoes reais dependem da analise de credito de cada instituicao.',
          170,
        ),
        14,
        Math.min(y, 275),
      );
    } else if (portResult) {
      line(
        `Saldo devedor: R$ ${brl(portResult.balance)}`,
        `Prazo restante: ${portResult.months} meses`,
      );
      line(
        `Taxa atual: ${pct(portResult.currentAnnualRate)}% a.a.`,
        `Taxa novo banco: ${pct(portResult.newAnnualRate)}% a.a.`,
      );
      line(`Custos informados: R$ ${brl(portResult.costs)}`);

      y = 90;
      doc.setFont('helvetica', 'bold');
      doc.text('Resultado da comparacao', 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      line(
        `Parcela atual: R$ ${brl(portResult.currentInstallment)}`,
        `Parcela nova: R$ ${brl(portResult.newInstallment)}`,
      );
      line(
        `Total a pagar hoje: R$ ${brl(portResult.currentTotal)}`,
        `Total com nova taxa: R$ ${brl(portResult.newTotal)}`,
      );
      line(`Diferenca bruta: R$ ${brl(portResult.grossSavings)}`);
      line(`Economia liquida estimada: R$ ${brl(portResult.netSavings)}`);

      y += 8;
      doc.setFontSize(9);
      doc.text(
        doc.splitTextToSize(
          'A portabilidade de credito e gratuita por lei (Resolucao CMN no 4.292/2013): nem o banco de origem nem o de destino podem cobrar tarifa pela portabilidade. Podem existir custos de terceiros, como avaliacao do imovel e cartorio, que variam por caso - confirme condicoes e custos diretamente com os bancos envolvidos. Estimativa educativa com base nos valores informados; taxas e condicoes reais dependem da analise de credito de cada instituicao.',
          170,
        ),
        14,
        Math.min(y, 265),
      );
    }

    doc.save(
      `memorial-${isAmort ? 'amortizacao' : 'portabilidade'}-${new Date().toISOString().split('T')[0]}.pdf`,
    );

    toast({ title: 'PDF exportado', description: 'Memorial de cálculo salvo com sucesso.' });
  };

  const generalDisclaimer = (
    <div className="flex gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Estimativa educativa baseada nos valores informados. Taxas, prazos e condições reais
        dependem da análise de crédito de cada instituição financeira.
      </p>
    </div>
  );

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="amortizacao">Amortização Extraordinária</TabsTrigger>
        <TabsTrigger value="portabilidade">Portabilidade</TabsTrigger>
      </TabsList>

      {/* ---------------- Aba 1 ---------------- */}
      <TabsContent value="amortizacao" className="mt-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          Ao fazer um aporte extra no financiamento, o banco oferece duas opções: reduzir o prazo
          (mantendo o valor da parcela) ou reduzir a parcela (mantendo o prazo). Compare as duas.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amort-balance">Saldo devedor atual (R$)</Label>
            <CurrencyInput
              id="amort-balance"
              value={amortForm.balance}
              onChange={(value) => setAmortForm({ ...amortForm, balance: value })}
              placeholder="250.000,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amort-rate">Taxa de juros anual (%)</Label>
            <Input
              id="amort-rate"
              type="text"
              inputMode="decimal"
              value={amortForm.annualRate}
              onChange={(e) => setAmortForm({ ...amortForm, annualRate: e.target.value })}
              placeholder="9,5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amort-months">Prazo restante (meses)</Label>
            <Input
              id="amort-months"
              type="number"
              min={1}
              value={amortForm.months}
              onChange={(e) => setAmortForm({ ...amortForm, months: e.target.value })}
              placeholder="240"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amort-system">Sistema de amortização</Label>
            <Select
              value={amortForm.system}
              onValueChange={(value: System) => setAmortForm({ ...amortForm, system: value })}
            >
              <SelectTrigger id="amort-system">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sac">SAC (parcelas decrescentes)</SelectItem>
                <SelectItem value="price">Price (parcelas fixas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="amort-extra">Valor do aporte extra (R$)</Label>
            <CurrencyInput
              id="amort-extra"
              value={amortForm.extraPayment}
              onChange={(value) => setAmortForm({ ...amortForm, extraPayment: value })}
              placeholder="30.000,00"
            />
          </div>
        </div>

        <Button onClick={calculateAmortization} className="w-full gap-2">
          <Calculator className="h-4 w-4" />
          Comparar as duas opções
        </Button>

        {amortResult && (
          <Card className="border-primary/20">
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-muted p-3">
                  <span className="text-muted-foreground">Saldo devedor antes do aporte</span>
                  <div className="font-semibold text-foreground">R$ {brl(amortResult.balance)}</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <span className="text-muted-foreground">Saldo devedor após o aporte</span>
                  <div className="font-semibold text-foreground">
                    R$ {brl(amortResult.newBalance)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Aporte de R$ {brl(amortResult.extraPayment)}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Reduzir o prazo (mantém a parcela)
                    </h3>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Novo prazo</dt>
                      <dd className="text-xl font-bold text-primary">
                        {Math.ceil(amortResult.shorterTermMonths)} meses
                      </dd>
                      <span className="text-xs text-muted-foreground">
                        {amortResult.months - Math.ceil(amortResult.shorterTermMonths)} meses a menos
                      </span>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {amortResult.system === 'sac' ? 'Próxima parcela' : 'Parcela mantida'}
                      </dt>
                      <dd className="font-semibold text-foreground">
                        R$ {brl(amortResult.shorterTermInstallment)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Economia total de juros</dt>
                      <dd className="font-semibold text-foreground">
                        R$ {brl(amortResult.shorterTermSavings)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Reduzir a parcela (mantém o prazo)
                    </h3>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">
                        {amortResult.system === 'sac' ? 'Nova próxima parcela' : 'Nova parcela'}
                      </dt>
                      <dd className="text-xl font-bold text-foreground">
                        R$ {brl(amortResult.lowerInstallment)}
                      </dd>
                      <span className="text-xs text-muted-foreground">
                        Antes: R$ {brl(amortResult.originalInstallment)}
                      </span>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Prazo mantido</dt>
                      <dd className="font-semibold text-foreground">{amortResult.months} meses</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Economia total de juros</dt>
                      <dd className="font-semibold text-foreground">
                        R$ {brl(amortResult.lowerInstallmentSavings)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p>
                  Reduzir o prazo normalmente gera mais economia total de juros, porque encurta o
                  tempo de exposição aos juros sobre o saldo devedor. Já reduzir a parcela alivia o
                  fluxo de caixa mensal. É uma troca entre economia total e folga no orçamento — a
                  escolha depende da sua situação financeira, e não existe opção melhor de forma
                  genérica.
                </p>
              </div>

              {generalDisclaimer}

              <Button variant="outline" onClick={exportToPDF} className="w-full gap-2">
                <FileDown className="h-4 w-4" />
                Exportar memorial em PDF
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ---------------- Aba 2 ---------------- */}
      <TabsContent value="portabilidade" className="mt-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          Portabilidade é o direito de transferir o saldo devedor do seu financiamento para outro
          banco que ofereça uma taxa de juros menor, mantendo o mesmo imóvel em garantia.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="port-balance">Saldo devedor atual (R$)</Label>
            <CurrencyInput
              id="port-balance"
              value={portForm.balance}
              onChange={(value) => setPortForm({ ...portForm, balance: value })}
              placeholder="250.000,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port-months">Prazo restante (meses)</Label>
            <Input
              id="port-months"
              type="number"
              min={1}
              value={portForm.months}
              onChange={(e) => setPortForm({ ...portForm, months: e.target.value })}
              placeholder="240"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port-current-rate">Taxa de juros anual atual (%)</Label>
            <Input
              id="port-current-rate"
              type="text"
              inputMode="decimal"
              value={portForm.currentAnnualRate}
              onChange={(e) => setPortForm({ ...portForm, currentAnnualRate: e.target.value })}
              placeholder="11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port-new-rate">Taxa de juros anual do novo banco (%)</Label>
            <Input
              id="port-new-rate"
              type="text"
              inputMode="decimal"
              value={portForm.newAnnualRate}
              onChange={(e) => setPortForm({ ...portForm, newAnnualRate: e.target.value })}
              placeholder="9,5"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="port-costs">Custos estimados da portabilidade (R$)</Label>
            <CurrencyInput
              id="port-costs"
              value={portForm.costs}
              onChange={(value) => setPortForm({ ...portForm, costs: value })}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">
              Opcional — avaliação do imóvel, cartório e outros custos de terceiros.
            </p>
          </div>
        </div>

        <Button onClick={calculatePortability} className="w-full gap-2">
          <Calculator className="h-4 w-4" />
          Calcular economia da portabilidade
        </Button>

        {portResult && (
          <Card className="border-primary/20">
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-muted p-3">
                  <span className="text-muted-foreground">
                    Parcela com a taxa atual ({pct(portResult.currentAnnualRate)}% a.a.)
                  </span>
                  <div className="font-semibold text-foreground">
                    R$ {brl(portResult.currentInstallment)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Total a pagar: R$ {brl(portResult.currentTotal)}
                  </span>
                </div>
                <div className="rounded-lg bg-primary/5 p-3">
                  <span className="text-muted-foreground">
                    Parcela com a nova taxa ({pct(portResult.newAnnualRate)}% a.a.)
                  </span>
                  <div className="font-semibold text-primary">
                    R$ {brl(portResult.newInstallment)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Total a pagar: R$ {brl(portResult.newTotal)}
                  </span>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <span className="text-muted-foreground">Diferença bruta no total pago</span>
                  <div className="font-semibold text-foreground">
                    R$ {brl(portResult.grossSavings)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Custos informados: R$ {brl(portResult.costs)}
                  </span>
                </div>
                <div className="rounded-lg bg-primary/5 p-3">
                  <span className="text-muted-foreground">Economia líquida estimada</span>
                  <div className="text-xl font-bold text-primary">
                    R$ {brl(portResult.netSavings)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Em {portResult.months} meses, já descontados os custos
                  </span>
                </div>
              </div>

              <div className="flex gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  A portabilidade de crédito em si é gratuita por lei (Resolução CMN nº 4.292/2013):
                  nem o banco de origem nem o de destino podem cobrar tarifa pela portabilidade.
                  Podem existir custos de terceiros, como avaliação do imóvel e cartório, que variam
                  caso a caso. Confirme condições e custos diretamente com os bancos envolvidos.
                </p>
              </div>

              {generalDisclaimer}

              <Button variant="outline" onClick={exportToPDF} className="w-full gap-2">
                <FileDown className="h-4 w-4" />
                Exportar memorial em PDF
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default AmortizacaoPortabilidadeCalculator;
