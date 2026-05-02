import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Sparkles, Plus, Home, HelpCircle, Repeat, AlertCircle, User, ArrowRightLeft, ClipboardList } from "lucide-react";
import { useFinancialCategories } from "@/hooks/useFinancialCategories";
import { cn } from "@/lib/utils";
import { CreateCategoryDialog } from "@/components/finance/CreateCategoryDialog";
import { UnitSelector } from "@/components/finance/UnitSelector";
import { ContactSelector } from "@/components/ContactSelector";
import { addMonths, format } from "date-fns";

import { ObligationType } from "@/hooks/useAssetHealth";
import { ObligationSelector } from "@/components/finance/ObligationSelector";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { ASSET_EXPENSE_CATEGORY_LIST } from "@/lib/asset-expense-categories";

export interface TransactionPrefill {
  description?: string;
  amount?: number;
  type?: "income" | "expense";
  unitId?: string;
  categoryId?: string;
  dueDate?: string;
  status?: string;
  bankAccountId?: string;
}

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editTransaction?: any;
  prefill?: TransactionPrefill;
  obligationType?: ObligationType | null;
  competencyPeriod?: string;
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  editTransaction,
  prefill,
  obligationType,
  competencyPeriod,
}: CreateTransactionDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { effectiveBrokerId } = useWorkspace();
  const { isOwner, hasPermission } = usePermissions();
  
  const canEdit = !editTransaction || isOwner || hasPermission('finance_transactions', 'edit');
  const canReconcile = isOwner || hasPermission('finance_reconciliation', 'create') || hasPermission('finance_reconciliation', 'edit');
  
  // Determine initial mode - check if it's a transfer edit
  const isTransferEdit = editTransaction?.obligation_type === "transfer";
  const [mode, setMode] = useState<"income" | "expense" | "transfer">(
    isTransferEdit ? "transfer" : (prefill?.type || editTransaction?.type || "expense")
  );
  
  // For compatibility with existing code
  const type = mode === "transfer" ? "expense" : mode;
  
  const [formData, setFormData] = useState({
    description: editTransaction?.description || prefill?.description || "",
    amount: editTransaction?.amount?.toString() || prefill?.amount?.toString() || "",
    categoryId: editTransaction?.category_id || prefill?.categoryId || "",
    bankAccountId: editTransaction?.bank_account_id || prefill?.bankAccountId || "",
    transactionDate: editTransaction?.transaction_date || new Date().toISOString().split("T")[0],
    dueDate: editTransaction?.due_date || prefill?.dueDate || "",
    status: editTransaction?.status || prefill?.status || "pending",
    paymentMethod: editTransaction?.payment_method || "",
    notes: editTransaction?.notes || "",
    unitId: editTransaction?.unit_id || prefill?.unitId || "",
    contactId: editTransaction?.contact_id || "",
    assetExpenseCategory: editTransaction?.asset_expense_category || "",
  });

  // Obligation linking state
  const [selectedObligationType, setSelectedObligationType] = useState<ObligationType | null>(
    (editTransaction?.obligation_type as ObligationType) || obligationType || null
  );
  const [selectedCompetencyPeriod, setSelectedCompetencyPeriod] = useState<string | undefined>(
    editTransaction?.competency_period || competencyPeriod || undefined
  );

  // Transfer-specific state
  const [transferData, setTransferData] = useState({
    amount: "",
    transactionDate: new Date().toISOString().split("T")[0],
    sourceAccountId: "",
    destinationAccountId: "",
    notes: "",
  });

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("monthly");
  const [recurrenceCount, setRecurrenceCount] = useState("12");

  // Handle obligation selection
  const handleObligationChange = (type: ObligationType | null, competency?: string) => {
    setSelectedObligationType(type);
    setSelectedCompetencyPeriod(competency);
  };

  // Reset obligation when unit changes
  useEffect(() => {
    if (!formData.unitId) {
      setSelectedObligationType(null);
      setSelectedCompetencyPeriod(undefined);
    }
  }, [formData.unitId]);

  // Update form when prefill changes
  useEffect(() => {
    if (prefill) {
      setMode(prefill.type || "expense");
      setFormData((prev) => ({
        ...prev,
        description: prefill.description || prev.description,
        amount: prefill.amount?.toString() || prev.amount,
        categoryId: prefill.categoryId || prev.categoryId,
        dueDate: prefill.dueDate || prev.dueDate,
        status: prefill.status || prev.status,
        unitId: prefill.unitId || prev.unitId,
        bankAccountId: prefill.bankAccountId || prev.bankAccountId,
      }));
    }
  }, [prefill]);

  // Reset recurrence when dialog opens for edit
  useEffect(() => {
    if (editTransaction) {
      setIsRecurring(false);
    }
  }, [editTransaction]);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const { categories, hasCategories, seedDefaultCategories } = useFinancialCategories(type);

  // Seed default categories if none exist
  useEffect(() => {
    if (!hasCategories && open) {
      seedDefaultCategories.mutate();
    }
  }, [hasCategories, open]);

  const handleCategoryCreated = (categoryId: string) => {
    setFormData({ ...formData, categoryId });
  };

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const brokerId = effectiveBrokerId || user.id;

      // Handle Transfer Mode
      if (mode === "transfer") {
        if (!transferData.sourceAccountId || !transferData.destinationAccountId) {
          throw new Error("Selecione as contas de origem e destino");
        }
        if (transferData.sourceAccountId === transferData.destinationAccountId) {
          throw new Error("As contas de origem e destino devem ser diferentes");
        }
        if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
          throw new Error("Informe um valor válido");
        }

        const amount = parseFloat(transferData.amount);
        const transferGroupId = crypto.randomUUID();
        const sourceAccount = bankAccounts.find(a => a.id === transferData.sourceAccountId);
        const destAccount = bankAccounts.find(a => a.id === transferData.destinationAccountId);

        // Create two transactions: one expense (source) and one income (destination)
        const transferTransactions = [
          {
            broker_id: brokerId,
            assigned_user_id: user.id,
            type: "expense",
            description: `Transferência para ${destAccount?.name || "outra conta"}`,
            amount,
            bank_account_id: transferData.sourceAccountId,
            transaction_date: transferData.transactionDate,
            due_date: transferData.transactionDate,
            status: "paid",
            paid_date: transferData.transactionDate,
            notes: transferData.notes || null,
            obligation_type: "transfer",
            group_id: transferGroupId,
          },
          {
            broker_id: brokerId,
            assigned_user_id: user.id,
            type: "income",
            description: `Transferência de ${sourceAccount?.name || "outra conta"}`,
            amount,
            bank_account_id: transferData.destinationAccountId,
            transaction_date: transferData.transactionDate,
            due_date: transferData.transactionDate,
            status: "paid",
            paid_date: transferData.transactionDate,
            notes: transferData.notes || null,
            obligation_type: "transfer",
            group_id: transferGroupId,
          },
        ];

        const { error } = await supabase
          .from("financial_transactions")
          .insert(transferTransactions);

        if (error) throw error;
        toast({ title: "Transferência registrada com sucesso!" });
        onSuccess();
        resetForm();
        return;
      }

      // Normal transaction flow
      const baseTransactionData = {
        broker_id: brokerId,
        assigned_user_id: user.id,
        type,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category_id: formData.categoryId || null,
        bank_account_id: formData.bankAccountId || null,
        transaction_date: formData.transactionDate,
        due_date: formData.dueDate || null,
        status: formData.status,
        payment_method: formData.paymentMethod || null,
        notes: formData.notes || null,
        paid_date: formData.status === "paid" ? new Date().toISOString().split("T")[0] : null,
        unit_id: formData.unitId || null,
        contact_id: formData.contactId || null,
        obligation_type: selectedObligationType || obligationType || null,
        competency_period: selectedCompetencyPeriod || competencyPeriod || null,
        asset_expense_category: (type === 'expense' && formData.unitId && formData.assetExpenseCategory) ? formData.assetExpenseCategory : null,
      };

      if (editTransaction) {
        const { error } = await supabase
          .from("financial_transactions")
          .update(baseTransactionData)
          .eq("id", editTransaction.id);
        if (error) throw error;
        toast({ title: "Lançamento atualizado com sucesso!" });
      } else if (isRecurring) {
        const groupId = crypto.randomUUID();
        const count = parseInt(recurrenceCount) || 1;
        const transactions = [];

        for (let i = 0; i < count; i++) {
          const transactionDate = addMonths(new Date(formData.transactionDate), i);
          const dueDate = formData.dueDate 
            ? addMonths(new Date(formData.dueDate), i) 
            : null;

          transactions.push({
            ...baseTransactionData,
            transaction_date: format(transactionDate, "yyyy-MM-dd"),
            due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
            group_id: groupId,
            recurrence_info: {
              frequency: recurrenceFrequency,
              total_count: count,
              current_index: i + 1,
            },
          });
        }

        const { error } = await supabase
          .from("financial_transactions")
          .insert(transactions);
        if (error) throw error;
        toast({ title: `${count} lançamentos recorrentes criados!` });
      } else {
        const { error } = await supabase
          .from("financial_transactions")
          .insert(baseTransactionData);
        if (error) throw error;
        toast({ title: "Lançamento criado com sucesso!" });
      }

      onSuccess();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar lançamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      categoryId: "",
      bankAccountId: "",
      transactionDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      status: "pending",
      paymentMethod: "",
      notes: "",
      unitId: "",
      contactId: "",
      assetExpenseCategory: "",
    });
    setTransferData({
      amount: "",
      transactionDate: new Date().toISOString().split("T")[0],
      sourceAccountId: "",
      destinationAccountId: "",
      notes: "",
    });
    setMode("expense");
    setIsRecurring(false);
    setRecurrenceCount("12");
    setSelectedObligationType(null);
    setSelectedCompetencyPeriod(undefined);
  };

  // Check if the transaction is reconciled (read-only mode)
  const isReconciled = editTransaction?.is_reconciled === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {editTransaction 
              ? (canEdit ? "Editar Lançamento" : "Detalhes do Lançamento") 
              : "Novo Lançamento"}
          </DialogTitle>
          <DialogDescription>
            {editTransaction 
              ? (canEdit ? "Atualize os dados do lançamento" : "Visualização do lançamento") 
              : "Registre uma nova receita ou despesa"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
          {/* Reconciliation Warning */}
          {isReconciled && (
            <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-800 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este lançamento foi conciliado e não pode ser editado sem que a conciliação seja desfeita.
              </AlertDescription>
            </Alert>
          )}

          <form id="transaction-form" onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={!canEdit || isReconciled} className="space-y-6">
              {/* Type Selector - 3 tabs */}
              <Tabs value={mode} onValueChange={(v) => setMode(v as "income" | "expense" | "transfer")}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="income" className="gap-1.5 text-xs sm:text-sm" disabled={editTransaction && !isTransferEdit}>
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Receita</span>
                    <span className="sm:hidden">Rec.</span>
                  </TabsTrigger>
                  <TabsTrigger value="expense" className="gap-1.5 text-xs sm:text-sm" disabled={editTransaction && !isTransferEdit}>
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Despesa</span>
                    <span className="sm:hidden">Desp.</span>
                  </TabsTrigger>
                  <TabsTrigger value="transfer" className="gap-1.5 text-xs sm:text-sm" disabled={editTransaction && !isTransferEdit}>
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Transferência</span>
                    <span className="sm:hidden">Transf.</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Transfer Form */}
              {mode === "transfer" ? (
                <TransferFormContent
                  formData={transferData}
                  onChange={setTransferData}
                  bankAccounts={bankAccounts}
                />
              ) : (
              <>
                {/* Description - full width */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Comissão venda apt 101"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                {/* Amount + Unit - 2 col grid, aligned by input base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <CurrencyInput
                      id="amount"
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(value) => setFormData({ ...formData, amount: value })}
                      disabled={isReconciled}
                      className={cn("h-10", isReconciled ? "bg-muted cursor-not-allowed" : "")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Unidade / Imóvel
                    </Label>
                    <UnitSelector
                      value={formData.unitId}
                      onChange={(v) => setFormData({ ...formData, unitId: v })}
                      placeholder="Vincular (opcional)"
                    />
                  </div>
                </div>

                {/* Obligation Selector - Shows when unit is selected */}
                {formData.unitId && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Obrigação do Ativo
                    </Label>
                    <ObligationSelector
                      unitId={formData.unitId}
                      value={selectedObligationType}
                      onChange={handleObligationChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Vincule este lançamento a uma obrigação para rastreamento automático na Gestão de Ativos.
                    </p>
                  </div>
                )}

                {/* Asset Expense Category - Shows when expense + unit selected */}
                {type === 'expense' && formData.unitId && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Categoria do imóvel
                    </Label>
                    <Select
                      value={formData.assetExpenseCategory || '__none__'}
                      onValueChange={(v) => setFormData({ ...formData, assetExpenseCategory: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Selecionar (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {ASSET_EXPENSE_CATEGORY_LIST.map((cat) => (
                          <SelectItem key={cat.key} value={cat.key}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Classificação padronizada para relatórios patrimoniais.
                    </p>
                  </div>
                )}

                {/* Contact + Category - 2 col grid, aligned by input base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {type === "income" ? "Favorecido" : "Fornecedor"}
                    </Label>
                    <ContactSelector
                      value={formData.contactId}
                      onChange={(v) => setFormData({ ...formData, contactId: v })}
                      placeholder="Contato (opcional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Categoria</Label>
                      <div className="flex gap-1">
                        {!hasCategories && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            onClick={() => seedDefaultCategories.mutate()}
                            disabled={seedDefaultCategories.isPending}
                          >
                            <Sparkles className="h-3 w-3" />
                            {seedDefaultCategories.isPending ? "Criando..." : "Criar padrões"}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1"
                          onClick={() => setCategoryDialogOpen(true)}
                        >
                          <Plus className="h-3 w-3" />
                          Nova
                        </Button>
                      </div>
                    </div>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <span>{cat.name}</span>
                              {cat.tooltip && (
                                <span className="text-xs text-muted-foreground" title={cat.tooltip}>
                                  <HelpCircle className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.categoryId && categories.find(c => c.id === formData.categoryId)?.name?.toLowerCase().includes("repasse") && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <HelpCircle className="h-3 w-3 flex-shrink-0" />
                        Valores recebidos do inquilino e transferidos ao dono.
                      </p>
                    )}
                  </div>
                </div>

                <CreateCategoryDialog
                  open={categoryDialogOpen}
                  onOpenChange={setCategoryDialogOpen}
                  onSuccess={handleCategoryCreated}
                  defaultType={type}
                />

                {/* Bank Account - full width */}
                <div className="space-y-2">
                  <Label>Conta Bancária</Label>
                  <Select
                    value={formData.bankAccountId}
                    onValueChange={(v) => setFormData({ ...formData, bankAccountId: v })}
                    disabled={isReconciled}
                  >
                    <SelectTrigger className={isReconciled ? "bg-muted cursor-not-allowed" : ""}>
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} {acc.bank_name && `- ${acc.bank_name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates Row */}
                <TooltipProvider>
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="transactionDate" className="flex items-center gap-1">
                        Data Emissão *
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            <p>Data de competência para DRE e geração da receita/despesa.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="transactionDate"
                        type="date"
                        value={formData.transactionDate}
                        onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                        required
                        disabled={isReconciled}
                        className={isReconciled ? "bg-muted cursor-not-allowed" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate" className="flex items-center gap-1">
                        Vencimento
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px]">
                            <p>Esta data alimenta o Fluxo de Caixa na Visão Geral.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                </TooltipProvider>

                {/* Status and Payment Method */}
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="transfer">Transferência</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Recurring Transaction */}
                {!editTransaction && (
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                        <Repeat className="h-4 w-4" />
                        Repetir lançamento?
                      </Label>
                      <Switch
                        id="recurring"
                        checked={isRecurring}
                        onCheckedChange={setIsRecurring}
                      />
                    </div>

                    {isRecurring && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="space-y-2">
                          <Label>Frequência</Label>
                          <Select
                            value={recurrenceFrequency}
                            onValueChange={setRecurrenceFrequency}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantidade de meses</Label>
                          <Input
                            type="number"
                            min="2"
                            max="60"
                            value={recurrenceCount}
                            onChange={(e) => setRecurrenceCount(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes - full width */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Anotações adicionais..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </>
              )}
            </fieldset>
          </form>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {canEdit ? "Cancelar" : "Fechar"}
          </Button>
          {canEdit && (
            <Button type="submit" form="transaction-form" disabled={isLoading}>
              {isLoading 
                ? "Salvando..." 
                : editTransaction 
                  ? "Atualizar" 
                  : mode === "transfer"
                    ? "Criar Transferência"
                    : isRecurring 
                      ? `Criar ${recurrenceCount} Lançamentos` 
                      : "Criar Lançamento"
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Transfer Form Content Component
interface TransferFormData {
  amount: string;
  transactionDate: string;
  sourceAccountId: string;
  destinationAccountId: string;
  notes: string;
}

interface TransferFormContentProps {
  formData: TransferFormData;
  onChange: (data: TransferFormData) => void;
  bankAccounts: any[];
}

function TransferFormContent({ formData, onChange, bankAccounts }: TransferFormContentProps) {
  return (
    <div className="space-y-4">
      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="transfer-amount">Valor *</Label>
        <CurrencyInput
          id="transfer-amount"
          placeholder="0,00"
          value={formData.amount}
          onChange={(value) => onChange({ ...formData, amount: value })}
        />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="transfer-date">Data *</Label>
        <Input
          id="transfer-date"
          type="date"
          value={formData.transactionDate}
          onChange={(e) => onChange({ ...formData, transactionDate: e.target.value })}
          required
        />
      </div>

      {/* Source Account */}
      <div className="space-y-2">
        <Label>Conta de Origem (Saída) *</Label>
        <Select
          value={formData.sourceAccountId}
          onValueChange={(v) => onChange({ ...formData, sourceAccountId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a conta de saída" />
          </SelectTrigger>
          <SelectContent>
            {bankAccounts
              .filter((acc) => acc.id !== formData.destinationAccountId)
              .map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name} {acc.bank_name && `- ${acc.bank_name}`}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Destination Account */}
      <div className="space-y-2">
        <Label>Conta de Destino (Entrada) *</Label>
        <Select
          value={formData.destinationAccountId}
          onValueChange={(v) => onChange({ ...formData, destinationAccountId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a conta de entrada" />
          </SelectTrigger>
          <SelectContent>
            {bankAccounts
              .filter((acc) => acc.id !== formData.sourceAccountId)
              .map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name} {acc.bank_name && `- ${acc.bank_name}`}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="transfer-notes">Observação (Opcional)</Label>
        <Textarea
          id="transfer-notes"
          placeholder="Ex: Transferência para reserva"
          value={formData.notes}
          onChange={(e) => onChange({ ...formData, notes: e.target.value })}
          rows={2}
        />
      </div>

      {/* Visual indicator */}
      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-200 text-center">
        <p className="text-xs text-blue-600">
          <ArrowRightLeft className="h-3.5 w-3.5 inline mr-1" />
          Transferências não afetam o DRE, apenas movimentam saldo entre contas.
        </p>
      </div>
    </div>
  );
}
