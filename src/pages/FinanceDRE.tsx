import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, FileText, FileDown } from "lucide-react";
import { useDREReport } from "@/hooks/useDREReport";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { exportDREtoPDF, exportDREtoCSV } from "@/utils/dreExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { UnitSelector } from "@/components/finance/UnitSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface DRELineProps {
  label: string;
  value: number;
  items?: { categoryName: string; total: number }[];
  isTotal?: boolean;
  isPositive?: boolean;
  isNegative?: boolean;
  operator?: '+' | '-' | '=';
}

function DRELine({ label, value, items, isTotal, isPositive, isNegative, operator }: DRELineProps) {
  return (
    <div className={cn("space-y-1", isTotal && "border-t pt-2")}>
      <div className={cn(
        "flex items-center justify-between py-1",
        isTotal && "font-bold"
      )}>
        <div className="flex items-center gap-2">
          {operator && (
            <span className={cn(
              "w-5 text-center text-sm font-mono",
              operator === '+' && "text-emerald-600",
              operator === '-' && "text-red-600"
            )}>
              ({operator})
            </span>
          )}
          <span className={cn(isTotal && "uppercase")}>{label}</span>
        </div>
        <span className={cn(
          isPositive && value > 0 && "text-emerald-600",
          isNegative && value > 0 && "text-red-600",
          isTotal && value > 0 && isPositive && "text-emerald-600",
          isTotal && value < 0 && "text-red-600"
        )}>
          {formatCurrency(value)}
        </span>
      </div>
      {items && items.length > 0 && (
        <div className="pl-7 space-y-0.5">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-muted-foreground">
              <span>• {item.categoryName}</span>
              <span>{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function FinanceDRE() {
  const currentYear = new Date().getFullYear();
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([String(currentYear)]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const years = useMemo(
    () => [currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(String),
    [currentYear]
  );

  // Fetch unit name for exports (only when exactly 1 unit selected)
  const { data: selectedUnit } = useQuery({
    queryKey: ["unit-for-dre", selectedUnitIds[0]],
    queryFn: async () => {
      if (!selectedUnitIds[0]) return null;
      const { data, error } = await supabase
        .from("units")
        .select("unit_number, property:properties(name)")
        .eq("id", selectedUnitIds[0])
        .single();
      if (error) throw error;
      return data;
    },
    enabled: selectedUnitIds.length === 1,
  });

  const unitDisplayName = useMemo(() => {
    if (selectedUnitIds.length === 0) return undefined;
    if (selectedUnitIds.length > 1) return `${selectedUnitIds.length} unidades`;
    if (!selectedUnit) return undefined;
    const propertyName = (selectedUnit as any).property?.name;
    return propertyName
      ? `${selectedUnit.unit_number} (${propertyName})`
      : selectedUnit.unit_number;
  }, [selectedUnit, selectedUnitIds]);

  // Compute date range from year + month filters
  const dateRange = useMemo(() => {
    const year = parseInt(selectedYear, 10);
    if (selectedMonth === "all") {
      const base = new Date(year, 0, 1);
      return { start: startOfYear(base), end: endOfYear(base) };
    }
    const monthIdx = parseInt(selectedMonth, 10) - 1;
    const base = new Date(year, monthIdx, 1);
    return { start: startOfMonth(base), end: endOfMonth(base) };
  }, [selectedYear, selectedMonth]);

  const { data: dre, isLoading } = useDREReport(
    dateRange.start,
    dateRange.end,
    selectedUnitIds.length > 0 ? selectedUnitIds : undefined
  );

  const periodLabel = useMemo(() => {
    if (selectedMonth === "all") return `Ano de ${selectedYear}`;
    const monthIdx = parseInt(selectedMonth, 10) - 1;
    return `${MONTH_NAMES[monthIdx]} de ${selectedYear}`;
  }, [selectedYear, selectedMonth]);

  const handleExportPDF = async () => {
    if (dre) await exportDREtoPDF(dre, periodLabel, unitDisplayName);
  };

  const handleExportCSV = () => {
    if (dre) exportDREtoCSV(dre, periodLabel, unitDisplayName);
  };

  return (
    <AppLayout>
      <div className="container max-w-3xl mx-auto py-6 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-1.5">DRE <HelpTooltip featureKey="finance.dre" /></h1>
              <p className="text-muted-foreground">
                Demonstrativo do Resultado do Exercício
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!dre}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters Section */}
        <Card>
          <CardContent className="py-4">
            <div className="flex gap-3 flex-wrap items-center">
              <div className="w-full sm:w-64">
                <UnitSelector
                  values={selectedUnitIds}
                  onChange={setSelectedUnitIds}
                  placeholder="Todas as unidades"
                />

              </div>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* DRE Report */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-center">
              DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO
            </CardTitle>
            <CardDescription className="text-center">
              Período: {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} a {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
              {unitDisplayName && ` | Unidade: ${unitDisplayName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-6 space-y-4">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Carregando dados...
              </div>
            ) : !dre ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum dado encontrado para o período
              </div>
            ) : (
              <div className="space-y-3">
                <DRELine operator="+" label="RECEITA BRUTA" value={dre.grossRevenue.total} items={dre.grossRevenue.items} isPositive />
                <DRELine operator="-" label="DEDUÇÕES (Impostos)" value={dre.taxDeductions.total} items={dre.taxDeductions.items} isNegative />
                <DRELine operator="=" label="RECEITA LÍQUIDA" value={dre.netRevenue} isTotal isPositive />
                <DRELine operator="-" label="CUSTOS VARIÁVEIS" value={dre.variableCosts.total} items={dre.variableCosts.items} isNegative />
                <DRELine operator="=" label="LUCRO BRUTO" value={dre.grossProfit} isTotal isPositive />
                <DRELine operator="-" label="DESPESAS COMERCIAIS" value={dre.salesExpenses.total} items={dre.salesExpenses.items} isNegative />
                <DRELine operator="-" label="DESPESAS ADMINISTRATIVAS" value={dre.adminExpenses.total} items={dre.adminExpenses.items} isNegative />
                <DRELine operator="-" label="DESPESAS FINANCEIRAS" value={dre.financialExpenses.total} items={dre.financialExpenses.items} isNegative />
                <DRELine operator="=" label="LUCRO OPERACIONAL" value={dre.operatingProfit} isTotal isPositive />
                <DRELine operator="+" label="RECEITAS FINANCEIRAS" value={dre.financialRevenue.total} items={dre.financialRevenue.items} isPositive />
                <DRELine operator="-" label="DISTRIBUIÇÃO DE LUCROS" value={dre.profitDistribution.total} items={dre.profitDistribution.items} isNegative />
                <div className="border-t-2 border-foreground pt-3">
                  <DRELine operator="=" label="RESULTADO LÍQUIDO" value={dre.netResult} isTotal isPositive={dre.netResult >= 0} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Box */}
        {dre && (
          <Card className={cn(
            "border-2",
            dre.netResult >= 0 ? "border-emerald-500 bg-emerald-500/5" : "border-red-500 bg-red-500/5"
          )}>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Resultado do Período</p>
              <p className={cn(
                "text-3xl font-bold",
                dre.netResult >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {formatCurrency(dre.netResult)}
              </p>
              <p className="text-sm mt-2">
                {dre.netResult >= 0 ? "Lucro" : "Prejuízo"} - {periodLabel}
                {unitDisplayName && ` | ${unitDisplayName}`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
