import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ReportsDateFilter } from "./ReportsDateFilter";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths } from "date-fns";

interface CashflowReportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: CashflowReportConfig) => Promise<void>;
  formatLabel: string;
}

export interface CashflowReportConfig {
  dateRange: { from: Date; to: Date };
  accountIds: string[] | "all";
  mode: "consolidated" | "by_account";
}

export function CashflowReportConfigDialog({ open, onOpenChange, onGenerate, formatLabel }: CashflowReportConfigDialogProps) {
  const [dateRange, setDateRange] = useState({ from: startOfMonth(subMonths(new Date(), 2)), to: new Date() });
  const [allAccounts, setAllAccounts] = useState(true);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"consolidated" | "by_account">("consolidated");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("id, name, bank_name, color").order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setAllAccounts(false);
  };

  const handleAllAccountsChange = (checked: boolean) => {
    setAllAccounts(checked);
    if (checked) setSelectedAccountIds([]);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate({
        dateRange,
        accountIds: allAccounts ? "all" : selectedAccountIds,
        mode,
      });
      onOpenChange(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = allAccounts || selectedAccountIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Configurar Fluxo de Caixa ({formatLabel})</DialogTitle>
          <DialogDescription className="text-xs">Selecione período, contas e modo de organização.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period */}
          <div className="space-y-1.5">
            <Label className="text-xs">Período</Label>
            <ReportsDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>

          {/* Accounts */}
          <div className="space-y-2">
            <Label className="text-xs">Contas a incluir</Label>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={allAccounts} onCheckedChange={handleAllAccountsChange} />
                Todas as contas
              </label>
              {bankAccounts.map(account => (
                <label key={account.id} className="flex items-center gap-2 text-xs cursor-pointer pl-2">
                  <Checkbox
                    checked={allAccounts || selectedAccountIds.includes(account.id)}
                    disabled={allAccounts}
                    onCheckedChange={() => toggleAccount(account.id)}
                  />
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color || "#10b981" }} />
                  <span>{account.bank_name ? `${account.bank_name} · ${account.name}` : account.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-1.5">
            <Label className="text-xs">Organização</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="space-y-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <RadioGroupItem value="consolidated" />
                Consolidado (sem segregação)
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <RadioGroupItem value="by_account" />
                Separado por banco
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
            {isGenerating && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Gerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
