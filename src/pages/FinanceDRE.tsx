import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, FileText, FileDown, X } from "lucide-react";
import { useDREReport, DREData } from "@/hooks/useDREReport";
import { format, startOfMonth, endOfMonth, addMonths, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { exportDREtoPDF, exportDREtoCSV } from "@/utils/dreExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
import { useTransactionDateRange } from "@/hooks/useTransactionDateRange";

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

interface MonthOption {
  value: string;
  label: string;
  year: string;
  month: string;
  start: Date;
  end: Date;
}

// Generate available months dynamically based on min/max dates from database
function generateMonthsFromRange(minDate: Date | null, maxDate: Date): MonthOption[] {
  const now = new Date();
  // If no min date, start from 24 months ago as fallback
  const start = minDate || addMonths(now, -24);
  
  const allMonths = eachMonthOfInterval({ start, end: maxDate });
  
  return allMonths.map(date => ({
    value: format(date, "yyyy-MM"),
    label: format(date, "MMMM yyyy", { locale: ptBR }),
    year: format(date, "yyyy"),
    month: format(date, "MM"),
    start: startOfMonth(date),
    end: endOfMonth(date),
  })).reverse(); // Most recent first
}

// Get unique years from months
function getYears(months: MonthOption[]) {
  const years = [...new Set(months.map(m => m.year))];
  return years.sort((a, b) => b.localeCompare(a));
}

export default function FinanceDRE() {
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  
  // Fetch date range from database (respects selected unit)
  const { minDate, maxDate, isLoading: isLoadingDateRange } = useTransactionDateRange(
    selectedUnitId || undefined
  );
  
  // Generate months dynamically based on database data
  const months = useMemo(() => {
    if (!maxDate) return [];
    return generateMonthsFromRange(minDate, maxDate);
  }, [minDate, maxDate]);
  
  const years = useMemo(() => getYears(months), [months]);
  
  // Initialize selected months when data is loaded
  useEffect(() => {
    if (months.length > 0 && selectedMonths.length === 0) {
      // Default to current month
      const currentMonth = format(new Date(), "yyyy-MM");
      const hasCurrentMonth = months.some(m => m.value === currentMonth);
      if (hasCurrentMonth) {
        setSelectedMonths([currentMonth]);
      } else if (months.length > 0) {
        setSelectedMonths([months[0].value]);
      }
    }
  }, [months.length]); // Only run when months array changes
  
  // Fetch unit name for exports
  const { data: selectedUnit } = useQuery({
    queryKey: ["unit-for-dre", selectedUnitId],
    queryFn: async () => {
      if (!selectedUnitId) return null;
      const { data, error } = await supabase
        .from("units")
        .select("unit_number, property:properties(name)")
        .eq("id", selectedUnitId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUnitId,
  });

  const unitDisplayName = useMemo(() => {
    if (!selectedUnit) return undefined;
    const propertyName = selectedUnit.property?.name;
    return propertyName 
      ? `${selectedUnit.unit_number} (${propertyName})`
      : selectedUnit.unit_number;
  }, [selectedUnit]);
  
  // Calculate date range based on selected months
  const dateRange = useMemo(() => {
    if (selectedMonths.length === 0) {
      return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
    }
    
    const sortedMonths = [...selectedMonths].sort();
    const firstMonth = months.find(m => m.value === sortedMonths[0]);
    const lastMonth = months.find(m => m.value === sortedMonths[sortedMonths.length - 1]);
    
    return {
      start: firstMonth?.start || startOfMonth(new Date()),
      end: lastMonth?.end || endOfMonth(new Date()),
    };
  }, [selectedMonths, months]);
  
  const { data: dre, isLoading } = useDREReport(
    dateRange.start, 
    dateRange.end, 
    selectedUnitId || undefined
  );

  const toggleMonth = (monthValue: string) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthValue)) {
        return prev.filter(m => m !== monthValue);
      }
      return [...prev, monthValue];
    });
  };

  const selectLast12Months = () => {
    // Select last 12 months from the most recent available
    setSelectedMonths(months.slice(0, 12).map(m => m.value));
  };

  const selectNext12Months = () => {
    // Select from current month to +12 months ahead (for projections)
    const now = new Date();
    const futureMonths: string[] = [];
    
    for (let i = 0; i < 12; i++) {
      const date = addMonths(now, i);
      const monthValue = format(date, "yyyy-MM");
      // Only add if it exists in our available months
      if (months.some(m => m.value === monthValue)) {
        futureMonths.push(monthValue);
      }
    }
    
    setSelectedMonths(futureMonths);
  };

  const selectCurrentMonth = () => {
    setSelectedMonths([months[0].value]);
  };

  const clearMonths = () => {
    setSelectedMonths([]);
  };

  const selectYear = (year: string) => {
    setSelectedYear(year);
    const yearMonths = months.filter(m => m.year === year).map(m => m.value);
    setSelectedMonths(yearMonths);
  };

  const selectSingleMonth = (monthValue: string) => {
    setSelectedMonths([monthValue]);
  };

  const periodLabel = useMemo(() => {
    if (selectedMonths.length === 0) {
      return "Nenhum período selecionado";
    }
    if (selectedMonths.length === 1) {
      const month = months.find(m => m.value === selectedMonths[0]);
      return month?.label || "";
    }
    const sortedMonths = [...selectedMonths].sort();
    const first = months.find(m => m.value === sortedMonths[0]);
    const last = months.find(m => m.value === sortedMonths[sortedMonths.length - 1]);
    return `${first?.label} a ${last?.label}`;
  }, [selectedMonths, months]);

  const handleExportPDF = async () => {
    if (dre) {
      await exportDREtoPDF(dre, periodLabel, unitDisplayName);
    }
  };

  const handleExportCSV = () => {
    if (dre) {
      exportDREtoCSV(dre, periodLabel, unitDisplayName);
    }
  };

  // Filter months by selected year for the popover
  const filteredMonths = selectedYear 
    ? months.filter(m => m.year === selectedYear)
    : months;

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
              <Button variant="outline" disabled={!dre || selectedMonths.length === 0}>
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
            <div className="flex flex-col gap-4">
              {/* Unit Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Filtrar por Unidade/Imóvel</Label>
                  <UnitSelector 
                    value={selectedUnitId} 
                    onChange={setSelectedUnitId}
                    placeholder="Todas as unidades"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selecionar Ano</Label>
                  <Select value={selectedYear} onValueChange={selectYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Period Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Período:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={selectCurrentMonth}>
                    Mês Atual
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectLast12Months}>
                    Últimos 12 Meses
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNext12Months}>
                    Próximos 12 Meses
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearMonths}
                    disabled={selectedMonths.length === 0}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                </div>
              </div>
              
              {/* Selected Period Display */}
              <div className="text-center py-2 bg-muted/50 rounded-lg">
                <p className="text-lg font-semibold capitalize text-primary">
                  {periodLabel}
                </p>
                {selectedMonths.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {format(dateRange.start, "dd/MM/yyyy")} a {format(dateRange.end, "dd/MM/yyyy")}
                  </p>
                )}
                {unitDisplayName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Unidade: {unitDisplayName}
                  </p>
                )}
              </div>
              
              {/* Month Selector Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Selecionar Meses ({selectedMonths.length} selecionado{selectedMonths.length !== 1 ? 's' : ''})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96" align="center">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Selecione os meses:</p>
                      <Select 
                        value={selectedYear || "all"} 
                        onValueChange={(val) => setSelectedYear(val === "all" ? "" : val)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {years.map(year => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {filteredMonths.map((month) => (
                        <div
                          key={month.value}
                          className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => toggleMonth(month.value)}
                        >
                          <Checkbox
                            id={month.value}
                            checked={selectedMonths.includes(month.value)}
                            onCheckedChange={() => toggleMonth(month.value)}
                          />
                          <Label
                            htmlFor={month.value}
                            className="text-sm capitalize cursor-pointer flex-1"
                          >
                            {month.label}
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectSingleMonth(month.value);
                            }}
                            title="Selecionar apenas este mês"
                          >
                            <span className="text-xs text-muted-foreground">só</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={clearMonths}
                      >
                        Limpar Todos
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          if (selectedYear) {
                            selectYear(selectedYear);
                          } else {
                            selectLast12Months();
                          }
                        }}
                      >
                        Selecionar Todos
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
              {selectedMonths.length > 0 ? (
                <>
                  Período: {format(dateRange.start, "dd/MM/yyyy")} a {format(dateRange.end, "dd/MM/yyyy")}
                  {unitDisplayName && ` | Unidade: ${unitDisplayName}`}
                </>
              ) : (
                "Selecione um período para visualizar o relatório"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-6 space-y-4">
            {selectedMonths.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Selecione pelo menos um mês para gerar o relatório
              </div>
            ) : isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Carregando dados...
              </div>
            ) : !dre ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum dado encontrado para o período
              </div>
            ) : (
              <div className="space-y-3">
                {/* Receita Bruta */}
                <DRELine
                  operator="+"
                  label="RECEITA BRUTA"
                  value={dre.grossRevenue.total}
                  items={dre.grossRevenue.items}
                  isPositive
                />

                {/* Deduções */}
                <DRELine
                  operator="-"
                  label="DEDUÇÕES (Impostos)"
                  value={dre.taxDeductions.total}
                  items={dre.taxDeductions.items}
                  isNegative
                />

                {/* Receita Líquida */}
                <DRELine
                  operator="="
                  label="RECEITA LÍQUIDA"
                  value={dre.netRevenue}
                  isTotal
                  isPositive
                />

                {/* Custos Variáveis */}
                <DRELine
                  operator="-"
                  label="CUSTOS VARIÁVEIS"
                  value={dre.variableCosts.total}
                  items={dre.variableCosts.items}
                  isNegative
                />

                {/* Lucro Bruto */}
                <DRELine
                  operator="="
                  label="LUCRO BRUTO"
                  value={dre.grossProfit}
                  isTotal
                  isPositive
                />

                {/* Despesas Comerciais */}
                <DRELine
                  operator="-"
                  label="DESPESAS COMERCIAIS"
                  value={dre.salesExpenses.total}
                  items={dre.salesExpenses.items}
                  isNegative
                />

                {/* Despesas Administrativas */}
                <DRELine
                  operator="-"
                  label="DESPESAS ADMINISTRATIVAS"
                  value={dre.adminExpenses.total}
                  items={dre.adminExpenses.items}
                  isNegative
                />

                {/* Despesas Financeiras */}
                <DRELine
                  operator="-"
                  label="DESPESAS FINANCEIRAS"
                  value={dre.financialExpenses.total}
                  items={dre.financialExpenses.items}
                  isNegative
                />

                {/* Lucro Operacional */}
                <DRELine
                  operator="="
                  label="LUCRO OPERACIONAL"
                  value={dre.operatingProfit}
                  isTotal
                  isPositive
                />

                {/* Receitas Financeiras */}
                <DRELine
                  operator="+"
                  label="RECEITAS FINANCEIRAS"
                  value={dre.financialRevenue.total}
                  items={dre.financialRevenue.items}
                  isPositive
                />

                {/* Distribuição de Lucros */}
                <DRELine
                  operator="-"
                  label="DISTRIBUIÇÃO DE LUCROS"
                  value={dre.profitDistribution.total}
                  items={dre.profitDistribution.items}
                  isNegative
                />

                {/* Resultado Líquido */}
                <div className="border-t-2 border-foreground pt-3">
                  <DRELine
                    operator="="
                    label="RESULTADO LÍQUIDO"
                    value={dre.netResult}
                    isTotal
                    isPositive={dre.netResult >= 0}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Box */}
        {dre && selectedMonths.length > 0 && (
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
