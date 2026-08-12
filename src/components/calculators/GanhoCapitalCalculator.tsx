import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calculator, FileDown, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface BracketSlice {
  label: string;
  rate: number;
  amount: number;
  tax: number;
}

const BRACKETS = [
  { limit: 5_000_000, rate: 0.15, label: 'Até R$ 5.000.000,00' },
  { limit: 10_000_000, rate: 0.175, label: 'De R$ 5.000.000,01 a R$ 10.000.000,00' },
  { limit: 30_000_000, rate: 0.2, label: 'De R$ 10.000.000,01 a R$ 30.000.000,00' },
  { limit: Infinity, rate: 0.225, label: 'Acima de R$ 30.000.000,00' },
];

type Scenario = 'pre1988' | 'exempt' | 'taxable';

interface Result {
  saleValue: number;
  purchaseValue: number;
  improvements: number;
  saleExpenses: number;
  gain: number;
  scenario: Scenario;
  exemptionReasons: string[];
  tax: number;
  effectiveRate: number;
  slices: BracketSlice[];
}

const computeTax = (gain: number): { tax: number; slices: BracketSlice[] } => {
  let remaining = gain;
  let previous = 0;
  let tax = 0;
  const slices: BracketSlice[] = [];

  for (const bracket of BRACKETS) {
    if (remaining <= 0) break;
    const span = bracket.limit - previous;
    const amount = Math.min(remaining, span);
    const bracketTax = amount * bracket.rate;
    tax += bracketTax;
    slices.push({ label: bracket.label, rate: bracket.rate, amount, tax: bracketTax });
    remaining -= amount;
    previous = bracket.limit;
  }

  return { tax, slices };
};

export const GanhoCapitalCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    saleValue: '',
    purchaseValue: '',
    improvements: '',
    saleExpenses: '',
  });
  const [pre1988, setPre1988] = useState(false);
  const [singleProperty, setSingleProperty] = useState(false);
  const [reinvest, setReinvest] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const calculate = () => {
    const saleValue = parseFloat(formData.saleValue);
    const purchaseValue = parseFloat(formData.purchaseValue);

    if (!saleValue || saleValue <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o valor de venda do imóvel.',
        variant: 'destructive',
      });
      return;
    }
    if (!purchaseValue || purchaseValue <= 0) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o valor de aquisição do imóvel.',
        variant: 'destructive',
      });
      return;
    }

    const improvements = parseFloat(formData.improvements) || 0;
    const saleExpenses = parseFloat(formData.saleExpenses) || 0;
    const gain = Math.max(0, saleValue - purchaseValue - improvements - saleExpenses);

    const exemptionReasons: string[] = [];
    if (singleProperty) {
      exemptionReasons.push(
        'Único imóvel, venda de até R$ 440.000,00 e nenhuma outra venda de imóvel nos últimos 5 anos (Art. 39 da Lei 11.196/2005).',
      );
    }
    if (reinvest) {
      exemptionReasons.push(
        'Aplicação do valor total da venda na compra de outro imóvel residencial no Brasil em até 180 dias (Lei 11.196/2005) — válida apenas para o valor integralmente reinvestido e utilizável uma vez a cada 5 anos.',
      );
    }

    let scenario: Scenario = 'taxable';
    if (pre1988) scenario = 'pre1988';
    else if (exemptionReasons.length > 0) scenario = 'exempt';

    let tax = 0;
    let slices: BracketSlice[] = [];
    if (scenario === 'taxable') {
      const computed = computeTax(gain);
      tax = computed.tax;
      slices = computed.slices;
    }

    setResult({
      saleValue,
      purchaseValue,
      improvements,
      saleExpenses,
      gain,
      scenario,
      exemptionReasons,
      tax,
      effectiveRate: gain > 0 ? (tax / gain) * 100 : 0,
      slices,
    });

    toast({
      title: 'Cálculo concluído',
      description: 'Ganho de capital apurado com sucesso.',
    });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Memorial de Calculo - Ganho de Capital', 105, 20, { align: 'center' });

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
      [`Valor de venda: R$ ${brl(result.saleValue)}`, `Valor de aquisicao: R$ ${brl(result.purchaseValue)}`],
      [`Benfeitorias: R$ ${brl(result.improvements)}`, `Despesas com a venda: R$ ${brl(result.saleExpenses)}`],
      [`Ganho de capital: R$ ${brl(result.gain)}`, ''],
    ];
    let yPos = 54;
    rows.forEach((row) => {
      doc.text(row[0], 20, yPos);
      if (row[1]) doc.text(row[1], 115, yPos);
      yPos += 8;
    });

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    let y = 92;

    if (result.scenario === 'pre1988') {
      doc.text('Imovel adquirido antes de 1988', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        doc.splitTextToSize(
          'Imoveis adquiridos antes de 1988 seguem regras de transicao com percentuais de reducao (ou isencao) do ganho de capital que variam conforme o ano de aquisicao. O calculo exato deve ser feito no programa GCAP da Receita Federal ou com um contador.',
          170,
        ),
        20,
        y,
      );
      y += 30;
    } else if (result.scenario === 'exempt') {
      doc.text('Isento de Imposto de Renda sobre o ganho de capital', 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      result.exemptionReasons.forEach((reason) => {
        const lines = doc.splitTextToSize(`- ${reason}`, 170);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 3;
      });
      y += 5;
    } else {
      doc.text(`Imposto estimado: R$ ${brl(result.tax)}`, 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Aliquota efetiva: ${result.effectiveRate.toFixed(2).replace('.', ',')}%`, 20, y);
      y += 10;
      if (result.slices.length > 1) {
        doc.setFont('helvetica', 'bold');
        doc.text('Detalhamento por faixa', 20, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        result.slices.forEach((slice) => {
          doc.text(
            `${slice.label} - ${(slice.rate * 100).toFixed(1).replace('.', ',')}% sobre R$ ${brl(
              slice.amount,
            )} = R$ ${brl(slice.tax)}`,
            20,
            y,
          );
          y += 6;
        });
        y += 4;
      }
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      doc.splitTextToSize(
        'Estimativa educativa. Nao substitui o preenchimento do GCAP, programa oficial da Receita Federal para apuracao e recolhimento do imposto sobre ganho de capital. Recomendamos a orientacao de um contador em casos com multiplas isencoes, pessoa juridica ou imovel rural.',
        170,
      ),
      20,
      Math.max(y, 250),
    );

    doc.save(`memorial-ganho-de-capital-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({ title: 'PDF exportado', description: 'Memorial de cálculo salvo com sucesso.' });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="saleValue">Valor de venda do imóvel (R$)</Label>
          <CurrencyInput
            id="saleValue"
            value={formData.saleValue}
            onChange={(value) => setFormData({ ...formData, saleValue: value })}
            placeholder="800.000,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchaseValue">Valor de aquisição do imóvel (R$)</Label>
          <CurrencyInput
            id="purchaseValue"
            value={formData.purchaseValue}
            onChange={(value) => setFormData({ ...formData, purchaseValue: value })}
            placeholder="500.000,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="improvements">Benfeitorias e reformas documentadas (R$)</Label>
          <CurrencyInput
            id="improvements"
            value={formData.improvements}
            onChange={(value) => setFormData({ ...formData, improvements: value })}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            Só entram custos com nota fiscal ou comprovante em seu nome.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="saleExpenses">Despesas com a venda (R$)</Label>
          <CurrencyInput
            id="saleExpenses"
            value={formData.saleExpenses}
            onChange={(value) => setFormData({ ...formData, saleExpenses: value })}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            Corretagem, ITBI quando aplicável e demais custos da transação.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="pre1988"
            checked={pre1988}
            onCheckedChange={(checked) => setPre1988(checked === true)}
          />
          <Label htmlFor="pre1988" className="text-sm font-normal leading-snug">
            Comprei este imóvel antes de 1988
          </Label>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="singleProperty"
            checked={singleProperty}
            onCheckedChange={(checked) => setSingleProperty(checked === true)}
          />
          <Label htmlFor="singleProperty" className="text-sm font-normal leading-snug">
            Este é o único imóvel que possuo, o valor de venda é até R$ 440.000,00, e não vendi
            nenhum outro imóvel nos últimos 5 anos
          </Label>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="reinvest"
            checked={reinvest}
            onCheckedChange={(checked) => setReinvest(checked === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="reinvest" className="text-sm font-normal leading-snug">
              Pretendo usar o valor total da venda para comprar outro imóvel residencial no Brasil
              em até 180 dias
            </Label>
            <p className="text-xs text-muted-foreground">
              A isenção vale apenas para o valor total reinvestido e pode ser usada uma vez a cada
              5 anos.
            </p>
          </div>
        </div>
      </div>

      <Button onClick={calculate} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Calcular ganho de capital
      </Button>

      {result && (
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Resultado da apuração
                </span>
              </div>
              <Badge
                className={
                  result.scenario === 'exempt'
                    ? 'bg-success text-success-foreground hover:bg-success'
                    : result.scenario === 'pre1988'
                    ? 'bg-warning text-warning-foreground hover:bg-warning'
                    : 'bg-info text-info-foreground hover:bg-info'
                }
              >
                {result.scenario === 'exempt'
                  ? 'Isento'
                  : result.scenario === 'pre1988'
                  ? 'Regra de transição (pré-1988)'
                  : 'Tributável'}
              </Badge>
            </div>

            {result.scenario === 'pre1988' && (
              <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200">
                <p className="mb-2 font-semibold">Imóvel adquirido antes de 1988</p>
                <p>
                  Imóveis adquiridos antes de 1988 seguem regras de transição, com percentuais de
                  redução (podendo chegar à isenção) do ganho de capital que variam conforme o ano
                  de aquisição. Por isso não calculamos o imposto aqui: a apuração exata deve ser
                  feita no programa GCAP da Receita Federal ou com um contador.
                </p>
              </div>
            )}

            {result.scenario === 'exempt' && (
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950/20 dark:text-green-200">
                <p className="mb-2 font-semibold">
                  Isento de Imposto de Renda sobre o ganho de capital
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {result.exemptionReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.scenario === 'taxable' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-primary/5 p-4 text-center">
                  <span className="text-sm text-muted-foreground">Imposto estimado</span>
                  <div className="text-3xl font-bold text-primary">R$ {brl(result.tax)}</div>
                  <span className="text-xs text-muted-foreground">
                    Alíquota efetiva de {result.effectiveRate.toFixed(2).replace('.', ',')}% sobre o
                    ganho de capital
                  </span>
                </div>

                {result.slices.length > 1 && (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left font-medium">Faixa</th>
                          <th className="p-2 text-right font-medium">Alíquota</th>
                          <th className="p-2 text-right font-medium">Base</th>
                          <th className="p-2 text-right font-medium">Imposto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.slices.map((slice) => (
                          <tr key={slice.label} className="border-t">
                            <td className="p-2">{slice.label}</td>
                            <td className="p-2 text-right">
                              {(slice.rate * 100).toFixed(1).replace('.', ',')}%
                            </td>
                            <td className="p-2 text-right">R$ {brl(slice.amount)}</td>
                            <td className="p-2 text-right font-medium">R$ {brl(slice.tax)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Ganho de capital</span>
                <div className="font-semibold text-foreground">R$ {brl(result.gain)}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Valor de venda</span>
                <div className="font-semibold text-foreground">R$ {brl(result.saleValue)}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Valor de aquisição</span>
                <div className="font-semibold text-foreground">R$ {brl(result.purchaseValue)}</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Benfeitorias + despesas</span>
                <div className="font-semibold text-foreground">
                  R$ {brl(result.improvements + result.saleExpenses)}
                </div>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Estimativa educativa. Não substitui o preenchimento do GCAP, o programa oficial da
                Receita Federal para apurar e recolher o imposto sobre ganho de capital.
                Recomendamos a orientação de um contador em casos com múltiplas isenções, pessoa
                jurídica ou imóvel rural.
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

export default GanhoCapitalCalculator;
