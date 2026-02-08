import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BankStatementCompositionSheetProps {
  bankAccountId: string;
  dateFrom: string;  // YYYY-MM-DD format
  dateTo: string;    // YYYY-MM-DD format
  calculatedBalance: number;
  initialBalance: number;
}

export function BankStatementCompositionSheet({
  bankAccountId,
  dateFrom,
  dateTo,
  calculatedBalance,
  initialBalance,
}: BankStatementCompositionSheetProps) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["bank-statement-entries-composition", bankAccountId, dateFrom, dateTo],
    queryFn: async () => {
      if (!dateFrom || !dateTo) return [];

      const { data, error } = await supabase
        .from("bank_statement_entries")
        .select("id, description, amount, is_credit, entry_date, is_reconciled")
        .eq("bank_account_id", bankAccountId)
        .gte("entry_date", dateFrom)
        .lte("entry_date", dateTo)
        .order("entry_date", { ascending: false });

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

  const totalCredits = entries?.filter(e => e.is_credit).reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const totalDebits = entries?.filter(e => !e.is_credit).reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const netFlow = totalCredits - totalDebits;

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
            Extrato Bancário Importado
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Period Info */}
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Período analisado</p>
            <p className="text-sm font-medium">
              {format(dateFrom, "dd/MM/yyyy", { locale: ptBR })} até {format(dateTo, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase">Saldo Inicial</p>
              <p className="text-sm font-semibold">{formatCurrency(initialBalance)}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Créditos
              </p>
              <p className="text-sm font-semibold text-emerald-600">+{formatCurrency(totalCredits)}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                Débitos
              </p>
              <p className="text-sm font-semibold text-red-600">-{formatCurrency(totalDebits)}</p>
            </div>
          </div>

          {/* Result */}
          <div className="p-4 rounded-lg border bg-primary/5 border-primary/20 text-center">
            <p className="text-xs text-muted-foreground">Saldo Final Calculado</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(calculatedBalance)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              = Saldo Inicial ({formatCurrency(initialBalance)}) + Variação ({netFlow >= 0 ? "+" : ""}{formatCurrency(netFlow)})
            </p>
          </div>

          {/* Entries List */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Lançamentos do Extrato ({entries?.length || 0})
            </p>
            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : entries && entries.length > 0 ? (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.entry_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          {entry.is_reconciled && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                              Conciliado
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ml-3 ${entry.is_credit ? "text-emerald-600" : "text-red-600"}`}>
                        {entry.is_credit ? "+" : "-"}{formatCurrency(Number(entry.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum lançamento encontrado neste período.
                  <br />
                  <span className="text-xs">Importe um arquivo OFX ou CSV para visualizar.</span>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
