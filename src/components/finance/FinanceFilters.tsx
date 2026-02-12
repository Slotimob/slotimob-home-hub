import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";
import { UnitSelector } from "./UnitSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FinanceFiltersState {
  unitId: string;
  period: string;
  dateFrom: string;
  dateTo: string;
}

interface FinanceFiltersProps {
  filters: FinanceFiltersState;
  onFiltersChange: (filters: FinanceFiltersState) => void;
  showPeriodSelector?: boolean;
}

const PERIOD_OPTIONS = [
  { value: "current_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "last_3_months", label: "Últimos 3 meses" },
  { value: "last_6_months", label: "Últimos 6 meses" },
  { value: "current_year", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
];

function getPeriodDates(period: string): { from: string; to: string } {
  const now = new Date();
  
  switch (period) {
    case "current_month":
      return {
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "last_month":
      const lastMonth = subMonths(now, 1);
      return {
        from: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        to: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      };
    case "last_3_months":
      return {
        from: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "last_6_months":
      return {
        from: format(startOfMonth(subMonths(now, 5)), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "current_year":
      return {
        from: format(startOfYear(now), "yyyy-MM-dd"),
        to: format(endOfYear(now), "yyyy-MM-dd"),
      };
    default:
      return { from: "", to: "" };
  }
}

export function FinanceFilters({ 
  filters, 
  onFiltersChange,
  showPeriodSelector = true 
}: FinanceFiltersProps) {
  const hasFilters = filters.unitId || filters.dateFrom || filters.dateTo || filters.period !== "current_month";

  const handlePeriodChange = (period: string) => {
    if (period === "custom") {
      onFiltersChange({ ...filters, period });
    } else {
      const dates = getPeriodDates(period);
      onFiltersChange({
        ...filters,
        period,
        dateFrom: dates.from,
        dateTo: dates.to,
      });
    }
  };

  const clearFilters = () => {
    const defaultDates = getPeriodDates("current_month");
    onFiltersChange({
      unitId: "",
      period: "current_month",
      dateFrom: defaultDates.from,
      dateTo: defaultDates.to,
    });
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardContent className="py-3 px-3 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-2 sm:gap-3">
          {/* Unit Filter */}
          <div className="space-y-1 w-full sm:w-auto sm:min-w-[140px] sm:max-w-[200px]">
            <Label className="text-[10px] text-muted-foreground">Unidade</Label>
            <UnitSelector
              value={filters.unitId}
              onChange={(v) => onFiltersChange({ ...filters, unitId: v })}
              placeholder="Todas"
            />
          </div>

          {/* Period Selector */}
          {showPeriodSelector && (
            <div className="space-y-1 w-full sm:w-auto sm:min-w-[130px] sm:max-w-[180px]">
              <Label className="text-[10px] text-muted-foreground">Período</Label>
              <Select
                value={filters.period}
                onValueChange={handlePeriodChange}
              >
                <SelectTrigger className="text-xs h-9">
                  <Calendar className="h-3 w-3 mr-1.5 shrink-0" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date From */}
          {(filters.period === "custom" || !showPeriodSelector) && (
            <div className="space-y-1 w-full sm:w-auto sm:min-w-[120px] sm:max-w-[150px]">
              <Label className="text-[10px] text-muted-foreground">De</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Date To */}
          {(filters.period === "custom" || !showPeriodSelector) && (
            <div className="space-y-1 w-full sm:w-auto sm:min-w-[120px] sm:max-w-[150px]">
              <Label className="text-[10px] text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Clear Filters */}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-9 px-2">
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
