import { useState, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Building2,
  Wrench,
  Receipt,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Lease } from "@/hooks/useLeases";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  generateOwnerReportPDF,
  OwnerReportData,
  formatCurrency,
} from "@/utils/leaseReportGenerator";
import { useToast } from "@/hooks/use-toast";

interface OwnerReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: Lease;
}

export function OwnerReportDialog({
  open,
  onOpenChange,
  lease,
}: OwnerReportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [periodMonths, setPeriodMonths] = useState("1");
  
  // Calculate period dates
  const periodDates = useMemo(() => {
    const months = parseInt(periodMonths);
    if (months === 1) {
      // Current month
      const now = new Date();
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    }
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(new Date(), months - 1));
    return { start, end };
  }, [periodMonths]);
  
  // Fetch income transactions (rent received)
  const { data: incomeTransactions = [] } = useQuery({
    queryKey: ["owner-report-income", lease.unit_id, periodDates.start, periodDates.end],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("broker_id", user.id)
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
  
  // Fetch expense transactions (maintenance, etc.)
  const { data: expenseTransactions = [] } = useQuery({
    queryKey: ["owner-report-expenses", lease.unit_id, periodDates.start, periodDates.end],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("broker_id", user.id)
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
  
  // Calculate report data
  const reportData = useMemo(() => {
    // Total rent received
    const rentReceived = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Admin fee calculation
    const adminFee = rentReceived * (lease.admin_fee_percentage / 100);
    
    // Maintenance expenses
    const maintenanceExpenses = expenseTransactions
      .filter((t) => t.obligation_type === "maintenance" || t.description.toLowerCase().includes("manutenção"))
      .map((t) => ({
        description: t.description,
        amount: Number(t.amount),
        date: t.paid_date || t.transaction_date,
      }));
    
    // Other deductions (non-maintenance expenses)
    const otherDeductions = expenseTransactions
      .filter((t) => t.obligation_type !== "maintenance" && !t.description.toLowerCase().includes("manutenção"))
      .map((t) => ({
        description: t.description,
        amount: Number(t.amount),
      }));
    
    // Calculate net transfer
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const netTransfer = rentReceived - adminFee - totalExpenses;
    
    return {
      rentReceived,
      adminFee,
      maintenanceExpenses,
      otherDeductions,
      totalExpenses,
      netTransfer,
    };
  }, [incomeTransactions, expenseTransactions, lease.admin_fee_percentage]);
  
  const handleGeneratePDF = () => {
    const data: OwnerReportData = {
      lease,
      period: {
        start: format(periodDates.start, "dd/MM/yyyy"),
        end: format(periodDates.end, "dd/MM/yyyy"),
      },
      rentReceived: reportData.rentReceived,
      adminFee: reportData.adminFee,
      maintenanceExpenses: reportData.maintenanceExpenses,
      otherDeductions: reportData.otherDeductions,
      netTransfer: reportData.netTransfer,
    };
    
    generateOwnerReportPDF(data);
    toast({ title: "PDF gerado com sucesso!" });
  };
  
  const periodLabel = useMemo(() => {
    return `${format(periodDates.start, "dd/MM/yyyy")} a ${format(periodDates.end, "dd/MM/yyyy")}`;
  }, [periodDates]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
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
            <SelectTrigger className="w-[180px]">
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
        
        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="space-y-4">
            {/* Income Section */}
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
                  <span className="font-semibold text-green-600">
                    {formatCurrency(reportData.rentReceived)}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            {/* Deductions Section */}
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  Deduções
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4 space-y-3">
                {/* Admin Fee */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Taxa de Administração ({lease.admin_fee_percentage}%)</span>
                  </div>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(reportData.adminFee)}
                  </span>
                </div>
                
                {/* Maintenance */}
                {reportData.maintenanceExpenses.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{expense.description}</span>
                    </div>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(expense.amount)}
                    </span>
                  </div>
                ))}
                
                {/* Other Deductions */}
                {reportData.otherDeductions.map((deduction, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{deduction.description}</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(deduction.amount)}
                    </span>
                  </div>
                ))}
                
                {reportData.maintenanceExpenses.length === 0 && reportData.otherDeductions.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Nenhuma despesa de manutenção no período
                  </p>
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
                  <span className="text-xl font-bold text-emerald-600">
                    {formatCurrency(reportData.netTransfer)}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            {/* DIMOB Info */}
            {lease.is_dimob_deductible && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>DIMOB:</strong> Este imóvel está marcado como dedutível para declaração DIMOB.
                  {lease.cib && <span className="ml-1">CIB: {lease.cib}</span>}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleGeneratePDF} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
