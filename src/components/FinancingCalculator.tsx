import { useState, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDown, Calculator, TrendingDown, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pdfSafeLabel } from '@/utils/pdfSafeText';

interface ScheduleRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export const FinancingCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    propertyValue: '',
    downPayment: '',
    monthsToFinance: '360',
    annualRate: '9.5',
    financingType: 'SAC',
  });

  const [result, setResult] = useState<{
    schedule: ScheduleRow[];
    firstPayment: number;
    lastPayment: number;
    totalPaid: number;
    totalInterest: number;
    downPaymentAmount: number;
    financedAmount: number;
    effectiveCost: number;
  } | null>(null);

  const calculateFinancing = () => {
    const value = parseFloat(formData.propertyValue);
    const down = parseFloat(formData.downPayment);
    const months = parseInt(formData.monthsToFinance);
    const yearlyRate = parseFloat(formData.annualRate);

    if (!value || !down || !months || !yearlyRate) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos para calcular.',
        variant: 'destructive',
      });
      return;
    }

    const downPaymentAmount = (value * down) / 100;
    const financedAmount = value - downPaymentAmount;
    const monthlyRate = yearlyRate / 100 / 12;

    const schedule: ScheduleRow[] = [];
    let balance = financedAmount;
    let totalPaid = 0;
    let totalInterest = 0;

    if (formData.financingType === 'PRICE') {
      // Tabela PRICE (parcelas fixas)
      const payment = financedAmount * ((monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1));
      
      for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        const principal = payment - interest;
        balance = Math.max(0, balance - principal);
        
        schedule.push({
          month: i,
          payment,
          principal,
          interest,
          balance,
        });
        
        totalPaid += payment;
        totalInterest += interest;
      }
    } else {
      // Tabela SAC (amortização constante)
      const principalPayment = financedAmount / months;
      
      for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        const payment = principalPayment + interest;
        balance = Math.max(0, balance - principalPayment);
        
        schedule.push({
          month: i,
          payment,
          principal: principalPayment,
          interest,
          balance,
        });
        
        totalPaid += payment;
        totalInterest += interest;
      }
    }

    const effectiveCost = ((totalPaid + downPaymentAmount) / value - 1) * 100;

    setResult({
      schedule,
      firstPayment: schedule[0]?.payment || 0,
      lastPayment: schedule[schedule.length - 1]?.payment || 0,
      totalPaid: totalPaid + downPaymentAmount,
      totalInterest,
      downPaymentAmount,
      financedAmount,
      effectiveCost,
    });

    toast({
      title: 'Cálculo realizado',
      description: `Financiamento ${formData.financingType} calculado com sucesso.`,
    });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const value = parseFloat(formData.propertyValue);
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Memorial de Cálculo - Financiamento Imobiliário', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' });

    // Summary box
    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 35, 182, 50, 3, 3, 'FD');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do Financiamento', 20, 45);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryData = [
      [`Valor do Imóvel: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `Sistema: ${formData.financingType}`],
      [`Entrada (${formData.downPayment}%): R$ ${result.downPaymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `Taxa Anual: ${formData.annualRate}% a.a.`],
      [`Valor Financiado: R$ ${result.financedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, `Prazo: ${formData.monthsToFinance} meses`],
    ];

    let yPos = 52;
    summaryData.forEach(row => {
      doc.text(row[0], 20, yPos);
      doc.text(row[1], 115, yPos);
      yPos += 8;
    });

    // Results section
    doc.setFont('helvetica', 'bold');
    doc.text('Resultados', 20, 95);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Primeira Parcela: R$ ${result.firstPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 103);
    doc.text(`Última Parcela: R$ ${result.lastPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 111);
    doc.text(`Total de Juros: R$ ${result.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 115, 103);
    doc.text(`Custo Efetivo Total: ${result.effectiveCost.toFixed(2)}%`, 115, 111);

    // Amortization table
    const tableData = result.schedule.map(row => [
      row.month.toString(),
      `R$ ${row.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `R$ ${row.interest.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `R$ ${row.payment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `R$ ${row.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ]);

    autoTable(doc, {
      startY: 120,
      head: [['Parcela', 'Amortização', 'Juros', 'Total', 'Saldo Devedor']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 40 },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`memorial-financiamento-${pdfSafeLabel(formData.financingType).toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: 'PDF exportado',
      description: 'Memorial de cálculo salvo com sucesso.',
    });
  };

  // Show first 12 and last 6 months for preview
  const previewSchedule = useMemo(() => {
    if (!result?.schedule) return [];
    const schedule = result.schedule;
    if (schedule.length <= 18) return schedule;
    
    return [
      ...schedule.slice(0, 12),
      { month: -1, payment: 0, principal: 0, interest: 0, balance: 0 }, // Separator
      ...schedule.slice(-6),
    ];
  }, [result?.schedule]);

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
            SAC: Amortização constante, parcelas decrescem • PRICE: Prestações fixas
          </p>
        </div>
      </div>

      <Button onClick={calculateFinancing} className="w-full" size="lg">
        <Calculator className="mr-2 h-4 w-4" />
        Calcular Financiamento
      </Button>

      {result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  Entrada
                </div>
                <p className="text-xl font-bold">
                  R$ {result.downPaymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingDown className="h-4 w-4" />
                  {formData.financingType === 'SAC' ? '1ª Parcela' : 'Parcela Fixa'}
                </div>
                <p className="text-xl font-bold text-primary">
                  R$ {result.firstPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {formData.financingType === 'SAC' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Última: R$ {result.lastPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-4">
                <div className="text-muted-foreground text-sm mb-1">Total de Juros</div>
                <p className="text-xl font-bold text-destructive">
                  R$ {result.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4">
                <div className="text-muted-foreground text-sm mb-1">Custo Efetivo Total</div>
                <p className="text-xl font-bold">
                  {result.effectiveCost.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: R$ {result.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tabela de Amortização</CardTitle>
                <Button onClick={async () => await exportToPDF()} variant="outline" size="sm">
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-16 text-center">Nº</TableHead>
                      <TableHead className="text-right">Amortização</TableHead>
                      <TableHead className="text-right">Juros</TableHead>
                      <TableHead className="text-right">Parcela</TableHead>
                      <TableHead className="text-right">Saldo Devedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewSchedule.map((row, idx) => 
                      row.month === -1 ? (
                        <TableRow key={`sep-${idx}`}>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-3">
                            ... {result.schedule.length - 18} parcelas omitidas ...
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={row.month}>
                          <TableCell className="text-center font-medium">{row.month}</TableCell>
                          <TableCell className="text-right">
                            R$ {row.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            R$ {row.interest.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {row.payment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {row.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
