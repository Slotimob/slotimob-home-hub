import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CurrencyInput } from "@/components/ui/currency-input";
import { 
  Calculator, 
  CalendarIcon, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  ShieldCheck,
  FileText,
  Keyboard
} from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";

interface BalanceCheckerWidgetProps {
  bankAccountId: string;
  bankAccountName?: string;
  initialBalance?: number;
}

export function BalanceCheckerWidget({ 
  bankAccountId, 
  bankAccountName,
  initialBalance = 0 
}: BalanceCheckerWidgetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const queryClient = useQueryClient();
  
  // Initialize with current month
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [manualBankBalance, setManualBankBalance] = useState<string>("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [useManualInput, setUseManualInput] = useState(false);

  // Fetch bank account data including OFX-extracted balance
  const { data: bankAccountData, isLoading: isLoadingAccount } = useQuery({
    queryKey: ["bank-account-balance", bankAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("last_reconciled_balance, last_reconciled_date, name, initial_balance")
        .eq("id", bankAccountId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bankAccountId,
  });

  // Fallback: Calculate balance from statement entries if no OFX metadata
  const { data: calculatedFromEntries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["calculated-statement-balance", bankAccountId],
    queryFn: async () => {
      // Get all entries for this account, ordered by date descending
      const { data: entries, error } = await supabase
        .from("bank_statement_entries")
        .select("amount, is_credit, entry_date")
        .eq("bank_account_id", bankAccountId)
        .order("entry_date", { ascending: false });

      if (error) throw error;
      if (!entries || entries.length === 0) return null;

      // Get the latest date from entries
      const latestDate = entries[0].entry_date;
      
      // Calculate net flow: sum of credits minus sum of debits
      let netFlow = 0;
      entries.forEach((entry) => {
        if (entry.is_credit) {
          netFlow += Number(entry.amount);
        } else {
          netFlow -= Number(entry.amount);
        }
      });

      // Get the earliest date to show period
      const earliestDate = entries[entries.length - 1].entry_date;

      return {
        netFlow,
        latestDate,
        earliestDate,
        entriesCount: entries.length,
      };
    },
    enabled: !!bankAccountId && (bankAccountData?.last_reconciled_balance === null || bankAccountData?.last_reconciled_balance === undefined),
  });

  // Reset manual input when bank account changes
  useEffect(() => {
    setManualBankBalance("");
    setUseManualInput(false);
  }, [bankAccountId]);

  // Check if we have OFX-extracted balance data
  const hasOFXBalance = bankAccountData?.last_reconciled_balance !== null && 
                        bankAccountData?.last_reconciled_balance !== undefined &&
                        bankAccountData?.last_reconciled_date !== null;
  
  // Check if we have calculated balance from entries (fallback)
  const hasCalculatedBalance = !hasOFXBalance && calculatedFromEntries !== null && calculatedFromEntries !== undefined;

  // Use OFX date as end date if available, otherwise use selected date
  const effectiveEndDate = hasOFXBalance && !useManualInput && bankAccountData?.last_reconciled_date 
    ? new Date(bankAccountData.last_reconciled_date + "T12:00:00")
    : (dateRange?.to || new Date());

  // Fetch reconciled transactions up to end date
  const { data: systemBalance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["system-balance", bankAccountId, effectiveEndDate?.toISOString()],
    queryFn: async () => {
      if (!effectiveEndDate || !bankAccountId) return null;

      const cutoffStr = format(effectiveEndDate, "yyyy-MM-dd");
      const effectiveInitialBalance = bankAccountData?.initial_balance ?? initialBalance;

      // Get all reconciled transactions up to this date
      const { data: transactions, error } = await supabase
        .from("financial_transactions")
        .select("amount, type")
        .eq("bank_account_id", bankAccountId)
        .eq("is_reconciled", true)
        .lte("transaction_date", cutoffStr);

      if (error) throw error;

      // Calculate balance: initial + income - expenses
      let balance = Number(effectiveInitialBalance) || 0;
      transactions?.forEach((tx) => {
        if (tx.type === "income") {
          balance += Number(tx.amount);
        } else if (tx.type === "expense") {
          balance -= Number(tx.amount);
        }
      });

      return balance;
    },
    enabled: !!bankAccountId && !!effectiveEndDate && !isLoadingAccount,
  });

  // Fetch existing audit for this date
  const { data: existingAudit } = useQuery({
    queryKey: ["balance-audit", bankAccountId, effectiveEndDate?.toISOString()],
    queryFn: async () => {
      if (!effectiveEndDate || !bankAccountId) return null;

      const cutoffStr = format(effectiveEndDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("balance_audits")
        .select("*")
        .eq("bank_account_id", bankAccountId)
        .eq("audit_date", cutoffStr)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bankAccountId && !!effectiveEndDate,
  });

  // Fetch all audited dates for this account
  const { data: auditedDates = [] } = useQuery({
    queryKey: ["audited-dates", bankAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("balance_audits")
        .select("audit_date, is_matched")
        .eq("bank_account_id", bankAccountId)
        .eq("is_matched", true);

      if (error) throw error;
      return data?.map((a) => a.audit_date) || [];
    },
    enabled: !!bankAccountId,
  });

  // Save audit mutation
  const saveAuditMutation = useMutation({
    mutationFn: async () => {
      if (!user || !bankAccountId || !effectiveEndDate || systemBalance === null) {
        throw new Error("Dados incompletos");
      }

      const bankBalanceNum = hasOFXBalance && !useManualInput 
        ? Number(bankAccountData?.last_reconciled_balance) 
        : (parseFloat(manualBankBalance) || 0);
      const difference = bankBalanceNum - systemBalance;
      const isMatched = Math.abs(difference) < 0.01;

      const auditData = {
        broker_id: effectiveBrokerId || user.id,
        bank_account_id: bankAccountId,
        audit_date: format(effectiveEndDate, "yyyy-MM-dd"),
        bank_balance: bankBalanceNum,
        system_balance: systemBalance,
        difference,
        is_matched: isMatched,
      };

      // Upsert to handle existing records
      const { error } = await supabase
        .from("balance_audits")
        .upsert(auditData, { onConflict: "bank_account_id,audit_date" });

      if (error) throw error;
      return { isMatched, difference };
    },
    onSuccess: ({ isMatched, difference }) => {
      toast({
        title: isMatched ? "✅ Saldo verificado!" : "⚠️ Diferença encontrada",
        description: isMatched 
          ? "O caixa deste período está batendo com o banco."
          : `Diferença de ${formatCurrency(Math.abs(difference))} detectada.`,
        variant: isMatched ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["balance-audit"] });
      queryClient.invalidateQueries({ queryKey: ["audited-dates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar auditoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Determine bank balance (OFX, calculated, or manual)
  // For calculated fallback, we compare net flow instead of absolute balance
  const effectiveBankBalance = (() => {
    if (useManualInput) return parseFloat(manualBankBalance) || 0;
    if (hasOFXBalance) return Number(bankAccountData?.last_reconciled_balance);
    if (hasCalculatedBalance) return calculatedFromEntries?.netFlow || 0;
    return parseFloat(manualBankBalance) || 0;
  })();

  // For calculated mode, we need to compare net flow vs net flow, not absolute balance
  // So we'll calculate the system's net flow for the same period
  const isCalculatedMode = hasCalculatedBalance && !useManualInput && !hasOFXBalance;

  // Calculate difference
  const difference = systemBalance !== null ? effectiveBankBalance - systemBalance : null;
  const isMatched = difference !== null && Math.abs(difference) < 0.01;
  const hasInput = hasOFXBalance || hasCalculatedBalance || manualBankBalance !== "";
  const canSave = hasInput && systemBalance !== null && !isCalculatedMode; // Can't save audit in calculated mode

  // Suggestion based on difference
  const getSuggestion = () => {
    if (difference === null || Math.abs(difference) < 0.01) return null;
    
    if (difference > 0) {
      return {
        icon: TrendingUp,
        message: `Verifique se esqueceu de lançar uma receita de ${formatCurrency(difference)}.`,
        color: "text-emerald-600",
      };
    } else {
      return {
        icon: TrendingDown,
        message: `Verifique se esqueceu de lançar uma despesa de ${formatCurrency(Math.abs(difference))}.`,
        color: "text-red-600",
      };
    }
  };

  const suggestion = getSuggestion();

  const formatDateRange = () => {
    if (!dateRange?.from) return "Selecione o período";
    if (!dateRange.to) return format(dateRange.from, "dd/MM/yyyy", { locale: ptBR });
    return `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  const isLoading = isLoadingAccount || isLoadingBalance || isLoadingEntries;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Conferência de Saldo</CardTitle>
            <p className="text-sm text-muted-foreground">
              {bankAccountName || "Compare o sistema com seu extrato bancário"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scenario A: OFX Balance Available (Happy Path) */}
        {hasOFXBalance && !useManualInput && (
          <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary">
                  Saldo detectado automaticamente do OFX
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data de referência: {bankAccountData?.last_reconciled_date && 
                    format(new Date(bankAccountData.last_reconciled_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-2xl font-bold text-primary mt-2">
                  {formatCurrency(Number(bankAccountData?.last_reconciled_balance))}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-3 text-xs gap-1.5"
              onClick={() => setUseManualInput(true)}
            >
              <Keyboard className="h-3.5 w-3.5" />
              Digitar manualmente
            </Button>
          </div>
        )}

        {/* Scenario B: Calculated from entries (Fallback) */}
        {hasCalculatedBalance && !useManualInput && (
          <div className="p-4 rounded-lg border bg-amber-500/10 border-amber-500/30">
            <div className="flex items-start gap-3">
              <Calculator className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Variação calculada do extrato importado
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Período: {calculatedFromEntries?.earliestDate && format(new Date(calculatedFromEntries.earliestDate + "T12:00:00"), "dd/MM", { locale: ptBR })} 
                  {" → "}
                  {calculatedFromEntries?.latestDate && format(new Date(calculatedFromEntries.latestDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  {" "}({calculatedFromEntries?.entriesCount} lançamentos)
                </p>
                <p className={cn(
                  "text-2xl font-bold mt-2",
                  calculatedFromEntries && calculatedFromEntries.netFlow >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {calculatedFromEntries && calculatedFromEntries.netFlow >= 0 ? "+" : ""}
                  {formatCurrency(calculatedFromEntries?.netFlow || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Este é o fluxo líquido do período (créditos − débitos)
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-3 text-xs gap-1.5"
              onClick={() => setUseManualInput(true)}
            >
              <Keyboard className="h-3.5 w-3.5" />
              Digitar saldo manualmente
            </Button>
          </div>
        )}

        {/* Scenario C: No data at all or manual mode */}
        {(!hasOFXBalance && !hasCalculatedBalance || useManualInput) && (
          <>
            {/* Info message for no data */}
            {!hasOFXBalance && !hasCalculatedBalance && !useManualInput && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p>Nenhum extrato importado para esta conta. Importe um arquivo OFX ou CSV, ou digite o saldo manualmente abaixo.</p>
              </div>
            )}

            {/* Period Selector */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Período de Conferência
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRange()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.to) {
                        setIsCalendarOpen(false);
                        setManualBankBalance("");
                      }
                    }}
                    locale={ptBR}
                    disabled={(date) => date > new Date()}
                    numberOfMonths={1}
                    modifiers={{
                      audited: auditedDates.map((d) => new Date(d + "T12:00:00")),
                    }}
                    modifiersStyles={{
                      audited: {
                        backgroundColor: "hsl(var(--primary) / 0.15)",
                        borderRadius: "50%",
                      },
                    }}
                    className="pointer-events-auto"
                  />
                  <div className="px-4 pb-3 text-xs text-muted-foreground flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
                    <span>Dias já auditados</span>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Manual Balance Input */}
            <div className="p-4 rounded-lg border bg-background text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Saldo Real do Banco</p>
              <CurrencyInput
                value={manualBankBalance}
                onChange={setManualBankBalance}
                placeholder="0,00"
                className="text-center text-lg font-bold h-10"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Saldo final do seu extrato bancário
              </p>
            </div>

            {/* Back to auto mode button */}
            {(hasOFXBalance || hasCalculatedBalance) && useManualInput && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs gap-1.5"
                onClick={() => {
                  setUseManualInput(false);
                  setManualBankBalance("");
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                {hasOFXBalance ? "Usar saldo do OFX" : "Usar variação calculada"}
              </Button>
            )}
          </>
        )}

        {/* 2-Column Comparison Grid - Only show when NOT in calculated mode */}
        {hasInput && !isCalculatedMode && (
          <div className="grid grid-cols-2 gap-3">
            {/* Column 1: System Balance */}
            <div className="p-4 rounded-lg border bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sistema</p>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <p className="text-lg font-bold">
                  {systemBalance !== null ? formatCurrency(systemBalance) : "—"}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Inicial + Conciliados
              </p>
            </div>

            {/* Column 2: Difference Status */}
            <div 
              className={cn(
                "p-4 rounded-lg border text-center transition-colors",
                !hasInput && "bg-muted/30",
                hasInput && isMatched && "bg-emerald-500/10 border-emerald-500/30",
                hasInput && !isMatched && difference !== null && "bg-red-500/10 border-red-500/30"
              )}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Diferença</p>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : isMatched ? (
                <div className="flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-lg font-bold text-emerald-600">R$ 0,00</span>
                </div>
              ) : difference !== null ? (
                <div className="flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(Math.abs(difference))}
                  </span>
                </div>
              ) : (
                <p className="text-lg font-bold text-muted-foreground">—</p>
              )}
              <p className={cn(
                "text-[10px] mt-1",
                hasInput && isMatched ? "text-emerald-600" : "text-muted-foreground"
              )}>
                {hasInput && isMatched ? "✓ Conferido" : "Banco − Sistema"}
              </p>
            </div>
          </div>
        )}

        {/* Info message for calculated mode */}
        {isCalculatedMode && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="text-amber-700 dark:text-amber-400">
              <p className="font-medium">Variação calculada das entradas</p>
              <p className="text-xs mt-1">
                Para comparar com o saldo real do banco, clique em "Digitar saldo manualmente" acima e informe o saldo final do seu extrato bancário.
              </p>
            </div>
          </div>
        )}

        {/* Suggestion when mismatch */}
        {suggestion && hasInput && !isLoading && !isCalculatedMode && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <suggestion.icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", suggestion.color)} />
            <span className={suggestion.color}>{suggestion.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        {canSave && !isLoading && (
          <Button
            className="w-full gap-2"
            onClick={() => saveAuditMutation.mutate()}
            disabled={saveAuditMutation.isPending}
            variant={isMatched ? "default" : "outline"}
          >
            {saveAuditMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                {isMatched ? "Marcar como Auditado" : "Registrar Verificação"}
              </>
            )}
          </Button>
        )}

        {/* Existing Audit Indicator */}
        {existingAudit && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>
              Verificado em {format(new Date(existingAudit.created_at), "dd/MM/yyyy")}
              {existingAudit.is_matched && " — ✔️ Conferido"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
