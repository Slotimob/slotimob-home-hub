import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Search, Check, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settleRentPayment, invalidateRentSettlementQueries, type DifferenceKind } from "@/hooks/useRentSettlement";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useReconciliation } from "@/hooks/useReconciliation";
import { fetchSettlementGroup, settlementBreakdown, describeSettlement } from "@/lib/settlement-group";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ReconciliationMatcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    description: string;
    amount: number;
    type: string;
    transaction_date: string;
    due_date?: string | null;
    bank_account_id?: string | null;
    settlement_group_id?: string | null;
    obligation_type?: string | null;
    lease_id?: string | null;
    reference?: string | null;
  };
  onReconciled: () => void;
}

interface StatementEntry {
  id: string;
  description: string;
  amount: number;
  entry_date: string;
  is_credit: boolean;
  bank_account_id: string;
  bank_account?: { name: string; bank_name?: string } | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function EntryItem({
entry,
isSuggestion = false,
isSelected,
isReconciling,
onSelect,
}: {
entry: StatementEntry;
isSuggestion?: boolean;
isSelected: boolean;
isReconciling: boolean;
onSelect: (entry: StatementEntry) => void;
}) {
  
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
        isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
        !isSelected && "hover:bg-muted/50 hover:border-muted-foreground/20",
        isSuggestion && !isSelected && "border-emerald-200 bg-emerald-500/5"
      )}
      onClick={() => onSelect(entry)}
    >
      <div
        className={cn(
          "p-1.5 rounded-full flex-shrink-0",
          entry.is_credit ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        )}
      >
        {entry.is_credit ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{entry.description}</p>
          {isSuggestion && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-600 bg-emerald-50">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              Sugerido
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{format(parseISO(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}</span>
          {entry.bank_account && (
            <>
              <span>•</span>
              <span className="truncate">{entry.bank_account.name}</span>
            </>
          )}
        </div>
      </div>
      <span
        className={cn(
          "font-semibold text-sm whitespace-nowrap",
          entry.is_credit ? "text-emerald-500" : "text-red-500"
        )}
      >
        {entry.is_credit ? "+" : "-"}{formatCurrency(Math.abs(entry.amount))}
      </span>
      {isSelected && isReconciling && (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      )}
    </div>
  );
}

export function ReconciliationMatcherDialog({
  open,
  onOpenChange,
  transaction,
  onReconciled,
}: ReconciliationMatcherDialogProps) {
  const { reconcile } = useReconciliation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [adjustKind, setAdjustKind] = useState<DifferenceKind | "none" | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<StatementEntry | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [showMismatchDialog, setShowMismatchDialog] = useState(false);
  const [markAsPaid, setMarkAsPaid] = useState(true);
  const [showAllAccounts, setShowAllAccounts] = useState(false);

  // Reset selection and options when the dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedEntry(null);
      setMarkAsPaid(true);
      setShowMismatchDialog(false);
      setSearchTerm("");
      setShowAllAccounts(false);
      setAdjustKind("");
    }
  }, [open]);

  // Fetch unreconciled bank statement entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["unreconciled-statement-entries", transaction.bank_account_id],
    queryFn: async () => {
      let query = supabase
        .from("bank_statement_entries")
        .select(`
          id,
          description,
          amount,
          entry_date,
          is_credit,
          bank_account_id,
          bank_account:bank_accounts(name, bank_name)
        `)
        .is("transaction_id", null)
        .eq("is_reconciled", false)
        .order("entry_date", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as StatementEntry[];
    },
    enabled: open,
  });

  // Baixa conjunta: compara pelo LÍQUIDO do grupo
  const { data: settlementData } = useQuery({
    queryKey: ["settlement-groups", "for-tx", transaction.id],
    queryFn: async () => {
      let groupId = transaction.settlement_group_id ?? null;
      let meta = {
        type: transaction.type,
        obligation_type: transaction.obligation_type ?? null,
        lease_id: transaction.lease_id ?? null,
        reference: transaction.reference ?? null,
        due_date: transaction.due_date ?? null,
      };
      const needsMeta =
        groupId === null || groupId === undefined ||
        transaction.obligation_type === undefined || transaction.lease_id === undefined || transaction.reference === undefined;
      if (needsMeta) {
        const { data, error } = await supabase
          .from("financial_transactions")
          .select("settlement_group_id, type, obligation_type, lease_id, reference, due_date")
          .eq("id", transaction.id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          groupId = data.settlement_group_id ?? null;
          meta = {
            type: data.type,
            obligation_type: data.obligation_type ?? null,
            lease_id: data.lease_id ?? null,
            reference: data.reference ?? null,
            due_date: data.due_date ?? meta.due_date,
          };
        }
      }
      let breakdown = null as ReturnType<typeof settlementBreakdown> | null;
      if (groupId) {
        const lines = await fetchSettlementGroup(groupId);
        breakdown = lines.length > 1 ? settlementBreakdown(lines) : null;
      }
      return { breakdown, meta };
    },
    enabled: open,
  });
  const settlement = settlementData?.breakdown ?? null;
  const txMeta = settlementData?.meta;
  const isRentTx =
    !!settlement ||
    (!!txMeta &&
      txMeta.type === "income" &&
      (!txMeta.obligation_type || ["rent", "rent_balance"].includes(txMeta.obligation_type)) &&
      (!!txMeta.lease_id || String(txMeta.reference || "").startsWith("lease:")));
  const compareAmount = settlement ? Math.abs(settlement.net) : Math.abs(transaction.amount);
  const compareIsIncome = settlement ? settlement.net >= 0 : transaction.type === "income";

  // Smart suggestions: entries with matching value and close date (±3 days)
  const { suggestions, others } = useMemo(() => {
    const transactionDate = parseISO(transaction.due_date ?? transaction.transaction_date);
    const transactionAmount = compareAmount;
    const isIncome = compareIsIncome;

    const filtered = entries.filter((entry) => {
      if (
        transaction.bank_account_id &&
        !showAllAccounts &&
        entry.bank_account_id !== transaction.bank_account_id
      ) {
        return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        entry.description.toLowerCase().includes(term) ||
        formatCurrency(entry.amount).toLowerCase().includes(term)
      );
    });

    const suggestions: StatementEntry[] = [];
    const others: StatementEntry[] = [];

    filtered.forEach((entry) => {
      const entryDate = parseISO(entry.entry_date);
      const daysDiff = Math.abs(differenceInDays(entryDate, transactionDate));
      const amountMatch = Math.abs(entry.amount - transactionAmount) < 0.01;
      const typeMatch = entry.is_credit === isIncome;

      // Suggest if: same value, same type (income/credit), and within ±3 days
      if (amountMatch && typeMatch && daysDiff <= 3) {
        suggestions.push(entry);
      } else {
        others.push(entry);
      }
    });

    return { suggestions, others };
  }, [entries, transaction, searchTerm, showAllAccounts, compareAmount, compareIsIncome]);

  const handleSelectEntry = (entry: StatementEntry) => {
    setSelectedEntry(entry);
  };

  const handleConfirmReconcile = () => {
    if (!selectedEntry) return;

    // Check for value mismatch
    const transactionAmount = compareAmount;
    const entryAmount = Math.abs(selectedEntry.amount);

    if (Math.abs(transactionAmount - entryAmount) >= 0.01) {
      setShowMismatchDialog(true);
    } else {
      handleReconcile(selectedEntry);
    }
  };

  const rentDiff = selectedEntry ? Math.round((Math.abs(selectedEntry.amount) - compareAmount) * 100) / 100 : 0;
  const defaultAdjust: DifferenceKind | "none" =
    rentDiff > 0
      ? selectedEntry && txMeta?.due_date && selectedEntry.entry_date > txMeta.due_date ? "late_fee" : "other_addition"
      : "partial";
  const allowedAdjust: (DifferenceKind | "none")[] =
    rentDiff > 0 ? ["late_fee", "other_addition", "none"] : ["discount", "partial", "none"];
  const effectiveAdjust = adjustKind && allowedAdjust.includes(adjustKind) ? adjustKind : defaultAdjust;
  const adjustPreview = (() => {
    if (!selectedEntry) return "";
    const d = formatCurrency(Math.abs(rentDiff));
    const rec = formatCurrency(Math.abs(selectedEntry.amount));
    switch (effectiveAdjust) {
      case "late_fee": return `Lança multa/juros de ${d} e concilia ${rec}`;
      case "other_addition": return `Lança acréscimo de ${d} e concilia ${rec}`;
      case "discount": return `Lança desconto de ${d} e concilia ${rec}`;
      case "partial": return `Concilia ${rec} e deixa saldo de ${d} em aberto no mesmo mês`;
      default: return `Concilia ${rec} sem ajustar os lançamentos`;
    }
  })();

  const handleAdjustAndReconcile = async (entry: StatementEntry) => {
    if (effectiveAdjust === "none") return handleReconcile(entry);
    setIsReconciling(true);
    let res;
    try {
      res = await settleRentPayment({
        transactionId: transaction.id,
        paidDate: entry.entry_date,
        received: Math.abs(entry.amount),
        differenceKind: effectiveAdjust,
        bankAccountId: entry.bank_account_id,
      });
    } catch (e: any) {
      toast({ title: "Erro ao lançar o ajuste", description: e?.message, variant: "destructive" });
      setIsReconciling(false);
      return;
    }
    try {
      await reconcile.mutateAsync({
        entryId: entry.id,
        transactionId: res.anchor_id,
        markAsPaid: true,
        entryDate: entry.entry_date,
        bankAccountId: entry.bank_account_id,
      });
    } catch {
      invalidateRentSettlementQueries(queryClient);
      toast({
        title: "O ajuste foi lançado, mas a conciliação falhou. Tente conciliar de novo.",
        variant: "destructive",
      });
      setIsReconciling(false);
      return;
    }
    invalidateRentSettlementQueries(queryClient);
    const d = formatCurrency(Math.abs(Number(res?.difference ?? rentDiff)));
    const description =
      effectiveAdjust === "late_fee" ? `Multa de ${d} lançada`
      : effectiveAdjust === "other_addition" ? `Acréscimo de ${d} lançado`
      : effectiveAdjust === "discount" ? `Desconto de ${d} lançado`
      : `Saldo de ${d} ficou em aberto`;
    toast({ title: "Conciliado com ajuste", description });
    onReconciled();
    onOpenChange(false);
    setSelectedEntry(null);
    setShowMismatchDialog(false);
    setIsReconciling(false);
  };

  const handleReconcile = async (entry: StatementEntry) => {
    setIsReconciling(true);
    try {
      await reconcile.mutateAsync({
        entryId: entry.id,
        transactionId: transaction.id,
        markAsPaid,
        entryDate: entry.entry_date,
        bankAccountId: entry.bank_account_id,
      });
      onReconciled();
      onOpenChange(false);
      setSelectedEntry(null);
      setShowMismatchDialog(false);
      setMarkAsPaid(true);
    } catch {
      // toast de erro vem do hook; mantém a seleção para nova tentativa
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden"
          onInteractOutside={(e) => {
            if (showMismatchDialog || isReconciling) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (showMismatchDialog || isReconciling) e.preventDefault();
          }}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Conciliar Lançamento</DialogTitle>
            <DialogDescription>
              Selecione o item do extrato bancário correspondente a este lançamento
            </DialogDescription>
          </DialogHeader>

          {/* Transaction Info */}
          <div className="p-3 rounded-lg bg-muted/50 border flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-1">Lançamento a conciliar:</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "p-1.5 rounded-full",
                    transaction.type === "income" 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "bg-red-500/10 text-red-500"
                  )}
                >
                  {transaction.type === "income" ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(transaction.transaction_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "font-semibold",
                  transaction.type === "income" ? "text-emerald-500" : "text-red-500"
                )}
              >
                {transaction.type === "income" ? "+" : "-"}{formatCurrency(Math.abs(transaction.amount))}
              </span>
            </div>
            {settlement && (
              <div className="mt-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                <span className="font-medium">Baixa conjunta:</span> {describeSettlement(settlement)}
              </div>
            )}
          </div>

          {transaction.bank_account_id && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Switch
                id="show-all-accounts"
                checked={showAllAccounts}
                onCheckedChange={setShowAllAccounts}
              />
              <Label htmlFor="show-all-accounts" className="text-sm cursor-pointer">
                Mostrar todas as contas
              </Label>
            </div>
          )}

          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Entries List - with explicit max height for scrolling */}
          <ScrollArea className="flex-1 min-h-0 max-h-[50vh] -mx-6 px-6 pr-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum item do extrato disponível para conciliação.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Importe um extrato bancário primeiro.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-600">
                        Sugestões ({suggestions.length})
                      </p>
                    </div>
                    <div className="space-y-2">
                      {suggestions.map((entry) => (
                        <EntryItem key={entry.id} entry={entry} isSuggestion  isSelected={selectedEntry?.id === entry.id} isReconciling={isReconciling} onSelect={handleSelectEntry} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other entries */}
                {others.length > 0 && (
                  <div className="space-y-2">
                    {suggestions.length > 0 && (
                      <p className="text-sm font-medium text-muted-foreground">
                        Outros itens ({others.length})
                      </p>
                    )}
                    <div className="space-y-2">
                      {others.map((entry) => (
                        <EntryItem key={entry.id} entry={entry}  isSelected={selectedEntry?.id === entry.id} isReconciling={isReconciling} onSelect={handleSelectEntry} />
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.length === 0 && others.length === 0 && !searchTerm && (
                  <p className="text-center py-4 text-sm text-muted-foreground">
                    Nenhum item do extrato desta conta. Ative "Mostrar todas as contas" para ver as demais.
                  </p>
                )}

                {suggestions.length === 0 && others.length === 0 && searchTerm && (
                  <p className="text-center py-4 text-sm text-muted-foreground">
                    Nenhum resultado para "{searchTerm}"
                  </p>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer info */}
          <div className="space-y-3 pt-3 border-t flex-shrink-0">
            {selectedEntry && showMismatchDialog ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Valores diferentes</AlertTitle>
                <AlertDescription>
                  <div className="space-y-1 text-sm mt-1">
                    <p>{settlement ? "Líquido da baixa conjunta" : "Valor do lançamento"}: <span className="font-medium">{formatCurrency(compareAmount)}</span></p>
                    <p>Valor do extrato: <span className="font-medium">{formatCurrency(Math.abs(selectedEntry.amount))}</span></p>
                    <p>
                      Diferença:{" "}
                      <span className="font-medium">
                        {formatCurrency(Math.abs(Math.abs(selectedEntry.amount) - compareAmount))}
                      </span>
                    </p>
                  </div>
                  {isRentTx && (
                    <div className="mt-3 space-y-2 text-foreground">
                      <RadioGroup
                        value={effectiveAdjust}
                        onValueChange={(v) => setAdjustKind(v as DifferenceKind | "none")}
                        className="gap-2"
                      >
                        {(rentDiff > 0
                          ? [["late_fee", "Lançar multa/juros por atraso"], ["other_addition", "Lançar outro acréscimo"]]
                          : [["discount", "Lançar desconto concedido"], ["partial", "Pagamento parcial: o saldo fica em aberto"]]
                        ).concat([["none", "Só conciliar, sem ajustar"]]).map(([v, label]) => (
                          <div key={v} className="flex items-center gap-2">
                            <RadioGroupItem value={v} id={`adj-${v}`} />
                            <Label htmlFor={`adj-${v}`} className="font-normal text-sm">{label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <p className="text-xs text-muted-foreground">{adjustPreview}</p>
                    </div>
                  )}
                  <div className="flex flex-col-reverse sm:flex-row gap-2 mt-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowMismatchDialog(false)}
                      disabled={isReconciling}
                    >
                      Voltar
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={() =>
                        isRentTx && effectiveAdjust !== "none"
                          ? handleAdjustAndReconcile(selectedEntry)
                          : handleReconcile(selectedEntry)
                      }
                      disabled={isReconciling}
                    >
                      {isReconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {isRentTx && effectiveAdjust !== "none" ? "Ajustar e conciliar" : "Conciliar mesmo assim"}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : selectedEntry ? (
              <>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="mark-as-paid"
                    checked={markAsPaid}
                    onCheckedChange={(checked) => setMarkAsPaid(checked === true)}
                  />
                  <label htmlFor="mark-as-paid" className="text-sm leading-none cursor-pointer">
                    Marcar lançamento como pago em{" "}
                    <span className="font-medium">
                      {format(parseISO(selectedEntry.entry_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </label>
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>• Vincula este lançamento à entrada do extrato.</p>
                  {markAsPaid && (
                    <p>
                      • Marca como pago em{" "}
                      {format(parseISO(selectedEntry.entry_date), "dd/MM/yyyy", { locale: ptBR })}.
                    </p>
                  )}
                  {!transaction.bank_account_id && selectedEntry.bank_account && (
                    <p>• Vincula à conta bancária {selectedEntry.bank_account.name}.</p>
                  )}
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleConfirmReconcile}
                  disabled={isReconciling}
                >
                  {isReconciling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Confirmar conciliação
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Clique em um item do extrato para conciliar com o lançamento selecionado
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
