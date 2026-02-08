import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Filter, Search, X, CheckCircle2, ArrowRightLeft, Landmark, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransactionFilters } from "@/pages/FinanceTransactions";
import { UnitSelector } from "./UnitSelector";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface TransactionsFiltersCompactProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
}

export function TransactionsFiltersCompact({ filters, onFiltersChange }: TransactionsFiltersCompactProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: categories = [] } = useQuery({
    queryKey: ["financial-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, bank_name, color")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Count active filters (excluding search and hideTransfers toggle)
  const activeFiltersCount = [
    filters.type !== "all",
    filters.status !== "all",
    filters.categoryId !== "all",
    filters.unitId !== "",
    filters.bankAccountId !== "",
    filters.issueDateFrom !== "",
    filters.issueDateTo !== "",
    filters.dueDateFrom !== "",
    filters.dueDateTo !== "",
    filters.reconciled !== "all",
    filters.hideTransfers === true,
  ].filter(Boolean).length;

  const hasAnyFilters = activeFiltersCount > 0 || filters.search !== "";

  const clearAllFilters = () => {
    onFiltersChange({
      type: "all",
      status: "all",
      categoryId: "all",
      issueDateFrom: "",
      issueDateTo: "",
      dueDateFrom: "",
      dueDateTo: "",
      search: "",
      unitId: "",
      bankAccountId: "",
      reconciled: "all",
      hideTransfers: false,
    });
    setIsOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição..."
          className="pl-9 h-9 text-sm"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Filter className="h-3.5 w-3.5" />
            <span className={isMobile ? "sr-only" : ""}>Filtros</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-[80vh] overflow-y-auto" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtros Avançados</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      type: "all",
                      status: "all",
                      categoryId: "all",
                      unitId: "",
                      bankAccountId: "",
                      issueDateFrom: "",
                      issueDateTo: "",
                      dueDateFrom: "",
                      dueDateTo: "",
                      reconciled: "all",
                      hideTransfers: false,
                    });
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            {/* Bank Account */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Landmark className="h-3 w-3" />
                Conta Bancária
              </Label>
              <Select
                value={filters.bankAccountId || "all"}
                onValueChange={(v) => onFiltersChange({ ...filters, bankAccountId: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: acc.color || "#10b981" }}
                        />
                        <span className="truncate">
                          {acc.name}{acc.bank_name ? ` (${acc.bank_name})` : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <Label className="text-xs">Unidade / Imóvel</Label>
              <UnitSelector
                value={filters.unitId}
                onChange={(v) => onFiltersChange({ ...filters, unitId: v })}
                placeholder="Todas as unidades"
              />
            </div>

            {/* Type - Movement Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Movimentação</Label>
              <Select
                value={filters.type}
                onValueChange={(v) => onFiltersChange({ ...filters, type: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      Receitas
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      Despesas
                    </div>
                  </SelectItem>
                  <SelectItem value="transfer">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />
                      Transferências
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => onFiltersChange({ ...filters, status: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reconciliation Status */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Conciliação
              </Label>
              <Select
                value={filters.reconciled}
                onValueChange={(v) => onFiltersChange({ ...filters, reconciled: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Conciliação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="reconciled">Conciliados</SelectItem>
                  <SelectItem value="not_reconciled">Não Conciliados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select
                value={filters.categoryId}
                onValueChange={(v) => onFiltersChange({ ...filters, categoryId: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color || "#6366f1" }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issue Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xs">Data Emissão</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="De"
                  className="h-9 text-xs"
                  value={filters.issueDateFrom}
                  onChange={(e) => onFiltersChange({ ...filters, issueDateFrom: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="Até"
                  className="h-9 text-xs"
                  value={filters.issueDateTo}
                  onChange={(e) => onFiltersChange({ ...filters, issueDateTo: e.target.value })}
                />
              </div>
            </div>

            {/* Due Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xs">Data Vencimento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="De"
                  className="h-9 text-xs"
                  value={filters.dueDateFrom}
                  onChange={(e) => onFiltersChange({ ...filters, dueDateFrom: e.target.value })}
                />
                <Input
                  type="date"
                  placeholder="Até"
                  className="h-9 text-xs"
                  value={filters.dueDateTo}
                  onChange={(e) => onFiltersChange({ ...filters, dueDateTo: e.target.value })}
                />
              </div>
            </div>

            {/* Hide Transfers Toggle */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="hide-transfers" className="text-xs cursor-pointer">
                  Ocultar Transferências
                </Label>
              </div>
              <Switch
                id="hide-transfers"
                checked={filters.hideTransfers}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, hideTransfers: checked })}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All Link */}
      {hasAnyFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground h-9 text-xs"
          onClick={clearAllFilters}
        >
          <X className="h-3 w-3" />
          Limpar
        </Button>
      )}
    </div>
  );
}