import { useState, useEffect } from "react";
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, LineChart, Line } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrencyCompact, formatCurrencyFull } from "@/hooks/useSmartCurrency";
import { useIsMobile } from "@/hooks/use-mobile";
import { CashFlowAnalyticsTable } from "./CashFlowAnalyticsTable";
import { CashFlowMovementTable, CashFlowMovementData } from "./CashFlowMovementTable";

interface BankAccountInfo {
  id: string;
  name: string;
  bank_name: string | null;
  color: string | null;
}

export interface FinanceCashFlowChartProps {
  unitId?: string;
  dateFrom?: string;
  dateTo?: string;
  bankAccountId?: string;
  bankAccounts?: BankAccountInfo[];
  isAllAccounts?: boolean;
}

export interface CashFlowMonthData {
  month: string;
  monthLabel: string;
  incomeTotal: number;
  incomeReceived: number;
  incomePending: number;
  expenseTotal: number;
  expensePaid: number;
  expensePending: number;
  balanceTotal: number;
  balanceReal: number;
  balancePending: number;
}

const isEffectivelyPaid = (t: { status: string; is_reconciled: boolean | null }) =>
  t.status === "paid" || t.is_reconciled === true;

const isEffectivelyPending = (t: { status: string; is_reconciled: boolean | null }) =>
  t.status !== "paid" && t.is_reconciled !== true;

const CHART_MODE_KEY = "finance:cashflow:chartMode";

export function FinanceCashFlowChart({ unitId, dateFrom, dateTo, bankAccountId, bankAccounts = [], isAllAccounts = true }: FinanceCashFlowChartProps) {
  const isMobile = useIsMobile();
  const [chartMode, setChartMode] = useState<"consolidated" | "by_bank">(() => {
    try { return (localStorage.getItem(CHART_MODE_KEY) as any) || "consolidated"; } catch { return "consolidated"; }
  });

  useEffect(() => {
    try { localStorage.setItem(CHART_MODE_KEY, chartMode); } catch {}
  }, [chartMode]);

  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ["finance-cash-flow-chart-analytical", unitId, dateFrom, dateTo, bankAccountId],
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

        if (unitId) query = query.eq("unit_id", unitId);
        if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);

        const { data: transactions } = await query;

        const incomeTransactions = transactions?.filter(t => t.type === "income") || [];
        const incomeTotal = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const incomeReceived = incomeTransactions.filter(isEffectivelyPaid).reduce((sum, t) => sum + Number(t.amount), 0);
        const incomePending = incomeTransactions.filter(isEffectivelyPending).reduce((sum, t) => sum + Number(t.amount), 0);

        const expenseTransactions = transactions?.filter(t => t.type === "expense") || [];
        const expenseTotal = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const expensePaid = expenseTransactions.filter(isEffectivelyPaid).reduce((sum, t) => sum + Number(t.amount), 0);
        const expensePending = expenseTransactions.filter(isEffectivelyPending).reduce((sum, t) => sum + Number(t.amount), 0);

        months.push({
          month: format(monthDate, "yyyy-MM"),
          monthLabel: format(monthDate, "MMM", { locale: ptBR }),
          incomeTotal, incomeReceived, incomePending,
          expenseTotal, expensePaid, expensePending,
          balanceTotal: incomeTotal - expenseTotal,
          balanceReal: incomeReceived - expensePaid,
          balancePending: incomePending - expensePending,
        });
      }
      return months;
    },
  });

  // Per-bank chart data (only when isAllAccounts and chartMode is by_bank)
  const { data: perBankData } = useQuery({
    queryKey: ["finance-cash-flow-per-bank", unitId, dateFrom, dateTo],
    queryFn: async () => {
      const currentDate = new Date();
      let startDate = dateFrom ? parseISO(dateFrom) : subMonths(currentDate, 5);
      const endDate = dateTo ? parseISO(dateTo) : currentDate;
      const monthCount = Math.min(differenceInMonths(endDate, startDate) + 1, 12);
      startDate = subMonths(endDate, monthCount - 1);

      const rangeStart = format(startOfMonth(startDate), "yyyy-MM-dd");
      const rangeEnd = format(endOfMonth(endDate), "yyyy-MM-dd");

      let query = supabase
        .from("financial_transactions")
        .select("amount, type, status, is_reconciled, due_date, bank_account_id")
        .gte("due_date", rangeStart)
        .lte("due_date", rangeEnd);

      if (unitId) query = query.eq("unit_id", unitId);

      const { data: transactions } = await query;
      if (!transactions) return [];

      // Build monthly balance per bank
      const months: Record<string, Record<string, number>> = {};
      for (let i = 0; i < monthCount; i++) {
        const monthDate = addMonths(startDate, i);
        const monthKey = format(monthDate, "yyyy-MM");
        months[monthKey] = {};
      }

      transactions.filter(isEffectivelyPaid).forEach(t => {
        if (!t.bank_account_id || !t.due_date) return;
        const monthKey = t.due_date.substring(0, 7);
        if (!months[monthKey]) return;
        const val = t.type === "income" ? Number(t.amount) : -Number(t.amount);
        months[monthKey][t.bank_account_id] = (months[monthKey][t.bank_account_id] || 0) + val;
      });

      return Object.entries(months).map(([month, bankData]) => ({
        month,
        monthLabel: format(parseISO(month + "-01"), "MMM", { locale: ptBR }),
        ...bankData,
      }));
    },
    enabled: isAllAccounts && chartMode === "by_bank" && bankAccounts.length > 1,
  });

  const { data: movementData, isLoading: isLoadingMovement } = useQuery({
    queryKey: ["finance-cash-flow-movement", unitId, dateFrom, dateTo, bankAccountId],
    queryFn: async () => {
      const currentDate = new Date();
      let startDate = dateFrom ? parseISO(dateFrom) : subMonths(currentDate, 5);
      const endDate = dateTo ? parseISO(dateTo) : currentDate;
      const monthCount = Math.min(differenceInMonths(endDate, startDate) + 1, 12);
      startDate = subMonths(endDate, monthCount - 1);

      const rangeStart = format(startOfMonth(startDate), "yyyy-MM-dd");

      let openingQuery = supabase
        .from("financial_transactions")
        .select("amount, type, status, is_reconciled")
        .lt("due_date", rangeStart);

      if (unitId) openingQuery = openingQuery.eq("unit_id", unitId);
      if (bankAccountId) openingQuery = openingQuery.eq("bank_account_id", bankAccountId);

      const { data: historicalTransactions } = await openingQuery;

      let cumulativeBalance = 0;
      if (historicalTransactions) {
        const paidHistorical = historicalTransactions.filter(isEffectivelyPaid);
        const historicalIncome = paidHistorical.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
        const historicalExpenses = paidHistorical.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
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

        if (unitId) query = query.eq("unit_id", unitId);
        if (bankAccountId) query = query.eq("bank_account_id", bankAccountId);

        const { data: transactions } = await query;

        const paidTransactions = transactions?.filter(isEffectivelyPaid) || [];
        const incomeReceived = paidTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
        const expensesPaid = paidTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);

        const openingBalance = cumulativeBalance;
        const closingBalance = openingBalance + incomeReceived - expensesPaid;

        months.push({
          month: format(monthDate, "yyyy-MM"),
          monthLabel: format(monthDate, "MMM", { locale: ptBR }),
          openingBalance, incomeReceived, expensesPaid, closingBalance,
        });

        cumulativeBalance = closingBalance;
      }
      return months;
    },
  });

  const formatCurrency = (value: number) => formatCurrencyCompact(value);

  const isLoading = isLoadingChart || isLoadingMovement;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /></CardHeader>
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
      <text x={x + width / 2} y={y - 8} fill="hsl(var(--muted-foreground))" textAnchor="middle" fontSize={10} fontWeight={500}>
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

  const showBankToggle = isAllAccounts && bankAccounts.length > 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-3 lg:px-6 pt-3 lg:pt-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm lg:text-base flex items-center gap-1.5">Fluxo de Caixa Analítico <HelpTooltip featureKey="finance.cash_flow" /></CardTitle>
            <CardDescription className="text-[10px] lg:text-xs">
              Baseado em Data de Vencimento • Análise Operacional e Movimentação Real
            </CardDescription>
          </div>
          {showBankToggle && (
            <ToggleGroup
              type="single"
              value={chartMode}
              onValueChange={(v) => v && setChartMode(v as any)}
              size="sm"
              className="border rounded-md"
            >
              <ToggleGroupItem value="consolidated" className="text-[10px] h-7 px-2">Consolidado</ToggleGroupItem>
              <ToggleGroupItem value="by_bank" className="text-[10px] h-7 px-2">Por banco</ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6 space-y-6">
        {/* Chart */}
        <div className="h-[280px] lg:h-[300px] overflow-x-auto">
          <div className="min-w-[300px] h-full">
            {chartMode === "by_bank" && isAllAccounts && perBankData && perBankData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perBankData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={formatCurrency} width={60} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const account = bankAccounts.find(a => a.id === name);
                      const label = account ? (account.bank_name ? `${account.bank_name} · ${account.name}` : account.name) : name;
                      return [formatCurrencyFull(value), label];
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend formatter={(value) => {
                    const account = bankAccounts.find(a => a.id === value);
                    return <span className="text-xs">{account?.name || value}</span>;
                  }} />
                  {bankAccounts.map((account) => (
                    <Line
                      key={account.id}
                      type="monotone"
                      dataKey={account.id}
                      stroke={account.color || "#10b981"}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name={account.id}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={formatCurrency} className="text-muted-foreground" width={60} />
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
                  <Bar dataKey="receitas" name="receitas" fill="#22c55e" radius={[4, 4, 0, 0]}>
                    <LabelList content={renderLabel} />
                  </Bar>
                  <Bar dataKey="despesas" name="despesas" fill="#ef4444" radius={[4, 4, 0, 0]}>
                    <LabelList content={renderLabel} />
                  </Bar>
                  <Bar dataKey="pendReceitas" name="pendReceitas" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Bar dataKey="pendDespesas" name="pendDespesas" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
