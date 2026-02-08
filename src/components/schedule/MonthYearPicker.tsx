import { useState } from "react";
import { format, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthYearPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
  showNavigation?: boolean;
}

const MONTHS = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
];

export function MonthYearPicker({
  value,
  onChange,
  className,
  showNavigation = true,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handlePrevMonth = () => {
    const newDate = new Date(value);
    newDate.setMonth(newDate.getMonth() - 1);
    onChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(value);
    newDate.setMonth(newDate.getMonth() + 1);
    onChange(newDate);
  };

  const handleMonthChange = (month: string) => {
    onChange(setMonth(value, parseInt(month)));
  };

  const handleYearChange = (year: string) => {
    onChange(setYear(value, parseInt(year)));
  };

  const monthLabel = format(value, "MMMM yyyy", { locale: ptBR });
  const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {showNavigation && (
        <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[160px] justify-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{capitalizedLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="center">
          <div className="flex gap-2">
            <Select
              value={value.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={value.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(new Date());
                setOpen(false);
              }}
            >
              Hoje
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {showNavigation && (
        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
