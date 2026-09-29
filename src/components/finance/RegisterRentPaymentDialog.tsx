import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput, parseInputValue } from "@/components/ui/currency-input";
import { useToast } from "@/hooks/use-toast";
import { useBankAccounts } from "@/hooks/useFinanceData";
import { useSettleRentPayment, type DifferenceKind } from "@/hooks/useRentSettlement";
import { fetchSettlementGroup, settlementBreakdown, type SettlementLine } from "@/lib/settlement-group";
import { todayDateOnly } from "@/lib/date-only";
import { formatCurrencyBRL } from "@/utils/unitPricing";

export interface RentPaymentTransaction {
  id: string;
  type: string;
  amount: number;
  due_date?: string | null;
  settlement_group_id?: string | null;
  obligation_type?: string | null;
  description?: string | null;
  bank_account_id?: string | null;
  status?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: RentPaymentTransaction | null;
  onDone?: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const NO_ACCOUNT = "__none__";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function RegisterRentPaymentDialog({ open, onOpenChange, transaction, onDone }: Props) {
  const { toast } = useToast();
  const { data: accounts = [] } = useBankAccounts();
  const settle = useSettleRentPayment();
  const f = formatCurrencyBRL;

  const { data: lines, isLoading } = useQuery({
    queryKey: ["rent-payment-group", transaction?.id, transaction?.settlement_group_id ?? null],
    queryFn: async (): Promise<SettlementLine[]> =>
      transaction!.settlement_group_id
        ? fetchSettlementGroup(transaction!.settlement_group_id)
        : [transaction as SettlementLine],
    enabled: open && !!transaction,
  });

  const breakdown = useMemo(() => settlementBreakdown(lines || []), [lines]);
  const expected = breakdown.net;

  const [paidDate, setPaidDate] = useState(todayDateOnly());
  const [accountId, setAccountId] = useState<string>(NO_ACCOUNT);
  const [received, setReceived] = useState("");
  const [kind, setKind] = useState<DifferenceKind | "">("");
  const [futureConfirmed, setFutureConfirmed] = useState(false);
  const isFutureDate = !!paidDate && paidDate > todayDateOnly();
  const isBalance = transaction?.obligation_type === "rent_balance";
  useEffect(() => { setFutureConfirmed(false); }, [paidDate, open]);

  useEffect(() => {
    if (!open || !transaction) return;
    setPaidDate(todayDateOnly());
    setAccountId(transaction.bank_account_id || NO_ACCOUNT);
    setKind("");
  }, [open, transaction?.id]);

  useEffect(() => {
    if (open && lines) setReceived(String(expected));
  }, [open, lines, expected]);

  const receivedNum = round2(parseFloat(parseInputValue(received || "0")) || 0);
  const diff = round2(receivedNum - expected);
  const isLate = !!transaction?.due_date && paidDate > transaction.due_date;
  const defaultKind: DifferenceKind | "" = diff > 0 ? (isLate ? "late_fee" : "other_addition") : diff < 0 ? "partial" : "";
  const validKinds: DifferenceKind[] = diff > 0 ? ["late_fee", "other_addition"] : diff < 0 ? ["discount", "partial"] : [];
  const effectiveKind = kind && validKinds.includes(kind as DifferenceKind) ? (kind as DifferenceKind) : defaultKind;

  const handleConfirm = async () => {
    if (!transaction) return;
    if (isFutureDate && !futureConfirmed) {
      setFutureConfirmed(true);
      return;
    }
    if (!(receivedNum > 0)) {
      toast({ title: "Informe o valor recebido", variant: "destructive" });
      return;
    }
    try {
      const res = await settle.mutateAsync({
        transactionId: transaction.id,
        paidDate,
        received: receivedNum,
        differenceKind: diff !== 0 ? (effectiveKind as DifferenceKind) : null,
        bankAccountId: accountId === NO_ACCOUNT ? null : accountId,
      });
      const abs = f(Math.abs(Number(res?.difference ?? diff)));
      let description: string | undefined;
      if (res?.balance_id) description = `Saldo de ${abs} ficou em aberto no mesmo mês`;
      else if (res?.kind === "late_fee" || res?.kind === "other_addition") description = `Acréscimo de ${abs} lançado`;
      else if (res?.kind === "discount") description = `Desconto de ${abs} lançado`;
      else if (res?.group_id && (res?.paid_ids?.length || 0) > 1) description = `Baixa conjunta: ${res.paid_ids.length} lançamentos`;
      toast({ title: "Recebimento registrado", description });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast({ title: "Erro ao registrar recebimento", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Registrar recebimento</DialogTitle>
          <DialogDescription className="line-clamp-1">{transaction?.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rp-date">Data do pagamento</Label>
                  <Input id="rp-date" type="date" className="text-base sm:text-sm" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                  {isFutureDate && (
                    <p role="alert" className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1.5 text-xs text-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
                      A data do pagamento é futura. Confirme se o dinheiro já entrou.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Conta</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="text-base sm:text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ACCOUNT}>Sem conta</SelectItem>
                      {accounts.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rp-received">Valor recebido</Label>
                <CurrencyInput id="rp-received" className="text-base sm:text-sm" value={received} onChange={setReceived} />
              </div>

              <div className="rounded-md border bg-card p-3 space-y-1.5">
                <Row label={isBalance ? "Saldo em aberto" : "Aluguel bruto"} value={f(breakdown.rent)} />
                {breakdown.additions > 0 && <Row label="+ Multa/juros e acréscimos" value={f(breakdown.additions)} />}
                {breakdown.deductions > 0 && <Row label="− Abatimentos" value={f(breakdown.deductions)} />}
                {breakdown.irrf > 0 && <Row label="− IRRF retido" value={f(breakdown.irrf)} />}
                {breakdown.discounts > 0 && <Row label="− Descontos" value={f(breakdown.discounts)} />}
                {breakdown.otherExpenses > 0 && <Row label="− Outros" value={f(breakdown.otherExpenses)} />}
                <Separator className="my-1" />
                <Row label="Líquido esperado" value={f(expected)} strong />
              </div>

              {diff !== 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="text-sm">
                      Recebeu {diff > 0 ? "a mais" : "a menos"}: <span className="font-medium tabular-nums">{f(Math.abs(diff))}</span>
                    </p>
                    <RadioGroup value={effectiveKind} onValueChange={(v) => setKind(v as DifferenceKind)} className="gap-2">
                      {diff > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="late_fee" id="k-late" />
                            <Label htmlFor="k-late" className="font-normal">Multa/juros por atraso</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="other_addition" id="k-other" />
                            <Label htmlFor="k-other" className="font-normal">Outro acréscimo</Label>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="discount" id="k-disc" />
                            <Label htmlFor="k-disc" className="font-normal">Desconto concedido</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="partial" id="k-part" />
                            <Label htmlFor="k-part" className="font-normal">Pagamento parcial (o saldo fica em aberto)</Label>
                          </div>
                        </>
                      )}
                    </RadioGroup>
                  </AlertDescription>
                </Alert>
              )}

              <Row label="Líquido recebido" value={f(receivedNum)} strong />
            </>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isLoading || settle.isPending}>
            {settle.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isFutureDate && futureConfirmed ? "Confirmar mesmo assim" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
