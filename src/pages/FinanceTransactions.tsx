import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { TransactionsTableInfinite } from "@/components/finance/TransactionsTableInfinite";
import { TransactionsFiltersCompact } from "@/components/finance/TransactionsFiltersCompact";
import { CreateTransactionDialog } from "@/components/finance/CreateTransactionDialog";
import { ImportStatementDialog } from "@/components/finance/ImportStatementDialog";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/subscription/PermissionGate";
import { Plus, Upload, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useInfiniteTransactions, SortField, SortOrder, SortConfig } from "@/hooks/useInfiniteTransactions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

export interface TransactionFilters {
  type: string; // "all" | "income" | "expense" | "transfer"
  status: string;
  categoryId: string;
  issueDateFrom: string;
  issueDateTo: string;
  dueDateFrom: string;
  dueDateTo: string;
  search: string;
  unitId: string;
  bankAccountId: string;
  reconciled: string; // "all" | "reconciled" | "not_reconciled"
  hideTransfers: boolean;
}

const FinanceTransactions = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Get unitId from URL if present
  const urlUnitId = searchParams.get("unitId") || "";
  const urlAction = searchParams.get("action") || "";

  const [filters, setFilters] = useState<TransactionFilters>({
    type: "all",
    status: "all",
    categoryId: "all",
    issueDateFrom: "",
    issueDateTo: "",
    dueDateFrom: "",
    dueDateTo: "",
    search: "",
    unitId: urlUnitId,
    bankAccountId: "",
    reconciled: "all",
    hideTransfers: false,
  });

  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);

  // Update filters when URL changes
  useEffect(() => {
    if (urlUnitId && urlUnitId !== filters.unitId) {
      setFilters((prev) => ({ ...prev, unitId: urlUnitId }));
    }
  }, [urlUnitId]);

  // Auto-open create dialog when action=new is present in URL
  useEffect(() => {
    if (urlAction === "new" && !isCreateOpen) {
      setIsCreateOpen(true);
    }
  }, [urlAction]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const {
    data,
    isLoading: transactionsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteTransactions(filters, user?.id, sortConfig);

  const handleSortChange = (field: SortField) => {
    setSortConfig((prev) => {
      if (!prev || prev.field !== field) {
        return { field, order: "desc" };
      }
      if (prev.order === "desc") {
        return { field, order: "asc" };
      }
      return undefined; // Reset to default
    });
  };

  // Flatten paginated data
  const transactions = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const handleTransactionCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["infinite-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    queryClient.invalidateQueries({ queryKey: ["asset-health"] });
    setIsCreateOpen(false);
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["infinite-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["bank-statement-entries"] });
    setIsImportOpen(false);
    toast({ title: "Extrato importado com sucesso!" });
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Aplique filtros diferentes ou adicione lançamentos.",
        variant: "destructive",
      });
      return;
    }

    // Build CSV content
    const headers = ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Status", "Unidade"];
    const rows = transactions.map((t) => [
      t.transaction_date,
      t.type === "income" ? "Receita" : "Despesa",
      t.description,
      t.category?.name || "",
      t.amount,
      t.status,
      t.unit?.unit_number || "",
    ]);

    const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lancamentos_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exportação concluída!" });
  };

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>
            <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission="finance_transactions.create">
              <Button onClick={() => setIsCreateOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </PermissionGate>
            {(isOwner || hasPermission('finance_transactions', 'create')) && (
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Compact Filters */}
        <TransactionsFiltersCompact filters={filters} onFiltersChange={setFilters} />

        {/* Transactions Table with Infinite Scroll */}
        <TransactionsTableInfinite
          transactions={transactions}
          isLoading={transactionsLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage ?? false}
          fetchNextPage={fetchNextPage}
          onTransactionUpdated={handleTransactionCreated}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
        />

        {/* Create Transaction Dialog */}
        <CreateTransactionDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={handleTransactionCreated}
          prefill={urlUnitId ? { unitId: urlUnitId } : undefined}
        />

        {/* Import Statement Dialog - uses first bank account or empty string */}
        <ImportStatementDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          bankAccountId=""
          onSuccess={handleImportSuccess}
        />
      </div>
    </AppLayout>
  );
};

export default FinanceTransactions;
