import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TransactionCompositionSheetProps {
  bankAccountId: string;
  dateFrom: string;
  dateTo: string;
  initialBalance: number;
  systemBalance: number;
}

export function TransactionCompositionSheet({
  bankAccountId,
  dateFrom,
  dateTo,
  initialBalance,
  systemBalance,
}: TransactionCompositionSheetProps) {
  // Fetch transactions within the date range using due_date (cash basis)
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["reconciled-transactions-composition", bankAccountId, dateFrom, dateTo],
    queryFn: async () => {
      if (!dateFrom || !dateTo) return [];

      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, description, amount, type, due_date, category:financial_categories(name)")
        .eq("bank_account_id", bankAccountId)
        .eq("is_reconciled", true)
        .gte("due_date", dateFrom)
        .lte("due_date", dateTo)
        .order("due_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!bankAccountId && !!dateFrom && !!dateTo,
  });

  // Fetch accumulated balance before the dateFrom (opening balance for the period)
  const { data: priorBalance, isLoading: isLoadingPrior } = useQuery({
    queryKey: ["prior-reconciled-balance", bankAccountId, dateFrom],
    queryFn: async () => {
      if (!dateFrom) return 0;

      // Get all reconciled transactions BEFORE the start date
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("amount, type")
        .eq("bank_account_id", bankAccountId)
        .eq("is_reconciled", true)
        .lt("due_date", dateFrom);

      if (error) throw error;
      
      // Calculate net flow from prior transactions
      let netFlow = 0;
      (data || []).forEach(tx => {
        const amount = Math.abs(Number(tx.amount));
        if (tx.type === "income") {
          netFlow += amount;
        } else {
          netFlow -= amount;
        }
      });

      // Opening balance = Initial balance + prior net flow
      return initialBalance + netFlow;
    },
    enabled: !!bankAccountId && !!dateFrom,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalIncome = transactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;
  const totalExpense = transactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;
  
  // Calculate balance from prior balance + period transactions
  const openingBalance = priorBalance ?? initialBalance;
  const calculatedBalance = openingBalance + totalIncome - totalExpense;

  const isLoadingAll = isLoading || isLoadingPrior;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary gap-1">
          <FileText className="h-3 w-3" />
          Ver composição
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Composição do Saldo
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase">Saldo Anterior</p>
              <p className="text-sm font-semibold">
                {isLoadingPrior ? "..." : formatCurrency(openingBalance)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Receitas
              </p>
              <p className="text-sm font-semibold text-emerald-600">+{formatCurrency(totalIncome)}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                Despesas
              </p>
              <p className="text-sm font-semibold text-red-600">-{formatCurrency(totalExpense)}</p>
            </div>
          </div>

          {/* Result */}
          <div className="p-4 rounded-lg border bg-primary/5 border-primary/20 text-center">
            <p className="text-xs text-muted-foreground">Saldo Final</p>
            <p className="text-xl font-bold text-primary">
              {isLoadingAll ? "..." : formatCurrency(calculatedBalance)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              = Saldo Anterior + Receitas − Despesas
            </p>
          </div>

          {/* Period info */}
          <div className="text-center text-xs text-muted-foreground">
            Período: {format(new Date(dateFrom + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })} até {format(new Date(dateTo + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
          </div>

          {/* Transaction List */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Transações Conciliadas ({transactions?.length || 0})
            </p>
            <ScrollArea className="h-[300px] pr-4">
              {isLoadingAll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {tx.due_date ? format(new Date(tx.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          </span>
                          {tx.category?.name && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tx.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ml-3 ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma transação conciliada neste período.
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
