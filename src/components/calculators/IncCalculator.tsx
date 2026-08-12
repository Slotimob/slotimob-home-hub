import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Calculator, FileDown, HardHat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ScheduleRow {
  month: number;
  installment: number;
  balance: number | null;
}

interface Result {
  currentInstallment: number;
  finalInstallment: number;
  currentBalance: number | null;
  finalBalance: number | null;
  monthlyIndex: number;
  months: number;
  totalCorrection: number;
  totalCorrectionPercent: number;
  schedule: ScheduleRow[];
}

export const IncCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    installment: '',
    balance: '',
    monthlyIndex: '0,5',
    months: '',
  });
  const [result, setResult] = useState<Result | null>(null);

  const calculate = () => {
    const installment = parseFloat(formData.installment);
    const monthlyIndex = parseFloat(String(formData.monthlyIndex).replace(',', '.'));
    const months = parseInt(formData.months, 10);
    const balanceInput = parseFloat(formData.balance);
    const balance = Number.isFinite(balanceInput) && balanceInput > 0 ? balanceInput : null;

    if (!installment || installment <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o valor da parcela mensal atual.',
        variant: 'destructive',
      });
      return;
    }
    if (!Number.isFinite(monthlyIndex)) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o índice INCC mensal médio esperado (%).',
        variant: 'destructive',
      });
      return;
    }
    if (!months || months <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe quantos meses faltam até a entrega das chaves.',
        variant: 'destructive',
      });
      return;
    }

    const factor = 1 + monthlyIndex / 100;
    const schedule: ScheduleRow[] = [];
    for (let m = 1; m <= months; m++) {
      schedule.push({
        month: m,
        installment: installment * Math.pow(factor, m),
        balance: balance !== null ? balance * Math.pow(factor, m) : null,
      });
    }

    const finalInstallment = installment * Math.pow(factor, months);
    const finalBalance = balance !== null ? balance * Math.pow(factor, months) : null;

    setResult({
      currentInstallment: installment,
      finalInstallment,
      currentBalance: balance,
      finalBalance,
      monthlyIndex,
      months,
      totalCorrection: finalInstallment - installment,
      totalCorrectionPercent: (Math.pow(factor, months) - 1) * 100,
      schedule,
    });

    toast({
      title: 'Projeção calculada',
      description: 'Correção pelo INCC projetada até a entrega das chaves.',
    });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Memorial de Calculo - Correcao INCC', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' });

    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 35, 182, 45, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados Informados', 20, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const rows = [
      [
        `Parcela atual: R$ ${brl(result.currentInstallment)}`,
        `INCC mensal medio: ${result.monthlyIndex.toFixed(2).replace('.', ',')}%`,
      ],
      [
        `Meses ate a entrega: ${result.months}`,
        result.currentBalance !== null
          ? `Saldo devedor atual: R$ ${brl(result.currentBalance)}`
          : '',
      ],
      [
        `Parcela projetada na entrega: R$ ${brl(result.finalInstallment)}`,
        `Correcao acumulada: ${result.totalCorrectionPercent.toFixed(2).replace('.', ',')}%`,
      ],
    ];
    let yPos = 54;
    rows.forEach((row) => {
      doc.text(row[0], 20, yPos);
      if (row[1]) doc.text(row[1], 115, yPos);
      yPos += 8;
    });

    const head =
      result.currentBalance !== null
        ? [['Mes', 'Parcela corrigida (R$)', 'Saldo devedor corrigido (R$)']]
        : [['Mes', 'Parcela corrigida (R$)']];

    const body = result.schedule.map((row) =>
      result.currentBalance !== null
        ? [String(row.month), brl(row.installment), brl(row.balance ?? 0)]
        : [String(row.month), brl(row.installment)],
    );

    autoTable(doc, {
      startY: 88,
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 88;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      doc.splitTextToSize(
        'Estimativa educativa. A projecao assume o mesmo indice mensal repetido; o INCC varia mes a mes e nao ha como prever com exatidao. Apos a entrega das chaves, a correcao normalmente passa para outro indice (IGP-M ou IPCA), conforme previsto no contrato de compra e venda.',
        170,
      ),
      14,
      Math.min(finalY + 12, 280),
    );

    doc.save(`memorial-incc-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({ title: 'PDF exportado', description: 'Memorial de cálculo salvo com sucesso.' });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="installment">Valor da parcela mensal atual (R$)</Label>
          <CurrencyInput
            id="installment"
            value={formData.installment}
            onChange={(value) => setFormData({ ...formData, installment: value })}
            placeholder="2.500,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="balance">Saldo devedor atual (R$)</Label>
          <CurrencyInput
            id="balance"
            value={formData.balance}
            onChange={(value) => setFormData({ ...formData, balance: value })}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">Opcional — usado para projetar o saldo corrigido.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyIndex">Índice INCC mensal médio esperado (%)</Label>
          <Input
            id="monthlyIndex"
            type="text"
            inputMode="decimal"
            value={formData.monthlyIndex}
            onChange={(e) => setFormData({ ...formData, monthlyIndex: e.target.value })}
            placeholder="0,5"
          />
          <p className="text-xs text-muted-foreground">
            Consulte a série histórica oficial na{' '}
            <a
              href="https://portalibre.fgv.br"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              FGV IBRE (portalibre.fgv.br)
            </a>{' '}
            para conferir o índice do mês.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="months">Meses restantes até a entrega das chaves</Label>
          <Input
            id="months"
            type="number"
            min={1}
            value={formData.months}
            onChange={(e) => setFormData({ ...formData, months: e.target.value })}
            placeholder="24"
          />
        </div>
      </div>

      <Button onClick={calculate} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Projetar correção pelo INCC
      </Button>

      {result && (
        <Card className="border-primary/20">
          <CardContent className="space-y-6 pt-6">
            <div className="text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <HardHat className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Projeção até a entrega das chaves
                </span>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Parcela hoje</span>
                <div className="font-semibold text-foreground">
                  R$ {brl(result.currentInstallment)}
                </div>
              </div>
              <div className="rounded-lg bg-primary/5 p-3">
                <span className="text-muted-foreground">Parcela no mês da entrega</span>
                <div className="text-xl font-bold text-primary">
                  R$ {brl(result.finalInstallment)}
                </div>
                <span className="text-xs text-muted-foreground">
                  Após {result.months} {result.months === 1 ? 'mês' : 'meses'} de correção
                </span>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Correção acumulada</span>
                <div className="font-semibold text-foreground">
                  R$ {brl(result.totalCorrection)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {result.totalCorrectionPercent.toFixed(2).replace('.', ',')}% sobre o valor atual
                </span>
              </div>
              {result.finalBalance !== null && (
                <div className="rounded-lg bg-muted p-3">
                  <span className="text-muted-foreground">Saldo devedor projetado</span>
                  <div className="font-semibold text-foreground">R$ {brl(result.finalBalance)}</div>
                  <span className="text-xs text-muted-foreground">
                    Hoje: R$ {brl(result.currentBalance ?? 0)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Projeção mês a mês</h3>
              <div className="max-h-96 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-16 text-center">Mês</TableHead>
                      <TableHead className="text-right">Parcela corrigida</TableHead>
                      {result.currentBalance !== null && (
                        <TableHead className="text-right">Saldo devedor corrigido</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.schedule.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="text-center">{row.month}</TableCell>
                        <TableCell className="text-right">R$ {brl(row.installment)}</TableCell>
                        {result.currentBalance !== null && (
                          <TableCell className="text-right">R$ {brl(row.balance ?? 0)}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Estimativa educativa. A projeção assume o mesmo índice mensal repetido em todos os
                meses — o INCC varia mês a mês e não há como prever com exatidão. Após a entrega das
                chaves, a correção normalmente muda de índice (IGP-M ou IPCA), conforme previsto no
                seu contrato de compra e venda.
              </p>
            </div>

            <Button variant="outline" onClick={exportToPDF} className="w-full gap-2">
              <FileDown className="h-4 w-4" />
              Exportar memorial em PDF
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IncCalculator;
