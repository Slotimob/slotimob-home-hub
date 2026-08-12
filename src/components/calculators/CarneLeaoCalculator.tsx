import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Calculator, FileDown, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { pdfSafeLabel } from '@/utils/pdfSafeText';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SIMPLIFIED_DEDUCTION = 607.2;

interface TaxResult {
  grossRent: number;
  deduction: number;
  base: number;
  otherIncome: number;
  totalMonthlyIncome: number;
  band: 'exempt' | 'reduced' | 'full';
}

const getBandData = (band: TaxResult['band']) => {
  if (band === 'exempt') {
    return {
      label: 'Isento',
      badgeVariant: 'success' as const,
      title: 'Imposto devido: R$ 0,00',
      description:
        'Sua renda mensal total está dentro do limite de isenção (até R$ 5.000,00). Nesta faixa, o redutor zera o imposto devido no Carnê-Leão.',
      alertClass: 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200',
    };
  }
  if (band === 'reduced') {
    return {
      label: 'Faixa de redução proporcional',
      badgeVariant: 'warning' as const,
      title: 'Imposto devido deve ser apurado no programa oficial',
      description:
        'Sua renda mensal total está entre R$ 5.000,01 e R$ 7.350,00, faixa em que o imposto é reduzido proporcionalmente. O valor exato do redutor depende da fórmula oficial vigente — apure o valor final no Programa Carnê-Leão da Receita Federal (gov.br/receitafederal) ou com seu contador.',
      alertClass: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200',
    };
  }
  return {
    label: 'Faixa de alíquota plena',
    badgeVariant: 'info' as const,
    title: 'Imposto devido deve ser apurado no programa oficial',
    description:
      'Sua renda mensal total está acima de R$ 7.350,00, sujeita à tabela progressiva do IRPF (alíquota de até 27,5% sobre a base de cálculo). Para o valor exato do imposto devido, use o Programa Carnê-Leão da Receita Federal (gov.br/receitafederal) ou consulte seu contador — as faixas e parcelas a deduzir mudam periodicamente.',
    alertClass: 'bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-200',
  };
};

export const CarneLeaoCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    grossRent: '',
    deductionMethod: 'simplified',
    adminFee: '',
    iptu: '',
    condo: '',
    otherIncome: '',
  });

  const [result, setResult] = useState<TaxResult | null>(null);

  const calculate = () => {
    const grossRent = parseFloat(formData.grossRent);
    if (!grossRent || grossRent <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o valor do aluguel bruto mensal recebido.',
        variant: 'destructive',
      });
      return;
    }

    let deduction = SIMPLIFIED_DEDUCTION;
    if (formData.deductionMethod === 'real') {
      deduction =
        (parseFloat(formData.adminFee) || 0) +
        (parseFloat(formData.iptu) || 0) +
        (parseFloat(formData.condo) || 0);
    }

    const base = Math.max(0, grossRent - deduction);
    const otherIncome = parseFloat(formData.otherIncome) || 0;
    const totalMonthlyIncome = base + otherIncome;

    let band: TaxResult['band'];
    if (totalMonthlyIncome <= 5000) {
      band = 'exempt';
    } else if (totalMonthlyIncome <= 7350) {
      band = 'reduced';
    } else {
      band = 'full';
    }

    setResult({
      grossRent,
      deduction,
      base,
      otherIncome,
      totalMonthlyIncome,
      band,
    });

    toast({
      title: 'Base de cálculo apurada',
      description: 'Faixa de tributação identificada com sucesso.',
    });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const band = getBandData(result.band);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Memorial de Calculo - Carne-Leao', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' });

    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 35, 182, 55, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados Informados', 20, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const methodLabel =
      formData.deductionMethod === 'simplified' ? 'Desconto simplificado' : 'Deducoes reais';
    const rows = [
      [`Aluguel bruto: R$ ${brl(result.grossRent)}`, `Metodo de deducao: ${methodLabel}`],
      [`Deducao aplicada: R$ ${brl(result.deduction)}`, `Base de calculo: R$ ${brl(result.base)}`],
      [
        `Outras rendas: R$ ${brl(result.otherIncome)}`,
        `Renda mensal total: R$ ${brl(result.totalMonthlyIncome)}`,
      ],
    ];

    let yPos = 54;
    rows.forEach((row) => {
      doc.text(row[0], 20, yPos);
      doc.text(row[1], 115, yPos);
      yPos += 8;
    });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(band.label, 20, 110);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(band.title, 170);
    doc.text(splitText, 20, 118);

    doc.setFontSize(9);
    const splitDescription = doc.splitTextToSize(band.description, 170);
    doc.text(splitDescription, 20, 128);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const disclaimer = doc.splitTextToSize(
      'Calculo simplificado com fins educacionais, baseado nas faixas de isencao e reducao vigentes. O valor exato do imposto devido — especialmente nas faixas de reducao proporcional e aliquota plena — deve ser apurado no Programa Carne-Leao da Receita Federal (gov.br/receitafederal) ou com a orientacao de um contador. Esta ferramenta nao constitui aconselhamento tributario.',
      170,
    );
    doc.text(disclaimer, 20, 160);

    doc.save(
      `memorial-carne-leao-${pdfSafeLabel(formData.deductionMethod).toLowerCase()}-${
        new Date().toISOString().split('T')[0]
      }.pdf`,
    );

    toast({
      title: 'PDF exportado',
      description: 'Memorial de cálculo salvo com sucesso.',
    });
  };

  const bandData = result ? getBandData(result.band) : null;

  const badgeClass =
    bandData?.badgeVariant === 'success'
      ? 'bg-success text-success-foreground hover:bg-success'
      : bandData?.badgeVariant === 'warning'
      ? 'bg-warning text-warning-foreground hover:bg-warning'
      : 'bg-info text-info-foreground hover:bg-info';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grossRent">Aluguel bruto mensal recebido (R$)</Label>
          <CurrencyInput
            id="grossRent"
            value={formData.grossRent}
            onChange={(value) => setFormData({ ...formData, grossRent: value })}
            placeholder="3.000,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deductionMethod">Método de dedução</Label>
          <Select
            value={formData.deductionMethod}
            onValueChange={(value) => setFormData({ ...formData, deductionMethod: value })}
          >
            <SelectTrigger id="deductionMethod">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simplified">
                Desconto simplificado (R$ {brl(SIMPLIFIED_DEDUCTION)})
              </SelectItem>
              <SelectItem value="real">Deduções reais</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.deductionMethod === 'real' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="adminFee">Taxa de administração imobiliária mensal (R$)</Label>
              <CurrencyInput
                id="adminFee"
                value={formData.adminFee}
                onChange={(value) => setFormData({ ...formData, adminFee: value })}
                placeholder="300,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iptu">IPTU mensal (R$)</Label>
              <CurrencyInput
                id="iptu"
                value={formData.iptu}
                onChange={(value) => setFormData({ ...formData, iptu: value })}
                placeholder="150,00"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="condo">Condomínio mensal pago pelo locador (R$)</Label>
              <CurrencyInput
                id="condo"
                value={formData.condo}
                onChange={(value) => setFormData({ ...formData, condo: value })}
                placeholder="500,00"
              />
            </div>
          </>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="otherIncome">Outras rendas tributáveis no mês (R$)</Label>
          <CurrencyInput
            id="otherIncome"
            value={formData.otherIncome}
            onChange={(value) => setFormData({ ...formData, otherIncome: value })}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            Salário, outros aluguéis etc. — usado só para identificar a faixa de redução correta.
          </p>
        </div>
      </div>

      <Button onClick={calculate} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Calcular base de cálculo
      </Button>

      {result && bandData && (
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Resultado do Carnê-Leão</span>
              </div>
              <Badge className={badgeClass}>{bandData.label}</Badge>
            </div>

            <div className={`rounded-lg p-4 text-sm ${bandData.alertClass}`}>
              <p className="font-semibold mb-2">{bandData.title}</p>
              <p>{bandData.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Base de cálculo</span>
                <div className="font-semibold text-foreground">R$ {brl(result.base)}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Dedução aplicada</span>
                <div className="font-semibold text-foreground">R$ {brl(result.deduction)}</div>
                <span className="text-xs text-muted-foreground">
                  {formData.deductionMethod === 'simplified'
                    ? `Desconto simplificado de R$ ${brl(SIMPLIFIED_DEDUCTION)}`
                    : 'Soma das deduções reais'}
                </span>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Aluguel bruto</span>
                <div className="font-semibold text-foreground">R$ {brl(result.grossRent)}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Renda mensal total</span>
                <div className="font-semibold text-foreground">R$ {brl(result.totalMonthlyIncome)}</div>
                <span className="text-xs text-muted-foreground">
                  Base de cálculo + outras rendas tributáveis
                </span>
              </div>
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

export default CarneLeaoCalculator;
