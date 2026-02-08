import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UnreconciledTransactionsSheetProps {
  bankAccountId: string;
  dateFrom: string;
  dateTo: string;
}

export function UnreconciledTransactionsSheet({
  bankAccountId,
  dateFrom,
  dateTo,
}: UnreconciledTransactionsSheetProps) {
  // Fetch unreconciled transactions within the date range
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["unreconciled-transactions", bankAccountId, dateFrom, dateTo],
    queryFn: async () => {
      if (!dateFrom || !dateTo) return [];

      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, description, amount, type, due_date, category:financial_categories(name)")
        .eq("bank_account_id", bankAccountId)
        .eq("is_reconciled", false)
        .gte("due_date", dateFrom)
        .lte("due_date", dateTo)
        .order("due_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!bankAccountId && !!dateFrom && !!dateTo,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalIncome = transactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;
  const totalExpense = transactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;
  const totalPending = totalIncome - totalExpense;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground gap-1 hover:text-primary">
          <Clock className="h-3 w-3" />
          Ver pendências
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lançamentos Pendentes de Conciliação
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 text-center">
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
            <div className="p-3 rounded-lg bg-amber-500/10">
              <p className="text-[10px] text-muted-foreground uppercase">Impacto</p>
              <p className={`text-sm font-semibold ${totalPending >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {totalPending >= 0 ? "+" : ""}{formatCurrency(totalPending)}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-center">
            <p className="text-xs text-muted-foreground">
              Estes lançamentos <strong>não estão refletidos</strong> no Saldo do Sistema.
              <br />
              Concilie-os para que a comparação seja precisa.
            </p>
          </div>

          {/* Period info */}
          <div className="text-center text-xs text-muted-foreground">
            Período: {format(new Date(dateFrom + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })} até {format(new Date(dateTo + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
          </div>

          {/* Transaction List */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Pendentes ({transactions?.length || 0})
            </p>
            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
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
                  Nenhum lançamento pendente neste período. 🎉
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
