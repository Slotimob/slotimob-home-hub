import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Home, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays, isBefore, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateOnly } from "@/lib/date-only";

interface FinanceUpcomingPaymentsProps {
  unitId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function FinanceUpcomingPayments({ unitId, dateFrom, dateTo }: FinanceUpcomingPaymentsProps) {
  const today = new Date();
  // Fallback to a 7-day window when the page has no active date filter
  const rangeStart = dateFrom || format(today, "yyyy-MM-dd");
  const rangeEnd = dateTo || format(addDays(today, 7), "yyyy-MM-dd");

  const periodLabel = dateFrom && dateTo
    ? `de ${format(new Date(`${dateFrom}T00:00:00`), "dd/MM", { locale: ptBR })} a ${format(new Date(`${dateTo}T00:00:00`), "dd/MM", { locale: ptBR })}`
    : "nos próximos 7 dias";

  const { data: payments, isLoading } = useQuery({
    queryKey: ["finance-upcoming-payments", unitId, rangeStart, rangeEnd],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          unit:units(id, unit_number, is_standalone)
        `)
        .eq("status", "pending")
        .eq("type", "expense")
        .gte("due_date", rangeStart)
        .lte("due_date", rangeEnd)
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
    const dueDate = parseDateOnly(dueDateStr) ?? new Date(dueDateStr);
    if (isBefore(dueDate, today) && !isToday(dueDate)) {
      return { label: "Vencido", variant: "destructive" as const, icon: AlertTriangle };
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
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Próximos Vencimentos
        </CardTitle>
        <CardDescription className="text-xs">Despesas a pagar {periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {payments && payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => {
              const status = getDueDateStatus(payment.due_date!);
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{payment.description}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <status.icon className="h-3 w-3 text-muted-foreground" />
                      <Badge variant={status.variant} className="text-[10px] px-1 py-0">
                        {status.label}
                      </Badge>
                      {payment.unit && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 ml-1">
                          {payment.unit.is_standalone ? (
                            <Home className="h-3 w-3" />
                          ) : (
                            <Building2 className="h-3 w-3" />
                          )}
                          {payment.unit.unit_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-semibold text-xs text-red-500 ml-2">
                    {formatCurrency(Number(payment.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <Clock className="h-7 w-7 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">
              Nenhum vencimento próximo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
