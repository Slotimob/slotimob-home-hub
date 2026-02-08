import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Clock, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { SmartCurrency, formatCurrencyFull } from "@/hooks/useSmartCurrency";

interface FinanceOverviewCardsProps {
  unitId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function FinanceOverviewCards({ unitId, dateFrom, dateTo }: FinanceOverviewCardsProps) {
  const currentDate = new Date();
  const monthStart = dateFrom || format(startOfMonth(currentDate), "yyyy-MM-dd");
  const monthEnd = dateTo || format(endOfMonth(currentDate), "yyyy-MM-dd");

  const { data: overview, isLoading } = useQuery({
    queryKey: ["finance-overview", monthStart, monthEnd, unitId],
    queryFn: async () => {
      // Fetch all transactions for the period with status and reconciliation info
      // Using due_date for Cash Flow perspective (Fluxo de Caixa)
      let allTransactionsQuery = supabase
        .from("financial_transactions")
        .select("amount, type, status, is_reconciled")
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);

      if (unitId) {
        allTransactionsQuery = allTransactionsQuery.eq("unit_id", unitId);
      }

      const { data: allTransactions } = await allTransactionsQuery;

      // Master rule: if is_reconciled is true, treat as "paid" regardless of original status
      const isEffectivelyPaid = (t: { status: string; is_reconciled: boolean | null }) => 
        t.status === "paid" || t.is_reconciled === true;
      
      const isEffectivelyPending = (t: { status: string; is_reconciled: boolean | null }) => 
        t.status !== "paid" && t.is_reconciled !== true;

      // Calculate incomes (paid or reconciled)
      const incomes = allTransactions?.filter(t => t.type === "income" && isEffectivelyPaid(t)) || [];
      
      // Calculate expenses (paid or reconciled)
      const expenses = allTransactions?.filter(t => t.type === "expense" && isEffectivelyPaid(t)) || [];

      // Pending transactions (not paid AND not reconciled)
      const pendingIncomes = allTransactions?.filter(t => t.type === "income" && isEffectivelyPending(t)) || [];
      const pendingExpenses = allTransactions?.filter(t => t.type === "expense" && isEffectivelyPending(t)) || [];

      // Query for pending "Repasse a Proprietário" transactions
      let repasseQuery = supabase
        .from("financial_transactions")
        .select(`
          amount,
          financial_categories!inner(name)
        `)
        .eq("type", "expense")
        .eq("status", "pending")
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);

      if (unitId) {
        repasseQuery = repasseQuery.eq("unit_id", unitId);
      }

      const { data: repasseData } = await repasseQuery;
      
      // Filter for repasse categories
      const pendingRepasses = repasseData?.filter((t: any) => 
        t.financial_categories?.name?.toLowerCase().includes("repasse")
      ) || [];
      const totalPendingRepasse = pendingRepasses.reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      const pendingIncome = pendingIncomes.reduce((sum, t) => sum + Number(t.amount), 0);
      const pendingExpense = pendingExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
        pendingIncome,
        pendingExpense,
        pendingRepasse: totalPendingRepasse,
        repasseCount: pendingRepasses.length,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="min-w-0">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
              </div>
              <Skeleton className="h-6 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Receitas",
      value: overview?.income || 0,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      pending: overview?.pendingIncome || 0,
      pendingLabel: "a receber",
    },
    {
      title: "Despesas",
      value: overview?.expense || 0,
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      pending: overview?.pendingExpense || 0,
      pendingLabel: "a pagar",
    },
    {
      title: "Saldo",
      value: overview?.balance || 0,
      icon: Wallet,
      color: (overview?.balance || 0) >= 0 ? "text-green-500" : "text-red-500",
      bgColor: (overview?.balance || 0) >= 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
    {
      title: "Pendentes",
      value: (overview?.pendingIncome || 0) - (overview?.pendingExpense || 0),
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      pendingIncome: overview?.pendingIncome || 0,
    },
  ];

  const showRepasseWarning = (overview?.pendingRepasse || 0) > 0 && (overview?.repasseCount || 0) >= 2;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title} className="transition-shadow hover:shadow-md min-w-0">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {card.title}
                  </span>
                  <div className={`p-1.5 rounded-full ${card.bgColor} flex-shrink-0`}>
                    <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`text-lg md:text-xl font-bold ${card.color} cursor-help leading-tight`}
                    >
                      <SmartCurrency value={card.value} showTooltip={false} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-mono">{formatCurrencyFull(card.value)}</p>
                  </TooltipContent>
                </Tooltip>
                {card.pending !== undefined && card.pending > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-[10px] text-muted-foreground mt-0.5 cursor-help">
                        + <SmartCurrency value={card.pending} forceCompact showTooltip={false} /> {card.pendingLabel}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{formatCurrencyFull(card.pending)} {card.pendingLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {card.pendingIncome !== undefined && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-[10px] text-muted-foreground mt-0.5 cursor-help">
                        <SmartCurrency value={card.pendingIncome} forceCompact showTooltip={false} /> a receber
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{formatCurrencyFull(card.pendingIncome)} a receber</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Warning for pending repasses */}
        {showRepasseWarning && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <strong>Atenção:</strong> Você tem {overview?.repasseCount} repasses a proprietários pendentes totalizando{" "}
              <span className="font-semibold">{formatCurrencyFull(overview?.pendingRepasse || 0)}</span>. 
              Estes valores afetam seu caixa real disponível.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TooltipProvider>
  );
}
