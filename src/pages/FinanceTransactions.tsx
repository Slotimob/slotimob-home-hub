import { getEffectiveStatus, EFFECTIVE_STATUS_LABELS } from "@/lib/transaction-status";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { TransactionsTableInfinite } from "@/components/finance/TransactionsTableInfinite";
import { TransactionsFiltersCompact } from "@/components/finance/TransactionsFiltersCompact";
import { CreateTransactionDialog } from "@/components/finance/CreateTransactionDialog";
import { ImportStatementDialog } from "@/components/finance/ImportStatementDialog";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/subscription/PermissionGate";
import { Plus, Upload, FileSpreadsheet, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useInfiniteTransactions, SortField, SortOrder, SortConfig, DEFAULT_SORT } from "@/hooks/useInfiniteTransactions";
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
  assetExpenseCategory: string; // "all" | specific category | "uncategorized"
}

const FinanceTransactions = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOwner, hasPermission } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Get unitId and bankAccountId from URL if present
  const urlUnitId = searchParams.get("unitId") || "";
  const urlBankAccountId = searchParams.get("bankAccountId") || "";
  const urlAction = searchParams.get("action") || "";
  const VALID_STATUS = ["all", "pending", "paid", "overdue", "cancelled"];
  const VALID_TYPE = ["all", "income", "expense", "transfer"];
  const rawStatus = searchParams.get("status") || "";
  const rawType = searchParams.get("type") || "";
  const urlStatus = VALID_STATUS.includes(rawStatus) ? rawStatus : "";
  const urlType = VALID_TYPE.includes(rawType) ? rawType : "";


  const [filters, setFilters] = useState<TransactionFilters>({
    type: urlType || "all",
    status: urlStatus || "all",
    categoryId: "all",
    issueDateFrom: "",
    issueDateTo: "",
    dueDateFrom: "",
    dueDateTo: "",
    search: "",
    unitId: urlUnitId,
    bankAccountId: urlBankAccountId,
    reconciled: "all",
    hideTransfers: false,
    assetExpenseCategory: "all",
  });


  const removeUnitParam = () => {
    if (!searchParams.get("unitId")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("unitId");
    setSearchParams(next, { replace: true });
  };

  // Limpar o imóvel pelos filtros também tira o parâmetro da URL
  const handleFiltersChange = (next: TransactionFilters) => {
    if (!next.unitId && filters.unitId) removeUnitParam();
    setFilters(next);
  };

  const clearUnitFilter = () => handleFiltersChange({ ...filters, unitId: "" });

  const { data: filterUnit } = useQuery({
    queryKey: ["transactions-filter-unit", filters.unitId],
    enabled: !!filters.unitId,
    queryFn: async () => {
      const { data } = await supabase
        .from("units")
        .select("unit_number, address, property:properties(name)")
        .eq("id", filters.unitId)
        .maybeSingle();
      return data as any;
    },
  });
  const filterUnitLabel = filterUnit
    ? [filterUnit.property?.name, filterUnit.unit_number].filter(Boolean).join(" — ") || filterUnit.address || "Imóvel"
    : "Imóvel";

  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT);

  // S3: o filtro de imóvel vindo da URL some quando a URL deixa de trazer unitId
  const unitFromUrl = useRef(!!urlUnitId);
  useEffect(() => {
    if (urlUnitId && urlUnitId !== filters.unitId) {
      unitFromUrl.current = true;
      setFilters((prev) => ({ ...prev, unitId: urlUnitId }));
    } else if (!urlUnitId && unitFromUrl.current) {
      unitFromUrl.current = false;
      setFilters((prev) => ({ ...prev, unitId: "" }));
    }
    if (urlBankAccountId && urlBankAccountId !== filters.bankAccountId) {
      setFilters((prev) => ({ ...prev, bankAccountId: urlBankAccountId }));
    }
    if (urlStatus && urlStatus !== filters.status) {
      setFilters((prev) => ({ ...prev, status: urlStatus }));
    }
    if (urlType && urlType !== filters.type) {
      setFilters((prev) => ({ ...prev, type: urlType }));
    }
  }, [urlUnitId, urlBankAccountId, urlStatus, urlType]);


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

  // Ciclo: asc -> desc -> volta ao padrão (vencimento crescente)
  const handleSortChange = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field !== field) return { field, order: "asc" };
      if (prev.order === "asc") return { field, order: "desc" };
      return DEFAULT_SORT;
    });
  };

  const handleSortSet = (config: SortConfig) => setSortConfig(config);

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
      EFFECTIVE_STATUS_LABELS[getEffectiveStatus(t)],
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
      <AppLayout title="Lançamentos">
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppLayout title="Lançamentos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-1.5">Lançamentos <HelpTooltip featureKey="finance.transactions" /></h2>
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
        <TransactionsFiltersCompact filters={filters} onFiltersChange={handleFiltersChange} />

        {filters.unitId && (
          <div className="flex flex-wrap items-center gap-2 -mt-3">
            <Badge variant="secondary" className="gap-1 pr-1 font-normal">
              Imóvel: {filterUnitLabel}
              <button
                type="button"
                onClick={clearUnitFilter}
                aria-label="Remover filtro de imóvel"
                className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
            {transactions.some((t: any) => t.via_lease_share_percent != null) && (
              <span className="text-xs text-muted-foreground">
                Valores cheios dos lançamentos; inclui lançamentos de contratos com vários imóveis.
              </span>
            )}
          </div>
        )}

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
          onSortSet={handleSortSet}
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
