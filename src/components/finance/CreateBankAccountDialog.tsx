import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";

interface CreateBankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const COLORS = [
  "#10b981", "#6366f1", "#8b5cf6", "#ec4899", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#ef4444",
];

export function CreateBankAccountDialog({ open, onOpenChange, onSuccess }: CreateBankAccountDialogProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!effectiveBrokerId) throw new Error("Usuário não autenticado");

      const initialBalance = formData.initialBalance ? parseFloat(formData.initialBalance) : 0;

      const { error } = await supabase.from("bank_accounts").insert({
        broker_id: effectiveBrokerId,
        name: formData.name,
        bank_name: formData.bankName || null,
        account_number: formData.accountNumber || null,
        agency: formData.agency || null,
        // Set both initial_balance (immutable anchor) and balance (legacy)
        initial_balance: initialBalance,
        balance: initialBalance,
        color: formData.color,
        is_default: formData.isDefault,
      });

      if (error) throw error;

      toast({ title: "Conta criada com sucesso!" });
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-summary"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-progressive"] });
      
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Conta Bancária</DialogTitle>
          <DialogDescription>
            Adicione uma conta para gerenciar suas movimentações
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
            <Input
              id="initialBalance"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
            />
            <div className="flex items-start gap-2 p-2 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-[11px]">
                Este valor será a âncora imutável para o cálculo do saldo progressivo. 
                Informe o saldo atual do seu banco no momento da criação.
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
