import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Calculator, FileDown, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (n: number) => `${n.toFixed(2).replace('.', ',')}%`;

interface ProjectionRow {
  year: number;
  monthlyRent: number;
  propertyValue: number;
  accumulatedIncome: number;
  totalReturn: number;
  totalReturnPercent: number;
}

interface Result {
  propertyValue: number;
  monthlyRent: number;
  monthlyExpenses: number;
  appreciation: number;
  rentAdjustment: number;
  grossYield: number;
  netYield: number;
  monthlyNetIncome: number;
  annualNetIncome: number;
  projection: ProjectionRow[];
  averageAnnualYield: number;
}

export const RentabilidadeCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    propertyValue: '',
    monthlyRent: '',
    monthlyExpenses: '',
    appreciation: '',
    rentAdjustment: '',
  });
  const [result, setResult] = useState<Result | null>(null);

  const calculate = () => {
    const propertyValue = parseFloat(formData.propertyValue);
    const monthlyRent = parseFloat(formData.monthlyRent);

    if (!propertyValue || propertyValue <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o valor do imóvel.',
        variant: 'destructive',
      });
      return;
    }
    if (!monthlyRent || monthlyRent <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o valor do aluguel mensal.',
        variant: 'destructive',
      });
      return;
    }

    const monthlyExpenses = parseFloat(formData.monthlyExpenses) || 0;
    const appreciation = parseFloat(formData.appreciation.replace(',', '.')) || 0;
    const rentAdjustment = parseFloat(formData.rentAdjustment.replace(',', '.')) || 0;

    const monthlyNetIncome = monthlyRent - monthlyExpenses;
    const annualNetIncome = monthlyNetIncome * 12;
    const grossYield = ((monthlyRent * 12) / propertyValue) * 100;
    const netYield = (annualNetIncome / propertyValue) * 100;

    const projection: ProjectionRow[] = [];
    let accumulatedIncome = 0;

    for (let year = 1; year <= 10; year++) {
      const projectedRent = monthlyRent * Math.pow(1 + rentAdjustment / 100, year - 1);
      const projectedValue = propertyValue * Math.pow(1 + appreciation / 100, year);
      accumulatedIncome += projectedRent * 12 - monthlyExpenses * 12;
      const totalReturn = accumulatedIncome + (projectedValue - propertyValue);

      projection.push({
        year,
        monthlyRent: projectedRent,
        propertyValue: projectedValue,
        accumulatedIncome,
        totalReturn,
        totalReturnPercent: (totalReturn / propertyValue) * 100,
      });
    }

    const last = projection[projection.length - 1];

    setResult({
      propertyValue,
      monthlyRent,
      monthlyExpenses,
      appreciation,
      rentAdjustment,
      grossYield,
      netYield,
      monthlyNetIncome,
      annualNetIncome,
      projection,
      averageAnnualYield: last.totalReturnPercent / 10,
    });

    toast({ title: 'Cálculo concluído', description: 'Rentabilidade estimada com sucesso.' });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Memorial de Calculo - Rentabilidade Imobiliaria', 105, 20, { align: 'center' });

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
      [`Valor do imovel: R$ ${brl(result.propertyValue)}`, `Aluguel mensal: R$ ${brl(result.monthlyRent)}`],
      [
        `Despesas mensais: R$ ${brl(result.monthlyExpenses)}`,
        `Valorizacao anual: ${pct(result.appreciation)}`,
      ],
      [`Reajuste anual do aluguel: ${pct(result.rentAdjustment)}`, ''],
    ];
    let yPos = 54;
    rows.forEach((row) => {
      doc.text(row[0], 20, yPos);
      if (row[1]) doc.text(row[1], 115, yPos);
      yPos += 8;
    });

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Resultado', 20, 92);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Yield bruto anual: ${pct(result.grossYield)}`, 20, 101);
    doc.text(`Yield liquido anual (cap rate): ${pct(result.netYield)}`, 115, 101);
    doc.text(`Resultado liquido mensal: R$ ${brl(result.monthlyNetIncome)}`, 20, 109);
    doc.text(`Resultado liquido anual: R$ ${brl(result.annualNetIncome)}`, 115, 109);

    const { default: autoTable } = await import('jspdf-autotable');
    autoTable(doc, {
      startY: 118,
      head: [['Ano', 'Aluguel mensal', 'Valor do imovel', 'Retorno acum. (R$)', 'Retorno acum. (%)']],
      body: result.projection.map((row) => [
        String(row.year),
        `R$ ${brl(row.monthlyRent)}`,
        `R$ ${brl(row.propertyValue)}`,
        `R$ ${brl(row.totalReturn)}`,
        pct(row.totalReturnPercent),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 200;

    doc.setFontSize(9);
    doc.text(
      doc.splitTextToSize(
        'Projecao educativa que assume valorizacao e reajuste constantes todos os anos e despesas mensais fixas. Nao inclui Imposto de Renda sobre o aluguel recebido nem sobre eventual ganho de capital na venda. O yield medio anualizado e uma media simples do retorno acumulado, nao uma TIR.',
        180,
      ),
      14,
      Math.min(finalY + 10, 275),
    );

    doc.save(`memorial-rentabilidade-imobiliaria-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({ title: 'PDF exportado', description: 'Memorial de cálculo salvo com sucesso.' });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="propertyValue">Valor do imóvel (R$)</Label>
          <CurrencyInput
            id="propertyValue"
            value={formData.propertyValue}
            onChange={(value) => setFormData({ ...formData, propertyValue: value })}
            placeholder="500.000,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyRent">Aluguel mensal (R$)</Label>
          <CurrencyInput
            id="monthlyRent"
            value={formData.monthlyRent}
            onChange={(value) => setFormData({ ...formData, monthlyRent: value })}
            placeholder="2.500,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyExpenses">Despesas mensais do proprietário (R$)</Label>
          <CurrencyInput
            id="monthlyExpenses"
            value={formData.monthlyExpenses}
            onChange={(value) => setFormData({ ...formData, monthlyExpenses: value })}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            Condomínio e IPTU quando não são repassados ao inquilino, taxa de administração,
            seguro e manutenção média.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="appreciation">Valorização anual (%)</Label>
            <Input
              id="appreciation"
              type="text"
              inputMode="decimal"
              value={formData.appreciation}
              onChange={(e) => setFormData({ ...formData, appreciation: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rentAdjustment">Reajuste do aluguel (% a.a.)</Label>
            <Input
              id="rentAdjustment"
              type="text"
              inputMode="decimal"
              value={formData.rentAdjustment}
              onChange={(e) => setFormData({ ...formData, rentAdjustment: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <Button onClick={calculate} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Calcular rentabilidade
      </Button>

      {result && (
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-6">
            <div className="mb-2 flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Rentabilidade estimada
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <span className="text-sm text-muted-foreground">Yield bruto (a.a.)</span>
                <div className="text-3xl font-bold text-foreground">{pct(result.grossYield)}</div>
                <span className="text-xs text-muted-foreground">
                  Aluguel anual sobre o valor do imóvel, sem descontar despesas
                </span>
              </div>
              <div className="rounded-lg bg-primary/5 p-4 text-center">
                <span className="text-sm text-muted-foreground">
                  Yield líquido / cap rate (a.a.)
                </span>
                <div className="text-3xl font-bold text-primary">{pct(result.netYield)}</div>
                <span className="text-xs text-muted-foreground">
                  Aluguel anual já descontadas as despesas do proprietário
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-lg border p-3 flex justify-between">
                <span className="text-muted-foreground">Resultado líquido mensal</span>
                <span className="font-semibold">R$ {brl(result.monthlyNetIncome)}</span>
              </div>
              <div className="rounded-lg border p-3 flex justify-between">
                <span className="text-muted-foreground">Resultado líquido anual</span>
                <span className="font-semibold">R$ {brl(result.annualNetIncome)}</span>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-base font-semibold text-foreground">
                Projeção de 10 anos
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left font-medium">Ano</th>
                      <th className="p-2 text-right font-medium">Aluguel mensal</th>
                      <th className="p-2 text-right font-medium">Valor do imóvel</th>
                      <th className="p-2 text-right font-medium">Retorno acumulado</th>
                      <th className="p-2 text-right font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.projection.map((row) => (
                      <tr key={row.year} className="border-t">
                        <td className="p-2">{row.year}</td>
                        <td className="p-2 text-right">R$ {brl(row.monthlyRent)}</td>
                        <td className="p-2 text-right">R$ {brl(row.propertyValue)}</td>
                        <td className="p-2 text-right">R$ {brl(row.totalReturn)}</td>
                        <td className="p-2 text-right">{pct(row.totalReturnPercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Em 10 anos, o retorno total acumulado (aluguéis líquidos + valorização não
                realizada) chega a{' '}
                <strong className="text-foreground">
                  R$ {brl(result.projection[9].totalReturn)}
                </strong>{' '}
                — {pct(result.projection[9].totalReturnPercent)} sobre o valor inicial, o
                equivalente a um yield médio anualizado de{' '}
                <strong className="text-foreground">{pct(result.averageAnnualYield)}</strong>. Essa
                média é uma divisão simples do retorno total pelo número de anos, não uma TIR/XIRR.
              </p>
            </div>

            <div className="rounded-lg bg-yellow-50 p-4 text-xs leading-relaxed text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Projeção educativa
              </div>
              <p>
                A projeção assume valorização e reajuste constantes repetidos todos os anos e
                despesas mensais fixas — na prática esses índices variam. Ela não inclui Imposto de
                Renda sobre o aluguel recebido nem sobre eventual ganho de capital na venda. Para
                ver o impacto desses impostos, use as calculadoras de{' '}
                <Link to="/calculadoras/imposto-de-renda-aluguel" className="underline">
                  IR sobre aluguel
                </Link>{' '}
                e de{' '}
                <Link to="/calculadoras/ganho-de-capital" className="underline">
                  ganho de capital
                </Link>
                .
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

export default RentabilidadeCalculator;
