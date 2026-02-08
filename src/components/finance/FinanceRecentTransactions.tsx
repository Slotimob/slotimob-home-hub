import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown, Home, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface FinanceRecentTransactionsProps {
  unitId?: string;
}

export function FinanceRecentTransactions({ unitId }: FinanceRecentTransactionsProps) {
  const navigate = useNavigate();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["finance-recent-transactions", unitId],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          category:financial_categories(id, name, color),
          unit:units(id, unit_number, is_standalone, property:properties(name))
        `)
        .order("transaction_date", { ascending: false })
        .limit(5);

      if (unitId) {
        query = query.eq("unit_id", unitId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { label: "Pago", variant: "default" },
      pending: { label: "Pendente", variant: "secondary" },
      overdue: { label: "Vencido", variant: "destructive" },
      cancelled: { label: "Cancelado", variant: "outline" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const navigateToTransactions = () => {
    const url = unitId ? `/finance/transactions?unitId=${unitId}` : "/finance/transactions";
    navigate(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-6 pt-3 sm:pt-6 pb-2">
        <div>
          <CardTitle className="text-sm sm:text-base">Transações Recentes</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">Últimas movimentações financeiras</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={navigateToTransactions} className="text-xs">
          <span className="hidden sm:inline">Ver todas</span>
          <ArrowRight className="h-4 w-4 sm:ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {transactions && transactions.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors gap-2"
              >
                {/* Top row: Icon + Description */}
                <div className="flex items-start gap-2">
                  <div
                    className={`p-1.5 rounded-full flex-shrink-0 ${
                      transaction.type === "income"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs sm:text-sm line-clamp-2">{transaction.description}</p>
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {format(new Date(transaction.transaction_date), "dd MMM", { locale: ptBR })}
                      </span>
                      {transaction.category && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-[10px] text-muted-foreground">
                            {transaction.category.name}
                          </span>
                        </>
                      )}
                      {transaction.unit && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            {transaction.unit.is_standalone ? (
                              <Home className="h-2.5 w-2.5" />
                            ) : (
                              <Building2 className="h-2.5 w-2.5" />
                            )}
                            {transaction.unit.unit_number}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {/* Bottom row: Value + Badge */}
                <div className="flex items-center justify-between pl-7">
                  <span
                    className={`font-semibold text-xs sm:text-sm ${
                      transaction.type === "income" ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(Number(transaction.amount))}
                  </span>
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <p className="text-xs sm:text-sm">Nenhuma transação registrada</p>
            <Button 
              variant="link" 
              className="mt-2 text-xs sm:text-sm"
              onClick={navigateToTransactions}
            >
              Criar primeiro lançamento
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
