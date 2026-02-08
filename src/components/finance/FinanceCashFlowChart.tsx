import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrencyCompact, formatCurrencyFull } from "@/hooks/useSmartCurrency";
import { useIsMobile } from "@/hooks/use-mobile";
import { CashFlowAnalyticsTable } from "./CashFlowAnalyticsTable";
import { CashFlowMovementTable, CashFlowMovementData } from "./CashFlowMovementTable";

interface FinanceCashFlowChartProps {
  unitId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CashFlowMonthData {
  month: string;
  monthLabel: string;
  // Income metrics
  incomeTotal: number;
  incomeReceived: number;
  incomePending: number;
  // Expense metrics
  expenseTotal: number;
  expensePaid: number;
  expensePending: number;
  // Balance metrics
  balanceTotal: number;
  balanceReal: number;
  balancePending: number;
}

// Helper to check if transaction is effectively paid
const isEffectivelyPaid = (t: { status: string; is_reconciled: boolean | null }) => 
  t.status === "paid" || t.is_reconciled === true;

const isEffectivelyPending = (t: { status: string; is_reconciled: boolean | null }) => 
  t.status !== "paid" && t.is_reconciled !== true;

export function FinanceCashFlowChart({ unitId, dateFrom, dateTo }: FinanceCashFlowChartProps) {
  const isMobile = useIsMobile();
  
  // Query for operational summary (Table 1)
  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ["finance-cash-flow-chart-analytical", unitId, dateFrom, dateTo],
    queryFn: async () => {
      const months: CashFlowMonthData[] = [];
      const currentDate = new Date();
      
      let startDate = dateFrom ? parseISO(dateFrom) : subMonths(currentDate, 5);
      const endDate = dateTo ? parseISO(dateTo) : currentDate;
      
      const monthCount = Math.min(differenceInMonths(endDate, startDate) + 1, 12);
      startDate = subMonths(endDate, monthCount - 1);

      for (let i = 0; i < monthCount; i++) {
        const monthDate = addMonths(startDate, i);
        const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

        let query = supabase
          .from("financial_transactions")
          .select("amount, type, status, is_reconciled")
          .gte("due_date", monthStart)
          .lte("due_date", monthEnd);

        if (unitId) {
          query = query.eq("unit_id", unitId);
        }

        const { data: transactions } = await query;

        const incomeTransactions = transactions?.filter(t => t.type === "income") || [];
        const incomeTotal = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const incomeReceived = incomeTransactions.filter(isEffectivelyPaid).reduce((sum, t) => sum + Number(t.amount), 0);
        const incomePending = incomeTransactions.filter(isEffectivelyPending).reduce((sum, t) => sum + Number(t.amount), 0);

        const expenseTransactions = transactions?.filter(t => t.type === "expense") || [];
        const expenseTotal = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const expensePaid = expenseTransactions.filter(isEffectivelyPaid).reduce((sum, t) => sum + Number(t.amount), 0);
        const expensePending = expenseTransactions.filter(isEffectivelyPending).reduce((sum, t) => sum + Number(t.amount), 0);

        const balanceTotal = incomeTotal - expenseTotal;
        const balanceReal = incomeReceived - expensePaid;
        const balancePending = incomePending - expensePending;

        months.push({
          month: format(monthDate, "yyyy-MM"),
          monthLabel: format(monthDate, "MMM", { locale: ptBR }),
          incomeTotal,
          incomeReceived,
          incomePending,
          expenseTotal,
          expensePaid,
          expensePending,
          balanceTotal,
          balanceReal,
          balancePending,
        });
      }

      return months;
    },
  });

  // Query for cash movement with continuity (Table 2)
  const { data: movementData, isLoading: isLoadingMovement } = useQuery({
    queryKey: ["finance-cash-flow-movement", unitId, dateFrom, dateTo],
    queryFn: async () => {
      const currentDate = new Date();
      
      let startDate = dateFrom ? parseISO(dateFrom) : subMonths(currentDate, 5);
      const endDate = dateTo ? parseISO(dateTo) : currentDate;
      
      const monthCount = Math.min(differenceInMonths(endDate, startDate) + 1, 12);
      startDate = subMonths(endDate, monthCount - 1);

      // Calculate opening balance: sum of all paid transactions BEFORE the start date
      const rangeStart = format(startOfMonth(startDate), "yyyy-MM-dd");
      
      let openingQuery = supabase
        .from("financial_transactions")
        .select("amount, type, status, is_reconciled")
        .lt("due_date", rangeStart);

      if (unitId) {
        openingQuery = openingQuery.eq("unit_id", unitId);
      }

      const { data: historicalTransactions } = await openingQuery;
      
      // Calculate cumulative balance before the period (only paid/reconciled)
      let cumulativeBalance = 0;
      if (historicalTransactions) {
        const paidHistorical = historicalTransactions.filter(isEffectivelyPaid);
        const historicalIncome = paidHistorical
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const historicalExpenses = paidHistorical
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        cumulativeBalance = historicalIncome - historicalExpenses;
      }

      const months: CashFlowMovementData[] = [];

      for (let i = 0; i < monthCount; i++) {
        const monthDate = addMonths(startDate, i);
        const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

        let query = supabase
          .from("financial_transactions")
          .select("amount, type, status, is_reconciled")
          .gte("due_date", monthStart)
          .lte("due_date", monthEnd);

        if (unitId) {
          query = query.eq("unit_id", unitId);
        }

        const { data: transactions } = await query;

        // Only paid/reconciled transactions for cash movement
        const paidTransactions = transactions?.filter(isEffectivelyPaid) || [];
        
        const incomeReceived = paidTransactions
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const expensesPaid = paidTransactions
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const openingBalance = cumulativeBalance;
        const closingBalance = openingBalance + incomeReceived - expensesPaid;

        months.push({
          month: format(monthDate, "yyyy-MM"),
          monthLabel: format(monthDate, "MMM", { locale: ptBR }),
          openingBalance,
          incomeReceived,
          expensesPaid,
          closingBalance,
        });

        // Update cumulative for next month (continuity rule)
        cumulativeBalance = closingBalance;
      }

      return months;
    },
  });

  const formatCurrency = (value: number) => {
    return formatCurrencyCompact(value);
  };

  const isLoading = isLoadingChart || isLoadingMovement;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
          <Skeleton className="h-[200px] w-full mt-4" />
          <Skeleton className="h-[150px] w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  const renderLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!value || value === 0 || isMobile) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="hsl(var(--muted-foreground))"
        textAnchor="middle"
        fontSize={10}
        fontWeight={500}
      >
        {formatCurrency(value)}
      </text>
    );
  };

  const barChartData = chartData?.map(d => ({
    month: d.monthLabel,
    receitas: d.incomeReceived,
    despesas: d.expensePaid,
    pendReceitas: d.incomePending,
    pendDespesas: d.expensePending,
  })) || [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-3 lg:px-6 pt-3 lg:pt-6">
        <CardTitle className="text-sm lg:text-base">Fluxo de Caixa Analítico</CardTitle>
        <CardDescription className="text-[10px] lg:text-xs">
          Baseado em Data de Vencimento • Análise Operacional e Movimentação Real
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6 space-y-6">
        {/* Bar Chart */}
        <div className="h-[280px] lg:h-[300px] overflow-x-auto">
          <div className="min-w-[300px] h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-muted-foreground"
                  width={60}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrencyFull(value),
                    name === "receitas" ? "Recebidas" : 
                    name === "despesas" ? "Pagas" :
                    name === "pendReceitas" ? "Receitas Pendentes" :
                    "Despesas Pendentes"
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: "8px" }}
                  formatter={(value) => (
                    <span className="text-xs">
                      {value === "receitas" ? "Recebidas" : 
                       value === "despesas" ? "Pagas" :
                       value === "pendReceitas" ? "Pend. Receitas" :
                       "Pend. Despesas"}
                    </span>
                  )}
                />
                <Bar 
                  dataKey="receitas" 
                  name="receitas" 
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]} 
                >
                  <LabelList content={renderLabel} />
                </Bar>
                <Bar 
                  dataKey="despesas" 
                  name="despesas" 
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]} 
                >
                  <LabelList content={renderLabel} />
                </Bar>
                <Bar 
                  dataKey="pendReceitas" 
                  name="pendReceitas" 
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]} 
                  opacity={0.7}
                />
                <Bar 
                  dataKey="pendDespesas" 
                  name="pendDespesas" 
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]} 
                  opacity={0.5}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table 1: Operational Summary */}
        {chartData && chartData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tabela 1: Resumo Operacional
            </h4>
            <CashFlowAnalyticsTable data={chartData} />
          </div>
        )}

        <Separator className="my-4" />

        {/* Table 2: Cash Movement (Real) */}
        {movementData && movementData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tabela 2: Movimentação de Caixa (Real)
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Apenas transações liquidadas • Saldo contínuo mês a mês
            </p>
            <CashFlowMovementTable data={movementData} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
