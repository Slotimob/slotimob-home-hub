import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Unlink, Loader2, Search, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReconciledEntry {
  id: string;
  entry_date: string;
  description: string;
  amount: number;
  is_credit: boolean;
  transaction_id: string;
  transaction?: {
    id: string;
    description: string;
    amount: number;
    type: string;
  };
}

interface ReconciliationHistoryTableProps {
  entries: ReconciledEntry[];
  isLoading: boolean;
  bankAccountId: string;
}

export function ReconciliationHistoryTable({
  entries,
  isLoading,
  bankAccountId,
}: ReconciliationHistoryTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [unreconciling, setUnreconciling] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    entryId: string;
    transactionId: string;
  }>({ open: false, entryId: "", transactionId: "" });

  // Fetch audited dates for this account
  const { data: auditedDates = [] } = useQuery({
    queryKey: ["audited-dates", bankAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("balance_audits")
        .select("audit_date")
        .eq("bank_account_id", bankAccountId)
        .eq("is_matched", true);

      if (error) throw error;
      return data?.map((a) => a.audit_date) || [];
    },
  });

  const isDateAudited = (date: string) => auditedDates.includes(date);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleUnreconcile = async () => {
    const { entryId, transactionId } = confirmDialog;
    setUnreconciling(entryId);
    setConfirmDialog({ open: false, entryId: "", transactionId: "" });

    try {
      const { error: entryError } = await supabase
        .from("bank_statement_entries")
        .update({
          is_reconciled: false,
          transaction_id: null,
        })
        .eq("id", entryId);

      if (entryError) throw entryError;

      const { error: transactionError } = await supabase
        .from("financial_transactions")
        .update({
          is_reconciled: false,
          reconciled_at: null,
        })
        .eq("id", transactionId);

      if (transactionError) throw transactionError;

      toast({ title: "Desconciliação realizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["reconciled-entries", bankAccountId] });
      queryClient.invalidateQueries({ queryKey: ["bank-statement-entries", bankAccountId] });
      queryClient.invalidateQueries({ queryKey: ["unreconciled-transactions", bankAccountId] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-totals", bankAccountId] });
    } catch (error: any) {
      toast({
        title: "Erro ao desconciliar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUnreconciling(null);
    }
  };

  // Filter entries based on search term
  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entry.description.toLowerCase().includes(term) ||
      entry.transaction?.description.toLowerCase().includes(term) ||
      formatCurrency(entry.amount).toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredEntries.length === 0 && !searchTerm) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum lançamento conciliado ainda.</p>
      </div>
    );
  }

  // Mobile compact card view
  if (isMobile) {
    return (
      <div className="w-full max-w-full overflow-hidden">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>Nenhum resultado encontrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]" type="always">
            <div className="space-y-2 pr-2">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-2.5 space-y-1.5 w-full max-w-full overflow-hidden">
                  {/* Statement info */}
                  <div className="flex items-start justify-between gap-2 w-full min-w-0">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-[10px] text-muted-foreground uppercase">Extrato</p>
                      <p className="text-xs font-medium truncate" title={entry.description}>
                        {entry.description}
                      </p>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold whitespace-nowrap flex-shrink-0",
                      entry.is_credit ? "text-emerald-600" : "text-red-600"
                    )}>
                      {entry.is_credit ? "+" : "-"}{formatCurrency(Math.abs(entry.amount))}
                    </span>
                  </div>

                  {/* Date & Audited */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    {isDateAudited(entry.entry_date) && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 bg-primary/10 text-primary border-primary/30 gap-0.5">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Auditado
                      </Badge>
                    )}
                  </div>

                  {/* Transaction info */}
                  {entry.transaction && (
                    <div className="border-t pt-1.5 w-full min-w-0 overflow-hidden">
                      <p className="text-[10px] text-muted-foreground uppercase">Lançamento</p>
                      <p className="text-xs truncate" title={entry.transaction.description}>
                        {entry.transaction.description}
                      </p>
                      <Badge variant="outline" className="mt-1 text-[9px] h-4 px-1">
                        {entry.transaction.type === "income" ? "Receita" : "Despesa"}
                      </Badge>
                    </div>
                  )}

                  {/* Action */}
                  <div className="flex justify-end pt-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfirmDialog({
                          open: true,
                          entryId: entry.id,
                          transactionId: entry.transaction_id,
                        })
                      }
                      disabled={unreconciling === entry.id}
                      className="text-destructive hover:text-destructive h-7 text-xs px-2"
                    >
                      {unreconciling === entry.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Unlink className="h-3 w-3 mr-1" />
                          Desconciliar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) =>
            setConfirmDialog((prev) => ({ ...prev, open }))
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Desconciliação</AlertDialogTitle>
              <AlertDialogDescription>
                Ao desconciliar, o lançamento voltará para a lista de pendentes. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnreconcile}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Desktop table view - with table-fixed and proper containment
  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição ou valor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>Nenhum resultado encontrado</p>
        </div>
      ) : (
        <ScrollArea className="w-full" type="always">
          <div className="min-w-0">
            <Table className="table-fixed w-full text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Data</TableHead>
                  <TableHead className="w-[35%]">Descrição Extrato</TableHead>
                  <TableHead className="w-24 text-right">Valor</TableHead>
                  <TableHead className="hidden md:table-cell w-[25%]">Lançamento</TableHead>
                  <TableHead className="w-20 text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span>{format(new Date(entry.entry_date), "dd/MM/yy", { locale: ptBR })}</span>
                        {isDateAudited(entry.entry_date) && (
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1 w-fit bg-primary/10 text-primary border-primary/30 gap-0.5">
                            <ShieldCheck className="h-2 w-2" />
                            ✓
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-0">
                      <span 
                        className="block truncate text-xs" 
                        title={entry.description}
                      >
                        {entry.description}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs">
                      <span className={entry.is_credit ? "text-emerald-600" : "text-red-600"}>
                        {entry.is_credit ? "+" : "-"}
                        {formatCurrency(Math.abs(entry.amount))}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell min-w-0">
                      {entry.transaction ? (
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span 
                            className="truncate text-xs" 
                            title={entry.transaction.description}
                          >
                            {entry.transaction.description}
                          </span>
                          <Badge variant="outline" className="w-fit text-[9px] h-4 px-1">
                            {entry.transaction.type === "income" ? "Receita" : "Despesa"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            entryId: entry.id,
                            transactionId: entry.transaction_id,
                          })
                        }
                        disabled={unreconciling === entry.id}
                        className="text-destructive hover:text-destructive h-7 px-2"
                      >
                        {unreconciling === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Unlink className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      )}

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Desconciliação</AlertDialogTitle>
            <AlertDialogDescription>
              Ao desconciliar, o lançamento voltará para a lista de pendentes. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnreconcile}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
