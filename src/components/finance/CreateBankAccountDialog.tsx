import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { CurrencyInput } from "@/components/ui/currency-input";

interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  account_number: string | null;
  agency: string | null;
  initial_balance: number | null;
  balance: number | null;
  color: string | null;
  is_default: boolean | null;
}

interface CreateBankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editAccount?: BankAccount | null;
}

const COLORS = [
  "#10b981", "#6366f1", "#8b5cf6", "#ec4899", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#ef4444",
];

export function CreateBankAccountDialog({ open, onOpenChange, onSuccess, editAccount }: CreateBankAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { effectiveBrokerId } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bankName: "",
    accountNumber: "",
    agency: "",
    initialBalance: "",
    color: "#10b981",
    isDefault: false,
  });

  useEffect(() => {
    if (editAccount) {
      setFormData({
        name: editAccount.name || "",
        bankName: editAccount.bank_name || "",
        accountNumber: editAccount.account_number || "",
        agency: editAccount.agency || "",
        initialBalance: editAccount.initial_balance !== null && editAccount.initial_balance !== undefined
          ? String(editAccount.initial_balance)
          : "",
        color: editAccount.color || "#10b981",
        isDefault: editAccount.is_default || false,
      });
    } else if (open) {
      resetForm();
    }
  }, [editAccount, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!effectiveBrokerId) throw new Error("Usuário não autenticado");

      const initialBalance = formData.initialBalance ? parseFloat(formData.initialBalance) : 0;

      const payload = {
        name: formData.name,
        bank_name: formData.bankName || null,
        account_number: formData.accountNumber || null,
        agency: formData.agency || null,
        initial_balance: initialBalance,
        balance: initialBalance,
        color: formData.color,
        is_default: formData.isDefault,
      };

      if (editAccount) {
        const { error } = await supabase
          .from("bank_accounts")
          .update(payload)
          .eq("id", editAccount.id);

        if (error) throw error;
        toast({ title: "Conta atualizada com sucesso!" });
      } else {
        const { error } = await supabase.from("bank_accounts").insert({
          broker_id: effectiveBrokerId,
          ...payload,
        });

        if (error) throw error;
        toast({ title: "Conta criada com sucesso!" });
      }
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-summary"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-progressive"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-filter"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-summaries-progressive"] });
      
      onSuccess();
      if (!editAccount) resetForm();
    } catch (error: any) {
      toast({
        title: editAccount ? "Erro ao atualizar conta" : "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      bankName: "",
      accountNumber: "",
      agency: "",
      initialBalance: "",
      color: "#10b981",
      isDefault: false,
    });
  };

  const isEdit = !!editAccount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Conta Bancária" : "Nova Conta Bancária"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados da conta bancária"
              : "Adicione uma conta para gerenciar suas movimentações"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta *</Label>
            <Input
              id="name"
              placeholder="Ex: Conta Principal, Conta PJ..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Banco</Label>
            <Input
              id="bankName"
              placeholder="Ex: Itaú, Bradesco, Nubank..."
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agency">Agência</Label>
              <Input
                id="agency"
                placeholder="0000"
                value={formData.agency}
                onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Conta</Label>
              <Input
                id="accountNumber"
                placeholder="00000-0"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialBalance">Saldo de Abertura</Label>
            <CurrencyInput
              id="initialBalance"
              placeholder="0,00"
              value={formData.initialBalance}
              onChange={(v) => setFormData({ ...formData, initialBalance: v })}
            />
            <div className="flex items-start gap-2 p-2 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-[11px]">
                Este valor é a âncora para o cálculo do saldo progressivo. 
                {isEdit 
                  ? "Ao alterá-lo, o saldo real e projetado serão recalculados."
                  : "Informe o saldo atual do seu banco no momento da criação."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-all ${
                    formData.color === color ? "ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border p-3">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked === true })}
            />
            <Label htmlFor="isDefault" className="text-sm font-normal cursor-pointer">
              Definir como conta padrão
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEdit ? "Salvando..." : "Criando...") : (isEdit ? "Salvar Alterações" : "Criar Conta")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
