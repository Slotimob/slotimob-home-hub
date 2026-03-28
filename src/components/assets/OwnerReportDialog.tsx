import { useState, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp, TrendingDown, Download, Calendar, Building2, Wrench, Receipt, Banknote, Loader2,
} from "lucide-react";
import { Lease } from "@/hooks/useLeases";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { generateOwnerReportPDF, OwnerReportData, formatCurrency } from "@/utils/leaseReportGenerator";
import { useToast } from "@/hooks/use-toast";

interface OwnerReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: Lease;
}

export function OwnerReportDialog({ open, onOpenChange, lease }: OwnerReportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [periodMonths, setPeriodMonths] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);

  const periodDates = useMemo(() => {
    const months = parseInt(periodMonths);
    if (months === 1) {
      return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
    }
    return { start: startOfMonth(subMonths(new Date(), months - 1)), end: endOfMonth(new Date()) };
  }, [periodMonths]);

  const { data: incomeTransactions = [], isLoading: loadingIncome } = useQuery({
    queryKey: ["owner-report-income", lease.unit_id, periodDates.start, periodDates.end],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("unit_id", lease.unit_id)
        .eq("type", "income")
        .eq("status", "paid")
        .gte("paid_date", format(periodDates.start, "yyyy-MM-dd"))
        .lte("paid_date", format(periodDates.end, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!user,
  });

  const { data: expenseTransactions = [], isLoading: loadingExpense } = useQuery({
    queryKey: ["owner-report-expenses", lease.unit_id, periodDates.start, periodDates.end],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("unit_id", lease.unit_id)
        .eq("type", "expense")
        .eq("status", "paid")
        .gte("paid_date", format(periodDates.start, "yyyy-MM-dd"))
        .lte("paid_date", format(periodDates.end, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!user,
  });

  const isLoading = loadingIncome || loadingExpense;

  const reportData = useMemo(() => {
    const rentReceived = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const adminFee = rentReceived * (lease.admin_fee_percentage / 100);
    const maintenanceExpenses = expenseTransactions
      .filter((t) => t.obligation_type === "maintenance" || t.description.toLowerCase().includes("manutenção"))
      .map((t) => ({ description: t.description, amount: Number(t.amount), date: t.paid_date || t.transaction_date }));
    const otherDeductions = expenseTransactions
      .filter((t) => t.obligation_type !== "maintenance" && !t.description.toLowerCase().includes("manutenção"))
      .map((t) => ({ description: t.description, amount: Number(t.amount) }));
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const netTransfer = rentReceived - adminFee - totalExpenses;
    return { rentReceived, adminFee, maintenanceExpenses, otherDeductions, totalExpenses, netTransfer };
  }, [incomeTransactions, expenseTransactions, lease.admin_fee_percentage]);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const data: OwnerReportData = {
        lease,
        period: { start: format(periodDates.start, "dd/MM/yyyy"), end: format(periodDates.end, "dd/MM/yyyy") },
        rentReceived: reportData.rentReceived,
        adminFee: reportData.adminFee,
        maintenanceExpenses: reportData.maintenanceExpenses,
        otherDeductions: reportData.otherDeductions,
        netTransfer: reportData.netTransfer,
      };
      generateOwnerReportPDF(data);
      toast({ title: "PDF gerado com sucesso!" });
    } finally {
      setIsGenerating(false);
    }
  };

  const periodLabel = `${format(periodDates.start, "dd/MM/yyyy")} a ${format(periodDates.end, "dd/MM/yyyy")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-500" />
            Relatório do Proprietário
          </DialogTitle>
          <DialogDescription>
            {lease.unit?.unit_number} - {lease.unit?.property?.name || "Imóvel Avulso"}
          </DialogDescription>
        </DialogHeader>

        {/* Period Selector */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label>Período:</Label>
          </div>
          <Select value={periodMonths} onValueChange={setPeriodMonths}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Mês Atual</SelectItem>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>

        <Separator />

        <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Income */}
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    Receitas
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Aluguel Recebido</span>
                    <span className="font-semibold text-green-600">{formatCurrency(reportData.rentReceived)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Deductions */}
              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
                    <TrendingDown className="h-4 w-4" />
                    Deduções
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">Taxa de Administração ({lease.admin_fee_percentage}%)</span>
                    </div>
                    <span className="font-medium text-red-600">-{formatCurrency(reportData.adminFee)}</span>
                  </div>
                  {reportData.maintenanceExpenses.map((expense, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[200px]">{expense.description}</span>
                      </div>
                      <span className="font-medium text-red-600">-{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                  {reportData.otherDeductions.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[200px]">{d.description}</span>
                      <span className="font-medium text-red-600">-{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                  {reportData.maintenanceExpenses.length === 0 && reportData.otherDeductions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhuma despesa no período</p>
                  )}
                </CardContent>
              </Card>

              {/* Net Transfer */}
              <Card className="border-emerald-500/50 bg-emerald-500/10">
                <CardContent className="py-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-600">Repasse Líquido</span>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">{formatCurrency(reportData.netTransfer)}</span>
                  </div>
                </CardContent>
              </Card>

              {lease.is_dimob_deductible && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>DIMOB:</strong> Imóvel dedutível para declaração DIMOB.
                    {lease.cib && <span className="ml-1">CIB: {lease.cib}</span>}
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
