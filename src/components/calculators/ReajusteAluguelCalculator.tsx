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
import { Calculator, FileDown, TrendingUp, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pdfSafeLabel } from '@/utils/pdfSafeText';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const indexLabels: Record<string, string> = {
  igpm: 'IGP-M (FGV)',
  ipca: 'IPCA (IBGE)',
  incc: 'INCC',
  outro: 'Outro índice',
};

export const ReajusteAluguelCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    currentRent: '',
    indexPercent: '',
    indexType: 'igpm',
  });

  const [result, setResult] = useState<{
    newRent: number;
    adjustmentAmount: number;
    indexPercent: number;
    indexLabel: string;
  } | null>(null);

  const calculateAdjustment = () => {
    const currentRent = parseFloat(formData.currentRent);
    const indexPercent = parseFloat(formData.indexPercent);

    if (!currentRent || isNaN(indexPercent)) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o valor atual do aluguel e a variação percentual do índice.',
        variant: 'destructive',
      });
      return;
    }

    const { newRent, difference: adjustmentAmount } = calculateRentAdjustment(currentRent, indexPercent);

    setResult({
      newRent,
      adjustmentAmount,
      indexPercent,
      indexLabel: indexLabels[formData.indexType] || indexLabels.outro,
    });

    toast({
      title: 'Reajuste calculado',
      description: 'Novo valor do aluguel calculado com sucesso.',
    });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const currentRent = parseFloat(formData.currentRent);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Memorial de Calculo - Reajuste de Aluguel', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' });

    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 35, 182, 45, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do Reajuste', 20, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const summaryData = [
      [`Aluguel Atual: R$ ${brl(currentRent)}`, `Indice: ${result.indexLabel}`],
      [
        `Variacao Acumulada (12 meses): ${result.indexPercent.toFixed(2)}%`,
        `Valor do Reajuste: R$ ${brl(result.adjustmentAmount)}`,
      ],
    ];

    let yPos = 54;
    summaryData.forEach((row) => {
      doc.text(row[0], 20, yPos);
      doc.text(row[1], 115, yPos);
      yPos += 8;
    });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Novo Valor do Aluguel', 20, 100);
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text(`R$ ${brl(result.newRent)}`, 20, 110);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Indices de inflacao variam mensalmente. Confirme o valor acumulado dos ultimos 12 meses',
      20,
      125,
    );
    doc.text(
      'diretamente nas fontes oficiais (FGV/IBGE) antes de aplicar o reajuste formalmente em contrato.',
      20,
      130,
    );

    doc.save(
      `memorial-reajuste-aluguel-${pdfSafeLabel(formData.indexType).toLowerCase()}-${
        new Date().toISOString().split('T')[0]
      }.pdf`,
    );

    toast({
      title: 'PDF exportado',
      description: 'Memorial de cálculo salvo com sucesso.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currentRent">Valor Atual do Aluguel (R$)</Label>
          <CurrencyInput
            id="currentRent"
            value={formData.currentRent}
            onChange={(value) => setFormData({ ...formData, currentRent: value })}
            placeholder="2.000,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="indexPercent">Variação Percentual Acumulada (%)</Label>
          <Input
            id="indexPercent"
            type="number"
            step="0.01"
            value={formData.indexPercent}
            onChange={(e) => setFormData({ ...formData, indexPercent: e.target.value })}
            placeholder="4,00"
          />
          <p className="text-xs text-muted-foreground">
            Variação acumulada nos últimos 12 meses do índice escolhido.
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="indexType">Índice de Reajuste</Label>
          <Select
            value={formData.indexType}
            onValueChange={(value) => setFormData({ ...formData, indexType: value })}
          >
            <SelectTrigger id="indexType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="igpm">IGP-M (FGV)</SelectItem>
              <SelectItem value="ipca">IPCA (IBGE)</SelectItem>
              <SelectItem value="incc">INCC</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Consulte o índice atualizado:{' '}
            <a
              href="https://portalibre.fgv.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              IGP-M (FGV) <ExternalLink className="h-3 w-3" />
            </a>{' '}
            ·{' '}
            <a
              href="https://www.ibge.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              IPCA (IBGE) <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>

      <Button onClick={calculateAdjustment} className="w-full" size="lg">
        <Calculator className="mr-2 h-4 w-4" />
        Calcular Reajuste
      </Button>

      {result && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Novo Aluguel
                </div>
                <p className="text-2xl font-bold text-primary">R$ {brl(result.newRent)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-muted-foreground text-sm mb-1">Valor do Reajuste</div>
                <p className="text-xl font-bold">R$ {brl(result.adjustmentAmount)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-muted-foreground text-sm mb-1">Índice Aplicado</div>
                <p className="text-xl font-bold">{result.indexPercent.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground mt-1">{result.indexLabel}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Memorial de cálculo</p>
                <p className="text-xs text-muted-foreground">
                  Exporte o resumo em PDF para anexar à notificação do inquilino.
                </p>
              </div>
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReajusteAluguelCalculator;
