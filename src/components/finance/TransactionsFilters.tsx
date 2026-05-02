import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransactionFilters } from "@/pages/FinanceTransactions";
import { UnitSelector } from "./UnitSelector";

interface TransactionsFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
}

export function TransactionsFilters({ filters, onFiltersChange }: TransactionsFiltersProps) {
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

  const hasFilters = 
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.categoryId !== "all" ||
    filters.unitId ||
    filters.issueDateFrom ||
    filters.issueDateTo ||
    filters.dueDateFrom ||
    filters.dueDateTo ||
    filters.search ||
    filters.reconciled !== "all" ||
    filters.assetExpenseCategory !== "all";

  const clearFilters = () => {
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
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição..."
              className="pl-10 text-sm"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Unit */}
            <div className="col-span-2">
              <UnitSelector
                value={filters.unitId}
                onChange={(v) => onFiltersChange({ ...filters, unitId: v })}
                placeholder="Todas as unidades"
              />
            </div>

            {/* Type */}
            <Select
              value={filters.type}
              onValueChange={(v) => onFiltersChange({ ...filters, type: v })}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select
              value={filters.status}
              onValueChange={(v) => onFiltersChange({ ...filters, status: v })}
            >
              <SelectTrigger className="text-sm">
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

          {/* Date Ranges Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Issue Date Range */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Emissão De</Label>
              <Input
                type="date"
                className="text-sm"
                value={filters.issueDateFrom}
                onChange={(e) => onFiltersChange({ ...filters, issueDateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Emissão Até</Label>
              <Input
                type="date"
                className="text-sm"
                value={filters.issueDateTo}
                onChange={(e) => onFiltersChange({ ...filters, issueDateTo: e.target.value })}
              />
            </div>

            {/* Due Date Range */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Vencimento De</Label>
              <Input
                type="date"
                className="text-sm"
                value={filters.dueDateFrom}
                onChange={(e) => onFiltersChange({ ...filters, dueDateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Vencimento Até</Label>
              <Input
                type="date"
                className="text-sm"
                value={filters.dueDateTo}
                onChange={(e) => onFiltersChange({ ...filters, dueDateTo: e.target.value })}
              />
            </div>
          </div>

          {/* Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Category */}
            <Select
              value={filters.categoryId}
              onValueChange={(v) => onFiltersChange({ ...filters, categoryId: v })}
            >
              <SelectTrigger className="text-sm">
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

          {/* Clear Filters */}
          {hasFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}