import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, CalendarDays } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { BalanceComparisonGrid } from "./BalanceComparisonGrid";

interface BalanceAuditPanelProps {
  bankAccountId: string;
  bankAccountName?: string;
  initialBalance?: number;
}

export function BalanceAuditPanel({
  bankAccountId,
  bankAccountName,
  initialBalance = 0,
}: BalanceAuditPanelProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Separate date states for better UX
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [manualBankBalance, setManualBankBalance] = useState<string>("");
  const [useManualInput, setUseManualInput] = useState(false);

  // Get the effective end date for calculations
  const referenceDate = dateTo ? new Date(dateTo + "T12:00:00") : new Date();

  // Fetch bank account data
  const { data: bankAccountData, isLoading: isLoadingAccount } = useQuery({
    queryKey: ["bank-account-audit", bankAccountId],
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

  const effectiveInitialBalance = bankAccountData?.initial_balance ?? initialBalance;

  // Check if we have OFX balance
  const hasOFXBalance = bankAccountData?.last_reconciled_balance !== null &&
    bankAccountData?.last_reconciled_balance !== undefined &&
    bankAccountData?.last_reconciled_date !== null;

  // Fallback: Calculate balance from statement entries if no OFX metadata
  const { data: calculatedFromEntries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["calculated-statement-balance-audit", bankAccountId, dateFrom, dateTo],
    queryFn: async () => {
      if (!dateFrom || !dateTo) return null;

      const startStr = dateFrom;
      const endStr = dateTo;

      // Get entries within the date range
      const { data: entries, error } = await supabase
        .from("bank_statement_entries")
        .select("amount, is_credit, entry_date")
        .eq("bank_account_id", bankAccountId)
        .gte("entry_date", startStr)
        .lte("entry_date", endStr)
        .order("entry_date", { ascending: true });

      if (error) throw error;
      if (!entries || entries.length === 0) return null;

      // Calculate net flow: sum of credits minus sum of debits
      let netFlow = 0;
      entries.forEach((entry) => {
        if (entry.is_credit) {
          netFlow += Number(entry.amount);
        } else {
          netFlow -= Number(entry.amount);
        }
      });

      // Get period info
      const earliestDate = entries[0].entry_date;
      const latestDate = entries[entries.length - 1].entry_date;

      return {
        netFlow,
        earliestDate,
        latestDate,
        entriesCount: entries.length,
      };
    },
    enabled: !!bankAccountId && !hasOFXBalance && !!dateFrom && !!dateTo,
  });

  // Calculate system balance for the date range using due_date (cash basis)
  // CRITICAL: Uses ONLY financial_transactions table, filtered by bank_account_id and is_reconciled
  const { data: systemBalance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["system-balance-audit", bankAccountId, dateFrom, dateTo, effectiveInitialBalance],
    queryFn: async () => {
      if (!bankAccountId || !dateFrom || !dateTo) return null;

      // Start with the bank account's initial balance
      let balance = Number(effectiveInitialBalance) || 0;

      // Fetch ALL reconciled transactions for THIS bank account up to the end date
      // This ensures we get the correct cumulative balance at the end of the period
      const { data: allTransactions, error } = await supabase
        .from("financial_transactions")
        .select("id, amount, type, due_date")
        .eq("bank_account_id", bankAccountId)
        .eq("is_reconciled", true)
        .lte("due_date", dateTo);

      if (error) {
        console.error("[BalanceAudit] Error fetching transactions:", error);
        throw error;
      }

      // Debug log to verify correct filtering
      console.log(`[BalanceAudit] Bank Account: ${bankAccountId}`);
      console.log(`[BalanceAudit] Date Range: ${dateFrom} to ${dateTo}`);
      console.log(`[BalanceAudit] Initial Balance: ${effectiveInitialBalance}`);
      console.log(`[BalanceAudit] Transactions found: ${allTransactions?.length || 0}`);

      // Process each transaction according to its type
      // Formula: Initial + Income - Expense
      // Note: Transfers are handled as income (destination) or expense (origin) 
      // based on how they're stored in the system
      allTransactions?.forEach((tx) => {
        const amount = Math.abs(Number(tx.amount));
        
        if (tx.type === "income") {
          balance += amount;
        } else if (tx.type === "expense") {
          balance -= amount;
        }
        // Note: If there are explicit transfer types, they should be handled here
        // Currently, transfers appear to be stored as income/expense pairs
      });

      console.log(`[BalanceAudit] Final System Balance: ${balance}`);

      return balance;
    },
    enabled: !!bankAccountId && !isLoadingAccount && !!dateFrom && !!dateTo,
  });

  // Fetch audited dates for calendar highlighting
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

  // Fetch existing audit for this date
  const { data: existingAudit } = useQuery({
    queryKey: ["balance-audit-existing", bankAccountId, referenceDate.toISOString()],
    queryFn: async () => {
      const cutoffStr = format(referenceDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("balance_audits")
        .select("*")
        .eq("bank_account_id", bankAccountId)
        .eq("audit_date", cutoffStr)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bankAccountId,
  });

  // Reset manual input when bank account changes
  useEffect(() => {
    setManualBankBalance("");
    setUseManualInput(false);
  }, [bankAccountId]);

  // Check if we have calculated balance from entries (fallback)
  const hasCalculatedBalance = !hasOFXBalance && calculatedFromEntries !== null && calculatedFromEntries !== undefined;

  // Calculate effective bank balance with priority: OFX > Calculated > Manual
  const effectiveBankBalance = (() => {
    if (useManualInput) return parseFloat(manualBankBalance) || 0;
    if (hasOFXBalance) return bankAccountData?.last_reconciled_balance || 0;
    if (hasCalculatedBalance) {
      // For calculated mode, use initial balance + net flow
      return (Number(effectiveInitialBalance) || 0) + (calculatedFromEntries?.netFlow || 0);
    }
    return parseFloat(manualBankBalance) || 0;
  })();

  const hasValidBankInput = useManualInput
    ? manualBankBalance !== ""
    : (hasOFXBalance || hasCalculatedBalance);

  const difference = hasValidBankInput && systemBalance !== null
    ? effectiveBankBalance - systemBalance
    : null;

  const isMatched = difference !== null && Math.abs(difference) < 0.01;
  const canSave = hasValidBankInput && systemBalance !== null;

  // Save audit mutation
  const saveAuditMutation = useMutation({
    mutationFn: async () => {
      if (!user || !bankAccountId || systemBalance === null) {
        throw new Error("Dados incompletos");
      }

      const bankBalanceNum = effectiveBankBalance;
      const diff = bankBalanceNum - systemBalance;
      const matched = Math.abs(diff) < 0.01;

      const auditData = {
        broker_id: user.id,
        bank_account_id: bankAccountId,
        audit_date: format(referenceDate, "yyyy-MM-dd"),
        bank_balance: bankBalanceNum,
        system_balance: systemBalance,
        difference: diff,
        is_matched: matched,
      };

      const { error } = await supabase
        .from("balance_audits")
        .upsert(auditData, { onConflict: "bank_account_id,audit_date" });

      if (error) throw error;
      return { isMatched: matched, difference: diff };
    },
    onSuccess: ({ isMatched: matched, difference: diff }) => {
      toast({
        title: matched ? "✅ Saldo verificado!" : "⚠️ Diferença registrada",
        description: matched
          ? "O caixa está batendo com o banco nesta data."
          : `Diferença de ${formatCurrency(Math.abs(diff))} registrada.`,
        variant: matched ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["balance-audit"] });
      queryClient.invalidateQueries({ queryKey: ["audited-dates"] });
      queryClient.invalidateQueries({ queryKey: ["balance-audit-existing"] });
    },
    onError: (error: Error) => {
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

  const isLoading = isLoadingAccount || isLoadingBalance || isLoadingEntries;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Painel de Auditoria</CardTitle>
              <p className="text-sm text-muted-foreground">
                {bankAccountName || "Compare o sistema com seu extrato bancário"}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Reference Date Range - Separate Inputs for better UX */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Período de Referência
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date From */}
            <div className="space-y-1.5">
              <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                Data Início
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setManualBankBalance("");
                }}
                max={dateTo || undefined}
                className="h-10"
              />
            </div>
            
            {/* Date To */}
            <div className="space-y-1.5">
              <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                Data Fim
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setManualBankBalance("");
                }}
                min={dateFrom || undefined}
                max={format(new Date(), "yyyy-MM-dd")}
                className="h-10"
              />
            </div>
          </div>
        </div>

        {/* 3-Column Comparison Grid */}
        <BalanceComparisonGrid
          hasOFXBalance={hasOFXBalance}
          ofxBalance={hasOFXBalance ? Number(bankAccountData?.last_reconciled_balance) : null}
          ofxDate={bankAccountData?.last_reconciled_date || null}
          hasCalculatedBalance={hasCalculatedBalance}
          calculatedBalance={hasCalculatedBalance ? (Number(effectiveInitialBalance) || 0) + (calculatedFromEntries?.netFlow || 0) : null}
          calculatedInfo={calculatedFromEntries}
          manualBankBalance={manualBankBalance}
          onManualBankBalanceChange={setManualBankBalance}
          useManualInput={useManualInput}
          onToggleManualInput={setUseManualInput}
          systemBalance={systemBalance ?? null}
          initialBalance={effectiveInitialBalance}
          bankAccountId={bankAccountId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          isLoading={isLoading}
        />

        {/* Save Audit Button */}
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
              Verificado em {format(new Date(existingAudit.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {existingAudit.is_matched && " — ✔️ Conferido"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
