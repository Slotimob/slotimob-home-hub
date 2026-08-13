import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Calculator, FileDown, Info, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Result {
  monthlyRent: number;
  penaltyMonths: number;
  totalMonths: number;
  monthsServed: number;
  monthsRemaining: number;
  totalPenalty: number;
  proportionalPenalty: number;
  progressPercent: number;
}

export const MultaRescisoriaCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    monthlyRent: '',
    penaltyMonths: '3',
    totalMonths: '',
    monthsServed: '',
  });
  const [result, setResult] = useState<Result | null>(null);

  const calculate = () => {
    const monthlyRent = parseFloat(formData.monthlyRent);
    const penaltyMonths = parseFloat(formData.penaltyMonths);
    const totalMonths = parseFloat(formData.totalMonths);
    const monthsServed = parseFloat(formData.monthsServed || '0');

    if (!monthlyRent || monthlyRent <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o valor do aluguel mensal.',
        variant: 'destructive',
      });
      return;
    }

    if (!penaltyMonths || penaltyMonths <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe quantos aluguéis o contrato prevê como multa.',
        variant: 'destructive',
      });
      return;
    }

    if (!totalMonths || totalMonths <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o prazo total do contrato em meses.',
        variant: 'destructive',
      });
      return;
    }

    if (monthsServed < 0 || monthsServed > totalMonths) {
      toast({
        title: 'Valor inválido',
        description: 'Os meses já cumpridos devem estar entre 0 e o prazo total do contrato.',
        variant: 'destructive',
      });
      return;
    }

    const totalPenalty = monthlyRent * penaltyMonths;
    const monthsRemaining = Math.max(0, totalMonths - monthsServed);
    const proportionalPenalty = (totalPenalty / totalMonths) * monthsRemaining;

    setResult({
      monthlyRent,
      penaltyMonths,
      totalMonths,
      monthsServed,
      monthsRemaining,
      totalPenalty,
      proportionalPenalty,
      progressPercent: (monthsServed / totalMonths) * 100,
    });

    toast({
      title: 'Multa calculada',
      description: 'Multa rescisória proporcional calculada com sucesso.',
    });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Memorial de Calculo - Multa Rescisoria de Aluguel', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' });

    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 35, 182, 40, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados Informados', 20, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const rows: [string, string][] = [
      [
        `Aluguel mensal: R$ ${brl(result.monthlyRent)}`,
        `Alugueis previstos como multa: ${result.penaltyMonths}`,
      ],
      [
        `Prazo total do contrato: ${result.totalMonths} meses`,
        `Meses ja cumpridos: ${result.monthsServed}`,
      ],
    ];
    let yPos = 54;
    rows.forEach((row) => {
      doc.text(row[0], 20, yPos);
      doc.text(row[1], 115, yPos);
      yPos += 8;
    });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resultado', 20, 90);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Valor total da multa (rescisao no dia 1): R$ ${brl(result.totalPenalty)}`, 20, 99);
    doc.text(`Meses restantes do contrato: ${result.monthsRemaining}`, 20, 107);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Multa proporcional devida:', 20, 120);
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text(`R$ ${brl(result.proportionalPenalty)}`, 20, 130);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const formula = doc.splitTextToSize(
      `Formula (Art. 4o da Lei 8.245/91): multa proporcional = (aluguel x numero de alugueis / prazo total) x meses restantes = (R$ ${brl(
        result.monthlyRent,
      )} x ${result.penaltyMonths} / ${result.totalMonths}) x ${result.monthsRemaining}.`,
      170,
    );
    doc.text(formula, 20, 142);

    const note = doc.splitTextToSize(
      'Paragrafo unico do Art. 4o: o locatario fica dispensado da multa se a devolucao do imovel decorrer de transferencia de local de trabalho pelo empregador (publico ou privado), desde que notifique o locador por escrito com pelo menos 30 dias de antecedencia.',
      170,
    );
    doc.text(note, 20, 160);

    const disclaimer = doc.splitTextToSize(
      'Calculo educativo baseado no Art. 4o da Lei 8.245/91. O valor exato da multa e eventuais clausulas especificas dependem do que esta escrito no seu contrato - consulte o contrato e, se necessario, um advogado.',
      170,
    );
    doc.text(disclaimer, 20, 185);

    doc.save(`memorial-multa-rescisoria-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: 'PDF exportado',
      description: 'Memorial de cálculo salvo com sucesso.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="monthlyRent">Valor do aluguel mensal (R$)</Label>
          <CurrencyInput
            id="monthlyRent"
            value={formData.monthlyRent}
            onChange={(value) => setFormData({ ...formData, monthlyRent: value })}
            placeholder="2.500,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="penaltyMonths">Aluguéis previstos como multa no contrato</Label>
          <Input
            id="penaltyMonths"
            type="number"
            min="1"
            step="1"
            value={formData.penaltyMonths}
            onChange={(e) => setFormData({ ...formData, penaltyMonths: e.target.value })}
            placeholder="3"
          />
          <p className="text-xs text-muted-foreground">
            Três aluguéis é o mais comum na prática, mas confira o que está escrito no seu contrato.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalMonths">Prazo total do contrato (meses)</Label>
          <Input
            id="totalMonths"
            type="number"
            min="1"
            step="1"
            value={formData.totalMonths}
            onChange={(e) => setFormData({ ...formData, totalMonths: e.target.value })}
            placeholder="30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthsServed">Meses já cumpridos do contrato</Label>
          <Input
            id="monthsServed"
            type="number"
            min="0"
            step="1"
            value={formData.monthsServed}
            onChange={(e) => setFormData({ ...formData, monthsServed: e.target.value })}
            placeholder="12"
          />
        </div>
      </div>

      <Button onClick={calculate} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Calcular multa rescisória
      </Button>

      {result && (
        <Card className="border-primary/20">
          <CardContent className="space-y-6 pt-6">
            <div className="text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Multa proporcional devida
                </span>
              </div>
              <div className="mb-1 text-4xl font-bold text-foreground md:text-5xl">
                R$ {brl(result.proportionalPenalty)}
              </div>
              <p className="text-sm text-muted-foreground">
                Equivalente a {result.monthsRemaining} de {result.totalMonths} meses do contrato
                ainda não cumpridos.
              </p>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Multa total (rescisão no dia 1)</span>
                <div className="font-semibold text-foreground">R$ {brl(result.totalPenalty)}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Meses restantes</span>
                <div className="font-semibold text-foreground">{result.monthsRemaining} meses</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Meses cumpridos</span>
                <div className="font-semibold text-foreground">{result.monthsServed} meses</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso do contrato</span>
                <span>{result.progressPercent.toFixed(0).replace('.', ',')}% cumprido</span>
              </div>
              <Progress value={result.progressPercent} className="h-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{result.monthsServed} meses cumpridos</span>
                <span>{result.monthsRemaining} meses restantes</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm">
              <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                <Info className="h-4 w-4" />
                Dispensa da multa por transferência de trabalho
              </div>
              <p className="text-muted-foreground">
                Pelo parágrafo único do Art. 4º da Lei 8.245/91, o locatário fica dispensado da
                multa se a devolução do imóvel decorrer de transferência de local de trabalho pelo
                empregador, público ou privado, desde que notifique o locador por escrito com pelo
                menos 30 dias de antecedência.
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Cálculo educativo
              </div>
              <p>
                Cálculo baseado no Art. 4º da Lei 8.245/91. O valor exato da multa e eventuais
                cláusulas específicas dependem do que está escrito no seu contrato — consulte o
                contrato e, se necessário, um advogado.
              </p>
            </div>

            <Button onClick={exportToPDF} variant="outline" className="w-full gap-2">
              <FileDown className="h-4 w-4" />
              Exportar memorial em PDF
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultaRescisoriaCalculator;
