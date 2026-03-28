import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { ObligationHealth, ControlType } from "@/hooks/useAssetHealth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, Search, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LinkTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  unitName: string;
  obligation: ObligationHealth | null;
  competencyPeriod: string;
}

export function LinkTransactionDialog({
  open,
  onOpenChange,
  unitId,
  unitName,
  obligation,
  competencyPeriod,
}: LinkTransactionDialogProps) {
  const { effectiveBrokerId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState(false);

  const isManagerial = obligation?.controlType === "managerial";
  const tableName = isManagerial ? "managerial_transactions" : "financial_transactions";

  // Fetch recent transactions for this unit
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["link-transactions", unitId, tableName, competencyPeriod],
    queryFn: async () => {
      if (isManagerial) {
        const { data, error } = await supabase
          .from("managerial_transactions")
          .select("id, description, amount, status, due_date, obligation_type, competency_period")
          .eq("unit_id", unitId)
          .order("due_date", { ascending: false })
          .limit(30);
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await supabase
          .from("financial_transactions")
          .select("id, description, amount, status, due_date, obligation_type, competency_period, category:financial_categories(name)")
          .eq("unit_id", unitId)
          .order("due_date", { ascending: false })
          .limit(30);
        if (error) throw error;
        return data || [];
      }
    },
    enabled: open && !!unitId,
  });

  const filtered = useMemo(() => {
    if (!transactions) return [];
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t: any) =>
      t.description?.toLowerCase().includes(q) ||
      t.amount?.toString().includes(q)
    );
  }, [transactions, search]);

  const handleLink = async (transactionId: string) => {
    if (!obligation) return;
    setLinking(true);
    try {
      if (isManagerial) {
        const { error } = await supabase
          .from("managerial_transactions")
          .update({
            obligation_type: obligation.type,
            competency_period: competencyPeriod,
          })
          .eq("id", transactionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("financial_transactions")
          .update({
            obligation_type: obligation.type,
            competency_period: competencyPeriod,
          })
          .eq("id", transactionId);
        if (error) throw error;
      }

      toast({ title: "Vínculo criado!", description: `Lançamento vinculado à obrigação "${obligation.label}".` });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao vincular", description: err.message, variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Vincular Lançamento
          </DialogTitle>
          <DialogDescription>
            Vincule um lançamento existente à obrigação{" "}
            <strong>{obligation?.label}</strong> do imóvel <strong>{unitName}</strong>.
            {isManagerial && (
              <Badge variant="outline" className="ml-1 text-[10px] border-purple-400 text-purple-600">
                Gerencial
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou valor..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] rounded-md border">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum lançamento encontrado para esta unidade.
                </p>
              </div>
            ) : (
              <div className="p-1 space-y-1">
                {filtered.map((tx: any) => {
                  const isAlreadyLinked = tx.obligation_type === obligation?.type && tx.competency_period === competencyPeriod;
                  return (
                    <button
                      key={tx.id}
                      disabled={linking || isAlreadyLinked}
                      onClick={() => handleLink(tx.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-md border transition-all hover:bg-accent/50",
                        isAlreadyLinked && "bg-green-500/10 border-green-500/30"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {tx.due_date && (
                              <span className="text-[10px] text-muted-foreground">
                                Venc: {format(new Date(tx.due_date), "dd/MM/yyyy")}
                              </span>
                            )}
                            <Badge variant="outline" className="text-[10px] h-4">
                              {tx.status === "paid" ? "Pago" : tx.status === "pending" ? "Pendente" : tx.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold whitespace-nowrap">
                            {formatCurrency(tx.amount || 0)}
                          </span>
                          {isAlreadyLinked ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Link2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
