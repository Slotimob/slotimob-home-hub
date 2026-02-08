import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyFull } from "@/hooks/useSmartCurrency";
import { cn } from "@/lib/utils";
import type { CashFlowMonthData } from "./FinanceCashFlowChart";

interface CashFlowAnalyticsTableProps {
  data: CashFlowMonthData[];
}

interface RowConfig {
  label: string;
  key: keyof CashFlowMonthData | null;
  isSubRow?: boolean;
  isTotal?: boolean;
  type?: "income" | "expense" | "balance";
  isPending?: boolean;
}

const rows: RowConfig[] = [
  { label: "Receitas Totais", key: "incomeTotal", isTotal: true, type: "income" },
  { label: "Recebidas", key: "incomeReceived", isSubRow: true, type: "income" },
  { label: "Pendentes", key: "incomePending", isSubRow: true, type: "income", isPending: true },
  { label: "Despesas Totais", key: "expenseTotal", isTotal: true, type: "expense" },
  { label: "Pagas", key: "expensePaid", isSubRow: true, type: "expense" },
  { label: "Pendentes", key: "expensePending", isSubRow: true, type: "expense", isPending: true },
  { label: "Saldo Total", key: "balanceTotal", isTotal: true, type: "balance" },
  { label: "Saldo Real", key: "balanceReal", isSubRow: true, type: "balance" },
  { label: "Saldo Pendências", key: "balancePending", isSubRow: true, type: "balance", isPending: true },
];

function getValueColor(value: number, type?: "income" | "expense" | "balance", isPending?: boolean): string {
  if (isPending) {
    return "text-amber-600 dark:text-amber-400";
  }
  
  if (type === "balance") {
    if (value > 0) return "text-green-600 dark:text-green-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  }
  if (type === "income") return "text-green-600 dark:text-green-400";
  if (type === "expense") return "text-red-600 dark:text-red-400";
  return "";
}

function getCashStatus(
  totalBalanceReal: number, 
  totalIncomePending: number, 
  totalExpensePending: number
): { text: string; className: string } {
  // New logic: if (Real Balance + Pending Income) < Pending Expenses → risk of default
  if ((totalBalanceReal + totalIncomePending) < totalExpensePending) {
    return {
      text: "Atenção: Risco de Inadimplência",
      className: "text-red-600 dark:text-red-400 font-bold"
    };
  }
  if (totalBalanceReal < 0) {
    return {
      text: "Atenção: Problema de Caixa",
      className: "text-red-600 dark:text-red-400 font-bold"
    };
  }
  return {
    text: "Saudável",
    className: "text-emerald-600 dark:text-emerald-400 font-semibold"
  };
}

function calculatePeriodTotals(data: CashFlowMonthData[]): Record<string, number> {
  const totals: Record<string, number> = {};
  rows.forEach(row => {
    if (row.key) {
      totals[row.key] = data.reduce((sum, month) => sum + (month[row.key as keyof CashFlowMonthData] as number), 0);
    }
  });
  return totals;
}

export function CashFlowAnalyticsTable({ data }: CashFlowAnalyticsTableProps) {
  const periodTotals = calculatePeriodTotals(data);
  
  // Calculate totals for status diagnostic
  const totalBalanceReal = periodTotals.balanceReal || 0;
  const totalIncomePending = periodTotals.incomePending || 0;
  const totalExpensePending = periodTotals.expensePending || 0;
  const overallStatus = getCashStatus(totalBalanceReal, totalIncomePending, totalExpensePending);

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
            <TableHead className="text-xs font-semibold min-w-[150px] sticky left-0 bg-muted z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
              Métrica
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
            const stickyBg = getStickyBgClass(row);
            return (
              <TableRow 
                key={row.label}
                className={cn(
                  row.isTotal && "bg-muted font-medium",
                  row.isSubRow && "bg-card"
                )}
              >
                <TableCell 
                  className={cn(
                    "sticky left-0 z-10 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]",
                    stickyBg,
                    row.isTotal ? "text-sm font-semibold" : "text-xs",
                    row.isSubRow && "pl-6",
                    row.isPending && "text-amber-600 dark:text-amber-400"
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
                        row.isTotal ? "text-sm font-semibold" : "text-xs",
                        getValueColor(value, row.type, row.isPending)
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
                    getValueColor(rowTotal, row.type, row.isPending)
                  )}
                >
                  {formatCurrencyFull(rowTotal)}
                </TableCell>
              </TableRow>
            );
          })}
          
          {/* Cash Status Diagnostic Row */}
          <TableRow className="bg-muted border-t-2 border-border">
            <TableCell 
              className="sticky left-0 z-10 py-3 text-sm font-bold bg-muted shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
            >
              Status de Caixa
            </TableCell>
            {data.map((month) => {
              const monthStatus = getCashStatus(month.balanceReal, month.incomePending, month.expensePending);
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
                overallStatus.className
              )}
            >
              {overallStatus.text}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
