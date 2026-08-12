import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator, FileDown, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { pdfSafeLabel } from '@/utils/pdfSafeText';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ResultInterpretation = {
  label: string;
  description: string;
  variant: 'success' | 'info' | 'neutral';
};

const getInterpretation = (ratio: number): ResultInterpretation => {
  if (ratio > 25) {
    return {
      label: 'Alugar tende a ser mais eficiente',
      description:
        'Alugar tende a ser financeiramente mais eficiente — considere investir a diferença em renda fixa.',
      variant: 'success',
    };
  }
  if (ratio < 15) {
    return {
      label: 'Comprar tende a ser mais vantajoso',
      description:
        'Comprar tende a ser mais vantajoso patrimonialmente no longo prazo.',
      variant: 'info',
    };
  }
  return {
    label: 'Decisão equilibrada',
    description:
      'A decisão está equilibrada financeiramente. Fatores como estabilidade, planos de longo prazo e perfil de investidor pesam mais aqui que o número isolado.',
    variant: 'neutral',
  };
};

export const ComprarAlugarCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    salePrice: '',
    monthlyRent: '',
  });

  const [result, setResult] = useState<{
    ratio: number;
    monthsOfRent: number;
    yearlyRent: number;
    interpretation: ResultInterpretation;
  } | null>(null);

  const calculate = () => {
    const salePrice = parseFloat(formData.salePrice);
    const monthlyRent = parseFloat(formData.monthlyRent);

    if (!salePrice || !monthlyRent || salePrice <= 0 || monthlyRent <= 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o valor de venda do imóvel e o aluguel mensal equivalente.',
        variant: 'destructive',
      });
      return;
    }

    const yearlyRent = monthlyRent * 12;
    const ratio = salePrice / yearlyRent;
    const monthsOfRent = salePrice / monthlyRent;

    setResult({
      ratio,
      monthsOfRent,
      yearlyRent,
      interpretation: getInterpretation(ratio),
    });

    toast({
      title: 'Índice calculado',
      description: 'Price-to-Rent Ratio calculado com sucesso.',
    });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const salePrice = parseFloat(formData.salePrice);
    const monthlyRent = parseFloat(formData.monthlyRent);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Memorial de Calculo - Comprar ou Alugar', 105, 20, { align: 'center' });

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

    const rows = [
      [`Valor de venda: R$ ${brl(salePrice)}`, `Aluguel mensal: R$ ${brl(monthlyRent)}`],
      [`Aluguel anual equivalente: R$ ${brl(result.yearlyRent)}`, `Meses de aluguel no preco: ${Math.round(result.monthsOfRent)}`],
    ];

    let yPos = 54;
    rows.forEach((row) => {
      doc.text(row[0], 20, yPos);
      doc.text(row[1], 115, yPos);
      yPos += 8;
    });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Price-to-Rent Ratio', 20, 110);
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text(result.ratio.toFixed(1), 20, 120);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Interpretacao', 20, 135);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(result.interpretation.label, 20, 142);

    const splitText = doc.splitTextToSize(result.interpretation.description, 170);
    doc.text(splitText, 20, 149);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const disclaimer = doc.splitTextToSize(
      'Indicador de referencia para uma decisao inicial. Nao considera valorizacao futura do imovel, custos de transacao (ITBI, corretagem, cartorio), inflacao do aluguel ao longo do tempo, nem o perfil de investidor. Para uma analise completa, consulte um planejador financeiro.',
      170,
    );
    doc.text(disclaimer, 20, 175);

    doc.save(
      `memorial-comprar-ou-alugar-${pdfSafeLabel(formData.salePrice).toLowerCase()}-${
        new Date().toISOString().split('T')[0]
      }.pdf`,
    );

    toast({
      title: 'PDF exportado',
      description: 'Memorial de cálculo salvo com sucesso.',
    });
  };

  const badgeClass =
    result?.interpretation.variant === 'success'
      ? 'bg-success text-success-foreground hover:bg-success'
      : result?.interpretation.variant === 'info'
      ? 'bg-info text-info-foreground hover:bg-info'
      : 'bg-muted text-muted-foreground hover:bg-muted';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="salePrice">Valor de venda do imóvel (R$)</Label>
          <CurrencyInput
            id="salePrice"
            value={formData.salePrice}
            onChange={(value) => setFormData({ ...formData, salePrice: value })}
            placeholder="500.000,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyRent">Aluguel mensal equivalente (R$)</Label>
          <CurrencyInput
            id="monthlyRent"
            value={formData.monthlyRent}
            onChange={(value) => setFormData({ ...formData, monthlyRent: value })}
            placeholder="2.500,00"
          />
          <p className="text-xs text-muted-foreground">
            Use o valor de aluguel de um imóvel equivalente na mesma região.
          </p>
        </div>
      </div>

      <Button onClick={calculate} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Calcular Price-to-Rent Ratio
      </Button>

      {result && (
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Scale className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Price-to-Rent Ratio</span>
              </div>
              <div className="text-4xl md:text-5xl font-bold text-foreground mb-3">
                {result.ratio.toFixed(1)}
              </div>
              <Badge className={badgeClass}>{result.interpretation.label}</Badge>
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="text-foreground font-medium mb-1">{result.interpretation.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Aluguel anual equivalente</span>
                <div className="font-semibold text-foreground">R$ {brl(result.yearlyRent)}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Meses de aluguel no preço</span>
                <div className="font-semibold text-foreground">{Math.round(result.monthsOfRent)} meses</div>
                <span className="text-xs text-muted-foreground">
                  O valor do imóvel equivale a {Math.round(result.monthsOfRent)} meses de aluguel.
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
              <p>
                <strong>Importante:</strong> este índice é uma fotografia do momento atual. Não considera
                valorização futura, custos de transação (ITBI, corretagem, cartório), inflação do aluguel nem
                seu perfil como investidor. Para uma análise completa, consulte um planejador financeiro.
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

export default ComprarAlugarCalculator;
