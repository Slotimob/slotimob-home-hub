import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Calculator, FileDown, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FIELDS = [
  { key: 'freight', label: 'Frete / transporte', placeholder: '1.200,00' },
  { key: 'packaging', label: 'Embalagem e materiais (caixas, plástico bolha)', placeholder: '300,00' },
  { key: 'labor', label: 'Mão de obra para embalar / desembalar', placeholder: '500,00' },
  { key: 'furniture', label: 'Desmontagem e montagem de móveis', placeholder: '400,00' },
  { key: 'insurance', label: 'Seguro da mudança', placeholder: '250,00' },
  { key: 'buildingFees', label: 'Taxas do prédio (elevador, estacionamento, caução)', placeholder: '200,00' },
  { key: 'cleaning', label: 'Faxina de saída e/ou de entrada', placeholder: '350,00' },
  { key: 'others', label: 'Outros custos', placeholder: '0,00' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

type FormState = Record<FieldKey, string>;

const EMPTY_FORM = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {} as FormState);

interface BreakdownRow {
  label: string;
  value: number;
  percent: number;
}

export const CustoMudancaCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [result, setResult] = useState<{ total: number; breakdown: BreakdownRow[] } | null>(null);

  const calculate = () => {
    const entries = FIELDS.map((f) => ({
      label: f.label,
      value: parseFloat(formData[f.key]) || 0,
    }));
    const total = entries.reduce((sum, e) => sum + e.value, 0);

    if (total <= 0) {
      toast({
        title: 'Nenhum valor informado',
        description: 'Preencha ao menos uma categoria com o valor que você recebeu no orçamento.',
        variant: 'destructive',
      });
      return;
    }

    const breakdown = entries
      .filter((e) => e.value > 0)
      .map((e) => ({ ...e, percent: (e.value / total) * 100 }))
      .sort((a, b) => b.value - a.value);

    setResult({ total, breakdown });

    toast({
      title: 'Orçamento organizado',
      description: 'Somamos os valores que você informou.',
    });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Planejamento de Custo de Mudanca', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Valores informados por voce', 20, 42);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 51;
    result.breakdown.forEach((row) => {
      const label = doc.splitTextToSize(row.label, 110);
      doc.text(label, 20, yPos);
      doc.text(
        `R$ ${brl(row.value)}  (${row.percent.toFixed(1).replace('.', ',')}%)`,
        196,
        yPos,
        { align: 'right' },
      );
      yPos += Math.max(8, label.length * 5);
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    });

    yPos += 4;
    doc.setDrawColor(200);
    doc.line(20, yPos, 196, yPos);
    yPos += 10;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Total estimado', 20, yPos);
    doc.setTextColor(59, 130, 246);
    doc.text(`R$ ${brl(result.total)}`, 196, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    yPos += 16;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const disclaimer = doc.splitTextToSize(
      'Esta ferramenta organiza e soma os valores que voce informou - nao calculamos nem estimamos precos de frete ou servicos de mudanca, porque esses variam muito por cidade, empresa e epoca. Peca orcamentos reais para preencher os campos.',
      176,
    );
    doc.text(disclaimer, 20, yPos);

    doc.save(`planejamento-custo-mudanca-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: 'PDF exportado',
      description: 'Planejamento salvo com sucesso.',
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Informe os valores que você já tem em mãos — orçamentos recebidos ou estimativas próprias.
        O total é a soma exata do que você digitar; nenhum preço é estimado por nós.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label} (R$)</Label>
            <CurrencyInput
              id={field.key}
              value={formData[field.key]}
              onChange={(value) => setFormData({ ...formData, [field.key]: value })}
              placeholder={field.placeholder}
            />
          </div>
        ))}
      </div>

      <Button onClick={calculate} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Somar orçamento da mudança
      </Button>

      {result && (
        <Card className="border-primary/20">
          <CardContent className="space-y-6 pt-6">
            <div className="text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Total do seu orçamento
                </span>
              </div>
              <div className="text-4xl font-bold text-foreground md:text-5xl">
                R$ {brl(result.total)}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Peso de cada categoria no total
              </h3>
              {result.breakdown.map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="whitespace-nowrap font-medium text-foreground">
                      R$ {brl(row.value)} · {row.percent.toFixed(1).replace('.', ',')}%
                    </span>
                  </div>
                  <Progress value={row.percent} className="h-2" />
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm">
              <h3 className="mb-2 font-semibold text-foreground">
                O que influencia o custo de uma mudança
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Distância entre o imóvel de origem e o de destino.</li>
                <li>Volume de itens e tamanho do imóvel.</li>
                <li>Existência de elevador nos dois endereços (e restrição de horário para uso).</li>
                <li>Necessidade de embalagem profissional para itens frágeis.</li>
                <li>
                  Época do mês: as datas de troca de contrato concentram demanda e encarecem o
                  frete.
                </li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                Peça pelo menos três orçamentos de empresas de mudança e use os valores reais para
                preencher os campos acima.
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                Como este resultado é obtido
              </div>
              <p>
                Esta ferramenta organiza e soma os valores que você informar — não calculamos nem
                estimamos preços de frete ou serviços de mudança, porque esses variam muito por
                cidade, empresa e época. Peça orçamentos reais para preencher os campos.
              </p>
            </div>

            <Button onClick={exportToPDF} variant="outline" className="w-full gap-2">
              <FileDown className="h-4 w-4" />
              Exportar planejamento em PDF
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustoMudancaCalculator;
