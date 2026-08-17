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
        <CardHeader className="p-3 pb-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-40" />
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          Próximos Recebimentos
        </CardTitle>
        <CardDescription className="text-xs">Receitas a receber em até 7 dias</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {receipts && receipts.length > 0 ? (
          <div className="space-y-2">
            {receipts.map((receipt) => {
              const status = getDueDateStatus(receipt.due_date!);
              return (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{receipt.description}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <status.icon className="h-3 w-3 text-muted-foreground" />
                      <Badge variant={status.variant} className="text-[10px] px-1 py-0">
                        {status.label}
                      </Badge>
                      {receipt.unit && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 ml-1">
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
                  <span className="font-semibold text-xs text-emerald-500 ml-2">
                    {formatCurrency(Number(receipt.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <TrendingUp className="h-7 w-7 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">
              Nenhum recebimento próximo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
