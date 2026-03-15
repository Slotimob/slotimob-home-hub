import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/AppLayout";
import { ReconciliationPanel } from "@/components/finance/ReconciliationPanel";
import { ReconciliationSummaryCards } from "@/components/finance/ReconciliationSummaryCards";
import { ImportStatementDialog } from "@/components/finance/ImportStatementDialog";
import { StatementImportHistoryDialog } from "@/components/finance/StatementImportHistoryDialog";
import { CreateBankAccountDialog } from "@/components/finance/CreateBankAccountDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Building2, History, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FinanceReconciliation = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["bank-statement-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["reconciliation-totals"] }),
      queryClient.invalidateQueries({ queryKey: ["reconciled-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["unreconciled-transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["statement-imports"] }),
      queryClient.invalidateQueries({ queryKey: ["audited-dates"] }),
    ]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Auto-select first account
  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedAccountId]);

  // Fetch reconciliation totals
  const { data: totals } = useQuery({
    queryKey: ["reconciliation-totals", selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return { totalImported: 0, totalReconciled: 0, totalPending: 0 };

      // Total imported (all entries)
      const { data: allEntries, error: allError } = await supabase
        .from("bank_statement_entries")
        .select("amount, is_credit")
        .eq("bank_account_id", selectedAccountId);

      if (allError) throw allError;

      const totalImported = allEntries?.reduce((sum, entry) => {
        return sum + Math.abs(Number(entry.amount));
      }, 0) || 0;

      // Total reconciled
      const { data: reconciledEntries, error: reconciledError } = await supabase
        .from("bank_statement_entries")
        .select("amount, is_credit")
        .eq("bank_account_id", selectedAccountId)
        .eq("is_reconciled", true);

      if (reconciledError) throw reconciledError;

      const totalReconciled = reconciledEntries?.reduce((sum, entry) => {
        return sum + Math.abs(Number(entry.amount));
      }, 0) || 0;

      // Total pending
      const { data: pendingEntries, error: pendingError } = await supabase
        .from("bank_statement_entries")
        .select("amount, is_credit")
        .eq("bank_account_id", selectedAccountId)
        .eq("is_reconciled", false);

      if (pendingError) throw pendingError;

      const totalPending = pendingEntries?.reduce((sum, entry) => {
        return sum + Math.abs(Number(entry.amount));
      }, 0) || 0;

      return { totalImported, totalReconciled, totalPending };
    },
    enabled: !!selectedAccountId,
  });

  const handleAccountCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    setIsCreateAccountOpen(false);
  };

  const handleStatementImported = () => {
    queryClient.invalidateQueries({ queryKey: ["bank-statement-entries"] });
    queryClient.invalidateQueries({ queryKey: ["reconciliation-totals"] });
    queryClient.invalidateQueries({ queryKey: ["statement-imports"] });
    setIsImportOpen(false);
  };

  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="space-y-4 p-2 sm:p-4 max-w-7xl mx-auto">
          {/* Compact Header */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">Conciliação Bancária</h1>
                <p className="text-xs text-muted-foreground">Vincule extratos aos lançamentos</p>
              </div>

              {/* Action Buttons - Compact */}
              <div className="flex gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsImportOpen(true)}
                  disabled={!selectedAccountId}
                  className="h-8 text-xs"
                >
                  <Upload className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsHistoryOpen(true)}
                  disabled={!selectedAccountId}
                  className="h-8 text-xs"
                >
                  <History className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Histórico</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsCreateAccountOpen(true)}
                  className="h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Nova Conta</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefreshAll}
                  disabled={isRefreshing}
                  className="h-8 text-xs"
                  title="Atualizar tudo"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                </Button>
              </div>
            </div>

            {/* Bank Account Selector - Inline */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {accountsLoading ? (
                <div className="h-8 w-48 animate-pulse bg-muted rounded-md" />
              ) : bankAccounts.length === 0 ? (
                <Button variant="outline" size="sm" onClick={() => setIsCreateAccountOpen(true)} className="h-8 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Cadastrar Conta
                </Button>
              ) : (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-full sm:w-[260px] h-8 text-sm">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: account.color || '#10b981' }} 
                          />
                          <span className="truncate">{account.name}</span>
                          {account.bank_name && (
                            <span className="text-muted-foreground text-xs">({account.bank_name})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Summary Cards - Compact */}
          {selectedAccountId && totals && (
            <ReconciliationSummaryCards
              totalImported={totals.totalImported}
              totalReconciled={totals.totalReconciled}
              totalPending={totals.totalPending}
            />
          )}

          {/* Reconciliation Panel */}
          {selectedAccountId && (
            <ReconciliationPanel 
              bankAccountId={selectedAccountId} 
              bankAccountName={selectedAccount?.name}
              initialBalance={Number(selectedAccount?.initial_balance) || 0}
            />
          )}

          {/* Empty State - Minimal */}
          {!selectedAccountId && bankAccounts.length > 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Selecione uma conta bancária</p>
            </div>
          )}

          {/* Dialogs */}
          <CreateBankAccountDialog
            open={isCreateAccountOpen}
            onOpenChange={setIsCreateAccountOpen}
            onSuccess={handleAccountCreated}
          />

          <ImportStatementDialog
            open={isImportOpen}
            onOpenChange={setIsImportOpen}
            bankAccountId={selectedAccountId}
            onSuccess={handleStatementImported}
          />

          {selectedAccountId && (
            <StatementImportHistoryDialog
              bankAccountId={selectedAccountId}
              open={isHistoryOpen}
              onOpenChange={setIsHistoryOpen}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default FinanceReconciliation;
