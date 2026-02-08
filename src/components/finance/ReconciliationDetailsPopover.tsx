import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Link2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ReconciliationDetailsPopoverProps {
  transaction: {
    id: string;
    is_reconciled: boolean;
    reconciled_at: string | null;
    bank_account?: { id: string; name: string; bank_name?: string } | null;
  };
  onReconciliationChange: () => void;
}

export function ReconciliationDetailsPopover({
  transaction,
  onReconciliationChange,
}: ReconciliationDetailsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleUndoReconciliation = async () => {
    setIsUndoing(true);
    try {
      // First, find the bank statement entry linked to this transaction
      const { data: entries } = await supabase
        .from("bank_statement_entries")
        .select("id")
        .eq("transaction_id", transaction.id);

      // Unlink bank statement entries
      if (entries && entries.length > 0) {
        const entryIds = entries.map(e => e.id);
        await supabase
          .from("bank_statement_entries")
          .update({ transaction_id: null, is_reconciled: false })
          .in("id", entryIds);
      }

      // Update the transaction
      const { error } = await supabase
        .from("financial_transactions")
        .update({ 
          is_reconciled: false, 
          reconciled_at: null 
        })
        .eq("id", transaction.id);

      if (error) throw error;

      toast({ title: "Conciliação desfeita com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["infinite-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-statement-entries"] });
      onReconciliationChange();
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao desfazer conciliação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUndoing(false);
    }
  };

  if (!transaction.is_reconciled) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 rounded-full transition-all",
            "bg-blue-500 text-white hover:bg-blue-600"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <CheckCircle2 className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-blue-500/10">
              <Link2 className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Detalhes da Conciliação</h4>
              <p className="text-xs text-muted-foreground">
                Lançamento vinculado ao extrato
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conciliado em:</span>
              <span className="font-medium">
                {transaction.reconciled_at 
                  ? format(new Date(transaction.reconciled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : "Data não registrada"}
              </span>
            </div>
            {transaction.bank_account && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conta:</span>
                <span className="font-medium truncate max-w-[140px]">
                  {transaction.bank_account.name}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-2"
              onClick={handleUndoReconciliation}
              disabled={isUndoing}
            >
              {isUndoing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unlink className="h-3.5 w-3.5" />
              )}
              Desfazer Conciliação
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
