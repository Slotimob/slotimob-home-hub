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
import { Building2, Calculator, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pdfSafeLabel } from '@/utils/pdfSafeText';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tipologiaOptions = [
  { value: 'apartamento', label: 'Apartamento Padrão', multiplier: 1.0 },
  { value: 'cobertura', label: 'Cobertura', multiplier: 1.15 },
  { value: 'casa', label: 'Casa', multiplier: 1.05 },
  { value: 'kitnet', label: 'Kitnet', multiplier: 0.95 },
];

const idadeOptions = [
  { value: 'novo', label: 'Novo — até 5 anos', multiplier: 1.05 },
  { value: 'seminovo', label: 'Seminovo — 5 a 15 anos', multiplier: 1.0 },
  { value: 'usado', label: 'Usado — mais de 15 anos', multiplier: 0.92 },
];

const vagasOptions = [
  { value: '0', label: '0', multiplier: 0.95 },
  { value: '1', label: '1', multiplier: 1.0 },
  { value: '2', label: '2', multiplier: 1.05 },
  { value: '3+', label: '3+', multiplier: 1.1 },
];

const booleanOptions = [
  { value: 'sim', label: 'Sim', multiplier: 1.03 },
  { value: 'nao', label: 'Não', multiplier: 1.0 },
];

const conservacaoOptions = [
  { value: 'reformar', label: 'A reformar', multiplier: 0.9 },
  { value: 'bom', label: 'Bom', multiplier: 1.0 },
  { value: 'excelente', label: 'Excelente', multiplier: 1.08 },
];

const findMultiplier = (options: { value: string; label: string; multiplier: number }[], value: string) =>
  options.find((o) => o.value === value)?.multiplier ?? 1;

const labelByValue = (options: { value: string; label: string; multiplier: number }[], value: string) =>
  options.find((o) => o.value === value)?.label ?? value;

export const ValorImovelCalculator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    area: '',
    valorM2: '',
    tipologia: 'apartamento',
    idade: 'seminovo',
    vagas: '1',
    suite: 'nao',
    conservacao: 'bom',
    lazer: 'nao',
  });

  const [result, setResult] = useState<{
    base: number;
    multiplier: number;
    estimated: number;
    min: number;
    max: number;
  } | null>(null);

  const calculateValue = () => {
    const area = parseFloat(formData.area);
    const valorM2 = parseFloat(formData.valorM2);

    if (!area || !valorM2 || area <= 0 || valorM2 <= 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a área útil e o valor médio do m² na região.',
        variant: 'destructive',
      });
      return;
    }

    const multiplier =
      findMultiplier(tipologiaOptions, formData.tipologia) *
      findMultiplier(idadeOptions, formData.idade) *
      findMultiplier(vagasOptions, formData.vagas) *
      findMultiplier(booleanOptions, formData.suite) *
      findMultiplier(conservacaoOptions, formData.conservacao) *
      findMultiplier(booleanOptions, formData.lazer);

    const base = area * valorM2;
    const estimated = base * multiplier;
    const min = estimated * 0.92;
    const max = estimated * 1.08;

    setResult({ base, multiplier, estimated, min, max });
    toast({
      title: 'Valor estimado',
      description: 'Faixa de avaliação calculada com sucesso.',
    });
  };

  const exportToPDF = async () => {
    if (!result) return;

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Memorial de Calculo - Avaliacao de Imovel', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' });

    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 35, 182, 60, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Caracteristicas Informadas', 20, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const rows = [
      [`Area util: ${formData.area} m²`, `Valor medio do m²: R$ ${brl(parseFloat(formData.valorM2))}`],
      [`Tipologia: ${labelByValue(tipologiaOptions, formData.tipologia)}`, `Idade: ${labelByValue(idadeOptions, formData.idade)}`],
      [`Vagas: ${labelByValue(vagasOptions, formData.vagas)}`, `Suite: ${labelByValue(booleanOptions, formData.suite)}`],
      [`Conservacao: ${labelByValue(conservacaoOptions, formData.conservacao)}`, `Lazer no condominio: ${labelByValue(booleanOptions, formData.lazer)}`],
    ];

    let yPos = 54;
    rows.forEach((row) => {
      doc.text(row[0], 20, yPos);
      doc.text(row[1], 115, yPos);
      yPos += 8;
    });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Multiplicador total aplicado: ${result.multiplier.toFixed(3)}`, 20, 115);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Faixa de Valor Estimado', 20, 135);
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text(`R$ ${brl(result.min)} a R$ ${brl(result.max)}`, 20, 145);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Valor central estimado: R$ ${brl(result.estimated)}`, 20, 155);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Estimativa educacional baseada em multiplicadores de mercado tipicos — nao substitui avaliacao profissional',
      20,
      170,
    );
    doc.text(
      '(laudo de engenharia, corretor com CRECI ou avaliacao bancaria) para fins de venda, compra ou financiamento.',
      20,
      175,
    );

    doc.save(
      `memorial-avaliacao-imovel-${pdfSafeLabel(formData.tipologia).toLowerCase()}-${
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
          <Label htmlFor="area">Área útil (m²)</Label>
          <Input
            id="area"
            type="number"
            min="0"
            step="0.01"
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            placeholder="75,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valorM2">Valor médio do m² na região (R$)</Label>
          <CurrencyInput
            id="valorM2"
            value={formData.valorM2}
            onChange={(value) => setFormData({ ...formData, valorM2: value })}
            placeholder="8.500,00"
          />
          <p className="text-xs text-muted-foreground">
            Consulte anúncios de imóveis similares no seu bairro para essa referência.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipologia">Tipologia</Label>
          <Select
            value={formData.tipologia}
            onValueChange={(value) => setFormData({ ...formData, tipologia: value })}
          >
            <SelectTrigger id="tipologia">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tipologiaOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="idade">Idade do imóvel</Label>
          <Select
            value={formData.idade}
            onValueChange={(value) => setFormData({ ...formData, idade: value })}
          >
            <SelectTrigger id="idade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {idadeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vagas">Vagas de garagem</Label>
          <Select
            value={formData.vagas}
            onValueChange={(value) => setFormData({ ...formData, vagas: value })}
          >
            <SelectTrigger id="vagas">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vagasOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="suite">Tem suíte?</Label>
          <Select
            value={formData.suite}
            onValueChange={(value) => setFormData({ ...formData, suite: value })}
          >
            <SelectTrigger id="suite">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {booleanOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="conservacao">Estado de conservação</Label>
          <Select
            value={formData.conservacao}
            onValueChange={(value) => setFormData({ ...formData, conservacao: value })}
          >
            <SelectTrigger id="conservacao">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {conservacaoOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lazer">Área de lazer no condomínio?</Label>
          <Select
            value={formData.lazer}
            onValueChange={(value) => setFormData({ ...formData, lazer: value })}
          >
            <SelectTrigger id="lazer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {booleanOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={calculateValue} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Calcular faixa de valor
      </Button>

      {result && (
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Faixa estimada de valor</span>
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground">
                R$ {brl(result.min)} a R$ {brl(result.max)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Valor central estimado: R$ {brl(result.estimated)} · Variação ±8%
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Valor base</span>
                <div className="font-semibold text-foreground">R$ {brl(result.base)}</div>
                <span className="text-xs text-muted-foreground">Área × valor do m²</span>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <span className="text-muted-foreground">Multiplicador total</span>
                <div className="font-semibold text-foreground">{result.multiplier.toFixed(3)}</div>
                <span className="text-xs text-muted-foreground">Produto dos ajustes</span>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
              <p>
                <strong>Importante:</strong> esta é uma estimativa educacional. Para decisões formais de
                venda, compra ou financiamento, consulte um corretor com CRECI, engenheiro avaliador ou o
                banco financiador.
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

export default ValorImovelCalculator;
