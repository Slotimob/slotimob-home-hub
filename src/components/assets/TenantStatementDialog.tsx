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
import { FileText, Download, CheckCircle2, Clock, AlertCircle, Calendar, Loader2, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Lease } from "@/hooks/useLeases";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  generateTenantStatementPDF, TenantStatementData, PaymentHistoryItem, formatCurrency,
} from "@/utils/tenantStatementPdf";
import { useToast } from "@/hooks/use-toast";
import { fetchSettlementGroups } from "@/lib/settlement-group";
import { isRentIncome } from "@/lib/owner-report";
import { buildTenantStatementMonths } from "@/lib/tenant-statement";
import { todayInSaoPauloDateOnly } from "@/lib/date-only";

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

  const isWhole = periodMonths === "all";
  const periodDates = useMemo(() => {
    if (isWhole && lease.start_date) {
      return { start: parseDateOnly(lease.start_date.slice(0, 10)), end: endOfMonth(new Date()) };
    }
    const months = parseInt(periodMonths) || 6;
    return { start: startOfMonth(subMonths(new Date(), months - 1)), end: endOfMonth(new Date()) };
  }, [periodMonths, isWhole, lease.start_date]);
  // Regra: pagas pela data do pagamento; abertas pelo vencimento.
  // "Contrato inteiro" inclui os próximos vencimentos já lançados.
  const range = useMemo(
    () => ({
      start: format(periodDates.start, "yyyy-MM-dd"),
      end: isWhole ? "9999-12-31" : format(periodDates.end, "yyyy-MM-dd"),
    }),
    [periodDates, isWhole],
  );

  const { data: txData, isLoading } = useQuery({
    queryKey: ["lease-transactions", lease.id, range.start, range.end],
    queryFn: async () => {
      if (!user) return { rows: [] as any[], groups: {} as Record<string, any[]> };
      const base = () =>
        supabase
          .from("financial_transactions")
          .select("*")
          .or(`lease_id.eq.${lease.id},reference.like.lease:${lease.id}%`)
          .neq("status", "cancelled");
      const [byDue, byPaid] = await Promise.all([
        base().gte("due_date", range.start).lte("due_date", range.end).order("due_date", { ascending: true }),
        base().eq("status", "paid").gte("paid_date", range.start).lte("paid_date", range.end),
      ]);
      if (byDue.error) throw byDue.error;
      if (byPaid.error) throw byPaid.error;
      const map = new Map<string, any>();
      [...(byDue.data || []), ...(byPaid.data || [])].forEach((t: any) => map.set(t.id, t));
      const rows = Array.from(map.values()).sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
      const ids = rows
        .filter((t: any) => t.settlement_group_id && t.type === "income" && isRentIncome(t))
        .map((t: any) => t.settlement_group_id as string);
      const groups = ids.length ? await fetchSettlementGroups(ids) : {};
      return { rows, groups };
    },
    enabled: open && !!user,
  });

  const paymentHistory: PaymentHistoryItem[] = useMemo(() => {
    const periods: string[] = [];
    const endP = format(new Date(), "yyyy-MM");
    for (let d = startOfMonth(periodDates.start); format(d, "yyyy-MM") <= endP; d = startOfMonth(subMonths(d, -1))) {
      periods.push(format(d, "yyyy-MM"));
    }
    return buildTenantStatementMonths({
      periods,
      range,
      lease: lease as any,
      rows: txData?.rows || [],
      groups: txData?.groups || {},
      today: todayInSaoPauloDateOnly(),
    });
  }, [txData, periodDates, range, lease]);

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
      case "paid": return <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-400" />;
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "overdue": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "grace":
      case "not_launched": return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Pago</Badge>;
      case "pending": return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">Pendente</Badge>;
      case "overdue": return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30">Atrasado</Badge>;
      case "grace": return <Badge className="bg-sky-500/15 text-sky-600 border-sky-500/30">Carência</Badge>;
      case "not_launched": return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Não lançado</Badge>;
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
              {lease.start_date && <SelectItem value="all">Contrato inteiro</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-green-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(summary.totalPaid)}</p>
            <p className="text-xs text-muted-foreground">{summary.paidCount} parcelas</p>
          </div>
          <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{formatCurrency(summary.totalPending)}</p>
            <p className="text-xs text-muted-foreground">{summary.pendingCount} parcelas</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground">Atrasado</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-400">{formatCurrency(summary.totalOverdue)}</p>
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
                        {payment.status === "grace" || payment.status === "not_launched"
                          ? "—"
                          : payment.status === "paid" ? formatCurrency(payment.totalPaid) : formatCurrency(payment.amount)}
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
