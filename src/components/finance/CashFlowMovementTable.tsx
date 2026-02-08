import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyFull } from "@/hooks/useSmartCurrency";
import { cn } from "@/lib/utils";

export interface CashFlowMovementData {
  month: string;
  monthLabel: string;
  openingBalance: number;
  incomeReceived: number;
  expensesPaid: number;
  closingBalance: number;
}

interface CashFlowMovementTableProps {
  data: CashFlowMovementData[];
}

interface RowConfig {
  label: string;
  key: keyof CashFlowMovementData | null;
  prefix?: string;
  isTotal?: boolean;
  type?: "income" | "expense" | "balance";
}

const rows: RowConfig[] = [
  { label: "Saldo Inicial", key: "openingBalance", type: "balance" },
  { label: "(+) Receitas Recebidas", key: "incomeReceived", prefix: "+", type: "income" },
  { label: "(-) Despesas Pagas", key: "expensesPaid", prefix: "-", type: "expense" },
  { label: "(=) Saldo Final", key: "closingBalance", isTotal: true, type: "balance" },
];

function getValueColor(value: number, type?: "income" | "expense" | "balance"): string {
  if (type === "balance") {
    if (value > 0) return "text-green-600 dark:text-green-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  }
  if (type === "income") return "text-green-600 dark:text-green-400";
  if (type === "expense") return "text-red-600 dark:text-red-400";
  return "";
}

function getCashHealthStatus(closingBalance: number): { text: string; className: string } {
  if (closingBalance < 0) {
    return {
      text: "Risco de Quebra",
      className: "text-red-600 dark:text-red-400 font-bold"
    };
  }
  return {
    text: "Caixa Saudável",
    className: "text-green-600 dark:text-green-400 font-semibold"
  };
}

function calculatePeriodTotals(data: CashFlowMovementData[]): Record<string, number> {
  if (data.length === 0) return {};
  
  return {
    // Opening balance is the first month's opening
    openingBalance: data[0]?.openingBalance || 0,
    // Sum of all income received
    incomeReceived: data.reduce((sum, month) => sum + month.incomeReceived, 0),
    // Sum of all expenses paid
    expensesPaid: data.reduce((sum, month) => sum + month.expensesPaid, 0),
    // Closing balance is the last month's closing
    closingBalance: data[data.length - 1]?.closingBalance || 0,
  };
}

export function CashFlowMovementTable({ data }: CashFlowMovementTableProps) {
  const periodTotals = calculatePeriodTotals(data);
  
  // Net variation for the period
  const netVariation = periodTotals.closingBalance - periodTotals.openingBalance;

  // Helper to get proper solid background for sticky column based on row state
  const getStickyBgClass = (row: RowConfig): string => {
    if (row.isTotal) return "bg-muted";
    return "bg-card";
  };

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            <TableHead className="text-xs font-semibold min-w-[180px] sticky left-0 bg-muted z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
              Movimentação (Real)
            </TableHead>
            {data.map((month) => (
              <TableHead 
                key={month.month} 
                className="text-xs font-semibold text-center min-w-[90px] uppercase whitespace-nowrap"
              >
                {month.monthLabel}
              </TableHead>
            ))}
            <TableHead className="text-xs font-semibold text-center min-w-[110px] bg-muted/70 whitespace-nowrap">
              Total Período
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const rowTotal = row.key ? periodTotals[row.key] : 0;
            const isClosingBalance = row.key === "closingBalance";
            const stickyBg = getStickyBgClass(row);
            
            return (
              <TableRow 
                key={row.label}
                className={cn(
                  row.isTotal && "bg-muted font-medium border-t-2 border-border",
                  !row.isTotal && "bg-card"
                )}
              >
                <TableCell 
                  className={cn(
                    "sticky left-0 z-10 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]",
                    stickyBg,
                    row.isTotal ? "text-sm font-bold" : "text-xs"
                  )}
                >
                  {row.label}
                </TableCell>
                {data.map((month) => {
                  const value = row.key ? (month[row.key] as number) : 0;
                  return (
                    <TableCell 
                      key={`${month.month}-${row.label}`}
                      className={cn(
                        "text-center font-mono whitespace-nowrap py-2",
                        row.isTotal ? "text-sm font-bold" : "text-xs",
                        getValueColor(value, row.type)
                      )}
                    >
                      {formatCurrencyFull(value)}
                    </TableCell>
                  );
                })}
                {/* Period Total Column */}
                <TableCell 
                  className={cn(
                    "text-center font-mono whitespace-nowrap py-2 bg-muted/40",
                    row.isTotal ? "text-sm font-bold" : "text-xs font-semibold",
                    getValueColor(rowTotal, row.type)
                  )}
                >
                  {isClosingBalance ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{formatCurrencyFull(rowTotal)}</span>
                      <span className={cn(
                        "text-[10px]",
                        netVariation >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}>
                        ({netVariation >= 0 ? "+" : ""}{formatCurrencyFull(netVariation)})
                      </span>
                    </div>
                  ) : (
                    formatCurrencyFull(rowTotal)
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          
          {/* Cash Health Diagnostic Row */}
          <TableRow className="bg-muted border-t-2 border-border">
            <TableCell 
              className="sticky left-0 z-10 py-3 text-sm font-bold bg-muted shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
            >
              Diagnóstico
            </TableCell>
            {data.map((month) => {
              const monthStatus = getCashHealthStatus(month.closingBalance);
              return (
                <TableCell 
                  key={`${month.month}-status`}
                  className={cn(
                    "text-center py-3 text-xs",
                    monthStatus.className
                  )}
                >
                  {monthStatus.text}
                </TableCell>
              );
            })}
            {/* Overall Period Status */}
            <TableCell 
              className={cn(
                "text-center py-3 text-xs bg-muted/40",
                getCashHealthStatus(periodTotals.closingBalance).className
              )}
            >
              {getCashHealthStatus(periodTotals.closingBalance).text}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
