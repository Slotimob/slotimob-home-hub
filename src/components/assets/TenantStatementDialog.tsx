import { useState, useMemo } from "react";
import { formatDateOnly, parseDateOnly } from "@/lib/date-only";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Download, CheckCircle2, Clock, AlertCircle, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Lease } from "@/hooks/useLeases";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  generateTenantStatementPDF, TenantStatementData, PaymentHistoryItem, formatCurrency,
} from "@/utils/tenantStatementPdf";
import { useToast } from "@/hooks/use-toast";
import { fetchSettlementGroups, settlementBreakdown } from "@/lib/settlement-group";
import { isRentIncome, isRentAddition, isIrrf, isRentDeduction, isRentDiscount } from "@/lib/owner-report";

interface TenantStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: Lease;
}

export function TenantStatementDialog({ open, onOpenChange, lease }: TenantStatementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [periodMonths, setPeriodMonths] = useState("6");
  const [isGenerating, setIsGenerating] = useState(false);

  const periodDates = useMemo(() => {
    const months = parseInt(periodMonths);
    return { start: startOfMonth(subMonths(new Date(), months - 1)), end: endOfMonth(new Date()) };
  }, [periodMonths]);

  const { data: txData, isLoading } = useQuery({
    queryKey: ["lease-transactions", lease.id, periodDates.start, periodDates.end],
    queryFn: async () => {
      if (!user) return { rows: [] as any[], groups: {} as Record<string, any[]> };
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .or(`lease_id.eq.${lease.id},reference.like.lease:${lease.id}%`)
        .neq("status", "cancelled")
        .gte("due_date", format(periodDates.start, "yyyy-MM-dd"))
        .lte("due_date", format(periodDates.end, "yyyy-MM-dd"))
        .order("due_date", { ascending: true });
      if (error) throw error;
      const rows = data || [];
      const ids = rows
        .filter((t: any) => t.settlement_group_id && t.type === "income" && isRentIncome(t))
        .map((t: any) => t.settlement_group_id as string);
      const groups = ids.length ? await fetchSettlementGroups(ids) : {};
      return { rows, groups };
    },
    enabled: open && !!user,
  });

  const paymentHistory: PaymentHistoryItem[] = useMemo(() => {
    const items: PaymentHistoryItem[] = [];
    const months = parseInt(periodMonths);
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStr = format(monthDate, "MMMM/yyyy", { locale: ptBR });
      const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), lease.due_day);
      const period = format(monthDate, "yyyy-MM");
      const rows = (txData?.rows || []).filter(
        (t: any) => (t.competency_period || (t.due_date || "").slice(0, 7)) === period
      );
      const groups = txData?.groups || {};
      const rentLines = rows.filter((t: any) => t.type === "income" && isRentIncome(t));
      // Soma do mês: grupos de baixa conjunta pelo breakdown; linhas soltas pelo tipo.
      let gross = 0, additions = 0, irrf = 0, deductions = 0, discounts = 0, other = 0, paidNet = 0;
      const seen = new Set<string>();
      for (const a of rentLines) {
        const gid = a.settlement_group_id;
        if (!gid || !groups[gid] || groups[gid].length < 2 || seen.has(gid)) continue;
        seen.add(gid);
        const b = settlementBreakdown(groups[gid] as any);
        gross += b.rent; additions += b.additions; irrf += b.irrf;
        deductions += b.deductions; discounts += b.discounts; other += b.otherExpenses;
        if (a.status === "paid") paidNet += b.net;
      }
      for (const t of rows) {
        if (t.settlement_group_id && seen.has(t.settlement_group_id)) continue;
        const v = Number(t.amount) || 0;
        let signed = 0;
        if (t.type === "income" && isRentIncome(t)) { gross += v; signed = v; }
        else if (t.type === "income" && isRentAddition(t)) { additions += v; signed = v; }
        else if (t.type === "expense" && isIrrf(t)) { irrf += v; signed = -v; }
        else if (t.type === "expense" && isRentDeduction(t)) { deductions += v; signed = -v; }
        else if (t.type === "expense" && isRentDiscount(t)) { discounts += v; signed = -v; }
        if (signed && t.status === "paid") paidNet += signed;
      }
      const net = gross + additions - irrf - deductions - discounts - other;
      const hasLines = rentLines.length > 0;
      const isPaid = hasLines && rentLines.every((t: any) => t.status === "paid");
      const isOverdue = !isPaid && dueDate < new Date();
      const paidDate = isPaid
        ? rentLines.map((t: any) => t.paid_date).filter(Boolean).sort().pop() || null
        : null;
      const parts: string[] = [];
      if (hasLines && (additions || irrf || deductions || discounts || other)) {
        parts.push(`bruto ${formatCurrency(gross)}`);
        if (additions) parts.push(`+ acréscimos ${formatCurrency(additions)}`);
        if (irrf) parts.push(`− IRRF ${formatCurrency(irrf)}`);
        if (deductions) parts.push(`− abatimento ${formatCurrency(deductions)}`);
        if (discounts) parts.push(`− desconto ${formatCurrency(discounts)}`);
        if (other) parts.push(`− outras ${formatCurrency(other)}`);
      }
      items.push({
        month: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
        reference: format(monthDate, "MM/yyyy"),
        dueDate: format(dueDate, "yyyy-MM-dd"),
        paidDate,
        amount: hasLines ? Math.round(net * 100) / 100 : lease.rent_amount,
        lateFee: Math.round(additions * 100) / 100,
        totalPaid: Math.round(paidNet * 100) / 100,
        status: isPaid ? "paid" : isOverdue ? "overdue" : "pending",
        breakdown: parts.length ? parts.join(" ") : undefined,
      });
    }
    return items;
  }, [txData, periodMonths, lease]);

  const summary = useMemo(() => {
    const paid = paymentHistory.filter((p) => p.status === "paid");
    const pending = paymentHistory.filter((p) => p.status === "pending");
    const overdue = paymentHistory.filter((p) => p.status === "overdue");
    return {
      totalPaid: paid.reduce((s, p) => s + p.totalPaid, 0),
      totalPending: pending.reduce((s, p) => s + p.amount, 0),
      totalOverdue: overdue.reduce((s, p) => s + p.amount, 0),
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
    };
  }, [paymentHistory]);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const data: TenantStatementData = {
        lease,
        payments: paymentHistory,
        period: { start: format(periodDates.start, "dd/MM/yyyy"), end: format(periodDates.end, "dd/MM/yyyy") },
      };
      generateTenantStatementPDF(data);
      toast({ title: "PDF gerado com sucesso!" });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "overdue": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Pago</Badge>;
      case "pending": return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30">Pendente</Badge>;
      case "overdue": return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Atrasado</Badge>;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Extrato do Inquilino
          </DialogTitle>
          <DialogDescription>
            {lease.tenant?.name} - {lease.unit?.unit_number}
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
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-green-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
            <p className="text-xs text-muted-foreground">{summary.paidCount} parcelas</p>
          </div>
          <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-lg font-bold text-yellow-600">{formatCurrency(summary.totalPending)}</p>
            <p className="text-xs text-muted-foreground">{summary.pendingCount} parcelas</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Atrasado</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalOverdue)}</p>
            <p className="text-xs text-muted-foreground">{summary.overdueCount} parcelas</p>
          </div>
        </div>

        <Separator />

        {/* Payment History */}
        <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(90vh - 340px)' }}>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando histórico...</span>
              </div>
            ) : (
              paymentHistory.map((payment, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    payment.status === "paid" && "bg-green-500/5 border-green-500/20",
                    payment.status === "pending" && "bg-yellow-500/5 border-yellow-500/20",
                    payment.status === "overdue" && "bg-red-500/5 border-red-500/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(payment.status)}
                    <div>
                      <p className="font-medium text-sm">{payment.month}</p>
                      <p className="text-xs text-muted-foreground">
                        Venc: {formatDateOnly(payment.dueDate, "dd/MM/yyyy")}
                        {payment.paidDate && ` • Pago: ${formatDateOnly(payment.paidDate, "dd/MM/yyyy")}`}
                      </p>
                      {payment.breakdown && (
                        <p className="text-[10px] text-muted-foreground">{payment.breakdown}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {payment.status === "paid" ? formatCurrency(payment.totalPaid) : formatCurrency(payment.amount)}
                      </p>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="glow-primary"
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
