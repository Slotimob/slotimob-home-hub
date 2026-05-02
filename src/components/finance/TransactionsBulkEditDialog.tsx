import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { ASSET_EXPENSE_CATEGORY_LIST } from "@/lib/asset-expense-categories";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useFinancialCategories } from "@/hooks/useFinancialCategories";
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

interface TransactionsBulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransactions: any[];
  onSuccess: () => void;
}

export function TransactionsBulkEditDialog({
  open,
  onOpenChange,
  selectedTransactions,
  onSuccess,
}: TransactionsBulkEditDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { categories } = useFinancialCategories();

  // States for which fields to update
  const [updateType, setUpdateType] = useState(false);
  const [updateDescription, setUpdateDescription] = useState(false);
  const [updateCategory, setUpdateCategory] = useState(false);
  const [updateIssueDate, setUpdateIssueDate] = useState(false);
  const [updateDueDate, setUpdateDueDate] = useState(false);
  const [updateAmount, setUpdateAmount] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(false);
  const [updateBankAccount, setUpdateBankAccount] = useState(false);
  const [updateAssetExpenseCategory, setUpdateAssetExpenseCategory] = useState(false);

  // Field values
  const [type, setType] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [assetExpenseCategory, setAssetExpenseCategory] = useState<string>("");

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const hasRecurring = selectedTransactions.some((t) => t.group_id);
  const selectedCount = selectedTransactions.length;

  // Fetch bank accounts
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      const { data } = await supabase
        .from("bank_accounts")
        .select("id, name, bank_name")
        .eq("broker_id", user.id)
        .order("name");
      setBankAccounts(data || []);
      setIsLoading(false);
    };

    if (open) {
      fetchBankAccounts();
      // Reset state when dialog opens
      setUpdateType(false);
      setUpdateDescription(false);
      setUpdateCategory(false);
      setUpdateIssueDate(false);
      setUpdateDueDate(false);
      setUpdateAmount(false);
      setUpdateStatus(false);
      setUpdateBankAccount(false);
      setUpdateAssetExpenseCategory(false);
      setType("");
      setDescription("");
      setCategoryId("");
      setIssueDate("");
      setDueDate("");
      setAmount("");
      setStatus("");
      setBankAccountId("");
      setAssetExpenseCategory("");
    }
  }, [open, user?.id]);

  const handlePrepareSubmit = () => {
    // Validate at least one field selected
    const hasAnyUpdate = updateType || updateDescription || updateCategory || updateIssueDate || 
                         updateDueDate || updateAmount || updateStatus || updateBankAccount || updateAssetExpenseCategory;
    
    if (!hasAnyUpdate) {
      toast({
        title: "Selecione ao menos um campo",
        description: "Marque pelo menos um campo para atualizar.",
        variant: "destructive",
      });
      return;
    }

    // Validate field values
    if (updateType && !type) {
      toast({ title: "Selecione um tipo", variant: "destructive" });
      return;
    }
    if (updateDescription && !description.trim()) {
      toast({ title: "Informe a descrição", variant: "destructive" });
      return;
    }
    if (updateCategory && !categoryId) {
      toast({ title: "Selecione uma categoria", variant: "destructive" });
      return;
    }
    if (updateIssueDate && !issueDate) {
      toast({ title: "Selecione a data de emissão", variant: "destructive" });
      return;
    }
    if (updateDueDate && !dueDate) {
      toast({ title: "Selecione a data de vencimento", variant: "destructive" });
      return;
    }
    if (updateAmount && (!amount || parseFloat(amount) <= 0)) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    if (updateStatus && !status) {
      toast({ title: "Selecione um status", variant: "destructive" });
      return;
    }
    if (updateBankAccount && !bankAccountId) {
      toast({ title: "Selecione uma conta bancária", variant: "destructive" });
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const ids = selectedTransactions.map((t) => t.id);

      // Build update object
      const updateData: Record<string, any> = {};
      if (updateType) updateData.type = type;
      if (updateDescription) updateData.description = description.trim();
      if (updateCategory) updateData.category_id = categoryId;
      if (updateIssueDate) updateData.transaction_date = issueDate;
      if (updateDueDate) updateData.due_date = dueDate;
      if (updateAmount) updateData.amount = parseFloat(amount);
      if (updateStatus) {
        updateData.status = status;
        if (status === "paid") {
          updateData.paid_date = new Date().toISOString().split("T")[0];
        }
      }
      if (updateBankAccount) updateData.bank_account_id = bankAccountId;
      if (updateAssetExpenseCategory) updateData.asset_expense_category = assetExpenseCategory || null;

      const { error } = await supabase
        .from("financial_transactions")
        .update(updateData)
        .in("id", ids);

      if (error) throw error;

      toast({
        title: "Lançamentos atualizados!",
        description: `${selectedCount} lançamento${selectedCount > 1 ? "s foram atualizados" : " foi atualizado"} com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ["infinite-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      setShowConfirmDialog(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter categories based on selected type or mixed types
  const transactionTypes = [...new Set(selectedTransactions.map((t) => t.type))];
  const mixedTypes = transactionTypes.length > 1;

  const filteredCategories = updateType && type
    ? categories.filter((c) => c.type === type)
    : mixedTypes
      ? categories
      : categories.filter((c) => c.type === transactionTypes[0]);

  // Count selected updates for summary
  const getUpdateSummary = () => {
    const updates: string[] = [];
    if (updateType) updates.push("Tipo");
    if (updateDescription) updates.push("Descrição");
    if (updateCategory) updates.push("Categoria");
    if (updateIssueDate) updates.push("Data Emissão");
    if (updateDueDate) updates.push("Data Vencimento");
    if (updateAmount) updates.push("Valor");
    if (updateStatus) updates.push("Status");
    if (updateBankAccount) updates.push("Conta Bancária");
    return updates;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              Editar {selectedCount} lançamento{selectedCount > 1 ? "s" : ""} em massa
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione os campos que deseja alterar. Apenas os campos marcados serão atualizados.
            </DialogDescription>
          </DialogHeader>

          {hasRecurring && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 text-amber-800 rounded-md">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="text-xs">
                Alguns lançamentos fazem parte de séries recorrentes. Apenas as instâncias selecionadas serão alteradas.
              </span>
            </div>
          )}

          <div className="space-y-3 py-2">
            {/* Type Field */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-type"
                  checked={updateType}
                  onCheckedChange={(checked) => {
                    setUpdateType(checked === true);
                    if (!checked) setType("");
                  }}
                />
                <Label htmlFor="update-type" className="cursor-pointer text-sm">
                  Alterar Tipo
                </Label>
              </div>
              {updateType && (
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-description"
                  checked={updateDescription}
                  onCheckedChange={(checked) => {
                    setUpdateDescription(checked === true);
                    if (!checked) setDescription("");
                  }}
                />
                <Label htmlFor="update-description" className="cursor-pointer text-sm">
                  Alterar Descrição
                </Label>
              </div>
              {updateDescription && (
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nova descrição"
                  className="h-9 text-sm"
                />
              )}
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-category"
                  checked={updateCategory}
                  onCheckedChange={(checked) => {
                    setUpdateCategory(checked === true);
                    if (!checked) setCategoryId("");
                  }}
                />
                <Label htmlFor="update-category" className="cursor-pointer text-sm">
                  Alterar Categoria
                </Label>
              </div>
              {updateCategory && (
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
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
              )}
            </div>

            {/* Issue Date Field */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-issue-date"
                  checked={updateIssueDate}
                  onCheckedChange={(checked) => {
                    setUpdateIssueDate(checked === true);
                    if (!checked) setIssueDate("");
                  }}
                />
                <Label htmlFor="update-issue-date" className="cursor-pointer text-sm">
                  Alterar Data Emissão
                </Label>
              </div>
              {updateIssueDate && (
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-9 text-sm"
                />
              )}
            </div>

            {/* Due Date Field */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-due-date"
                  checked={updateDueDate}
                  onCheckedChange={(checked) => {
                    setUpdateDueDate(checked === true);
                    if (!checked) setDueDate("");
                  }}
                />
                <Label htmlFor="update-due-date" className="cursor-pointer text-sm">
                  Alterar Data Vencimento
                </Label>
              </div>
              {updateDueDate && (
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-sm"
                />
              )}
            </div>

            {/* Amount Field */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-amount"
                  checked={updateAmount}
                  onCheckedChange={(checked) => {
                    setUpdateAmount(checked === true);
                    if (!checked) setAmount("");
                  }}
                />
                <Label htmlFor="update-amount" className="cursor-pointer text-sm">
                  Alterar Valor
                </Label>
              </div>
              {updateAmount && (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="h-9 text-sm"
                />
              )}
            </div>

            {/* Status Field */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-status"
                  checked={updateStatus}
                  onCheckedChange={(checked) => {
                    setUpdateStatus(checked === true);
                    if (!checked) setStatus("");
                  }}
                />
                <Label htmlFor="update-status" className="cursor-pointer text-sm">
                  Alterar Status
                </Label>
              </div>
              {updateStatus && (
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Bank Account Field */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-bank"
                  checked={updateBankAccount}
                  onCheckedChange={(checked) => {
                    setUpdateBankAccount(checked === true);
                    if (!checked) setBankAccountId("");
                  }}
                />
                <Label htmlFor="update-bank" className="cursor-pointer text-sm">
                  Alterar Conta Bancária
                </Label>
              </div>
              {updateBankAccount && (
                <Select value={bankAccountId} onValueChange={setBankAccountId} disabled={isLoading}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione uma conta"} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} {acc.bank_name && `(${acc.bank_name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handlePrepareSubmit} disabled={isSaving}>
              Revisar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Alterações em Massa
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a alterar <strong>{selectedCount}</strong> lançamento{selectedCount > 1 ? "s" : ""}.
              </p>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium mb-2">Campos que serão alterados:</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  {getUpdateSummary().map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-amber-600 font-medium">
                Esta ação não pode ser desfeita. Deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar e Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}