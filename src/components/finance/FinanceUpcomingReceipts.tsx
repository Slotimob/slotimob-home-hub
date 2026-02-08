import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Home, Building2, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays, isBefore, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinanceUpcomingReceiptsProps {
  unitId?: string;
}

export function FinanceUpcomingReceipts({ unitId }: FinanceUpcomingReceiptsProps) {
  const today = new Date();
  const nextWeek = addDays(today, 7);

  const { data: receipts, isLoading } = useQuery({
    queryKey: ["finance-upcoming-receipts", unitId],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          unit:units(id, unit_number, is_standalone)
        `)
        .eq("status", "pending")
        .eq("type", "income")
        .lte("due_date", format(nextWeek, "yyyy-MM-dd"))
        .order("due_date", { ascending: true })
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

  const getDueDateStatus = (dueDateStr: string) => {
    const dueDate = new Date(dueDateStr);
    if (isBefore(dueDate, today) && !isToday(dueDate)) {
      return { label: "Atrasado", variant: "destructive" as const, icon: Calendar };
    }
    if (isToday(dueDate)) {
      return { label: "Hoje", variant: "default" as const, icon: Clock };
    }
    return { label: format(dueDate, "dd/MM", { locale: ptBR }), variant: "secondary" as const, icon: Clock };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          Próximos Recebimentos
        </CardTitle>
        <CardDescription>Receitas a receber em até 7 dias</CardDescription>
      </CardHeader>
      <CardContent>
        {receipts && receipts.length > 0 ? (
          <div className="space-y-3">
            {receipts.map((receipt) => {
              const status = getDueDateStatus(receipt.due_date!);
              return (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{receipt.description}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <status.icon className="h-3 w-3 text-muted-foreground" />
                      <Badge variant={status.variant} className="text-[10px] px-1 py-0">
                        {status.label}
                      </Badge>
                      {receipt.unit && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5 ml-1">
                          {receipt.unit.is_standalone ? (
                            <Home className="h-3 w-3" />
                          ) : (
                            <Building2 className="h-3 w-3" />
                          )}
                          {receipt.unit.unit_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-semibold text-sm text-emerald-500 ml-2">
                    {formatCurrency(Number(receipt.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum recebimento próximo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
