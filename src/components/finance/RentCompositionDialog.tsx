import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput, parseInputValue } from "@/components/ui/currency-input";
import { useToast } from "@/hooks/use-toast";
import { useSetRentComposition } from "@/hooks/useRentSettlement";
import {
  fetchSettlementGroup,
  settlementAnchor,
  compositionKindOf,
  type CompositionKind,
  type SettlementLine,
} from "@/lib/settlement-group";
import { formatCurrencyBRL } from "@/utils/unitPricing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
  onDone?: () => void;
}

const KIND_LABELS: Record<CompositionKind, string> = {
  deduction: "Abatimento",
  irrf: "IRRF retido",
  late_fee: "Multa/juros",
  other_addition: "Outro acréscimo",
  discount: "Desconto concedido",
};
const ADDS: CompositionKind[] = ["late_fee", "other_addition"];

interface EditLine {
  key: string;
  id: string | null;
  kind: CompositionKind;
  description: string;
  amount: string;
}

const SELECT = "id, type, amount, obligation_type, status, bank_account_id, settlement_group_id, description, is_reconciled, metadata";
const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: string) => round2(parseFloat(parseInputValue(v || "0")) || 0);
const isRent = (l: any) => l.type === "income" && (!l.obligation_type || ["rent", "rent_balance"].includes(l.obligation_type));

export function RentCompositionDialog({ open, onOpenChange, transactionId, onDone }: Props) {
  const { toast } = useToast();
  const save = useSetRentComposition();
  const f = formatCurrencyBRL;

  const { data, isLoading } = useQuery({
    queryKey: ["rent-composition", transactionId],
    enabled: open && !!transactionId,
    queryFn: async () => {
      const { data: tx, error } = await supabase.from("financial_transactions").select(SELECT).eq("id", transactionId!).maybeSingle();
      if (error) throw error;
      if (!tx) return { lines: [] as any[], anchor: null as any };
      let lines: any[] = [tx];
      if ((tx as any).settlement_group_id) {
        const { data: g, error: ge } = await supabase
          .from("financial_transactions")
          .select(SELECT)
          .eq("settlement_group_id", (tx as any).settlement_group_id)
          .neq("status", "cancelled");
        if (ge) throw ge;
        lines = g || [tx];
      }
      const anchor = (tx as any).settlement_group_id ? settlementAnchor(lines as SettlementLine[]) : isRent(tx) ? tx : null;
      return { lines, anchor: anchor && isRent(anchor) ? anchor : null };
    },
  });

  const [rent, setRent] = useState("");
  const [items, setItems] = useState<EditLine[]>([]);

  useEffect(() => {
    if (!open || !data?.anchor) return;
    setRent(String(data.anchor.amount));
    setItems(
      data.lines
        .filter((l: any) => l.id !== data.anchor.id)
        .map((l: any) => ({ l, k: compositionKindOf(l) }))
        .filter((x: any) => x.k)
        .map(({ l, k }: any) => ({ key: l.id, id: l.id, kind: k, description: l.description || "", amount: String(l.amount) })),
    );
  }, [open, data]);

  const net = useMemo(
    () => round2(items.reduce((s, i) => s + (ADDS.includes(i.kind) ? 1 : -1) * num(i.amount), num(rent))),
    [items, rent],
  );
  const reconciled = (data?.lines || []).some((l: any) => l.is_reconciled);
  const paid = data?.anchor?.status === "paid";

  const error = useMemo(() => {
    if (!(num(rent) > 0)) return "O aluguel bruto precisa ser maior que 0.";
    if (items.some((i) => !(num(i.amount) > 0))) return "Todos os valores precisam ser maiores que 0.";
    const counts: Record<string, number> = {};
    items.forEach((i) => (counts[i.kind] = (counts[i.kind] || 0) + 1));
    const dup = (Object.keys(counts) as CompositionKind[]).find((k) => k !== "deduction" && counts[k] > 1);
    if (dup) return `Só pode haver uma linha de ${KIND_LABELS[dup]}.`;
    if (net < 0) return "O líquido do mês não pode ficar negativo.";
    return null;
  }, [items, rent, net]);

  const add = (kind: CompositionKind) =>
    setItems((prev) => [...prev, { key: crypto.randomUUID(), id: null, kind, description: "", amount: "" }]);
  const update = (key: string, patch: Partial<EditLine>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const handleSave = async () => {
    if (!data?.anchor || error) return;
    try {
      const res = await save.mutateAsync({
        anchorId: data.anchor.id,
        rentAmount: num(rent),
        lines: items.map((i) => ({ id: i.id, kind: i.kind, amount: num(i.amount), description: i.description.trim() || null })),
      });
      toast({
        title: "Composição salva",
        description: res?.unreconciled ? "A conciliação foi desfeita porque o líquido mudou" : undefined,
      });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast({ title: "Erro ao salvar composição", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Composição do aluguel</DialogTitle>
          <DialogDescription>Aluguel bruto e as linhas do mês (abatimentos, IRRF, multa, descontos).</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !data?.anchor ? (
            <p className="text-sm text-muted-foreground py-4">Este lançamento não é de aluguel.</p>
          ) : (
            <>
              {reconciled && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Este mês já está conciliado. Se o líquido mudar, a conciliação é desfeita e você concilia de novo.
                  </AlertDescription>
                </Alert>
              )}
              {paid && (
                <Alert>
                  <AlertDescription className="text-xs">As linhas novas entram como pagas na mesma data.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="rc-rent">Aluguel bruto</Label>
                <CurrencyInput id="rc-rent" className="text-base sm:text-sm" value={rent} onChange={setRent} />
                {(() => {
                  const md = (data?.anchor?.metadata || {}) as Record<string, any>;
                  const gross = Number(md.gross_amount) || 0;
                  const monthValue = Number(md.original_amount) || Number(data?.anchor?.amount) || 0;
                  if (!(gross > monthValue + 0.004)) return null;
                  const pct = Math.round((1 - monthValue / gross) * 100);
                  return (
                    <p className="text-xs text-muted-foreground">
                      Contratual {f(gross)} − carência {pct}% = {f(monthValue)}
                    </p>
                  );
                })()}
              </div>

              <div className="space-y-2">
                {items.map((i) => (
                  <div key={i.key} className="rounded-md border bg-card p-2 grid grid-cols-1 sm:grid-cols-[150px_1fr_120px_auto] gap-2 items-center">
                    <Select value={i.kind} onValueChange={(v) => update(i.key, { kind: v as CompositionKind })}>
                      <SelectTrigger className="text-base sm:text-sm" aria-label="Tipo"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(KIND_LABELS) as CompositionKind[]).map((k) => (
                          <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="text-base sm:text-sm"
                      placeholder="Descrição"
                      aria-label="Descrição"
                      value={i.description}
                      onChange={(e) => update(i.key, { description: e.target.value })}
                    />
                    <CurrencyInput
                      className="text-base sm:text-sm"
                      aria-label="Valor"
                      value={i.amount}
                      onChange={(v) => update(i.key, { amount: v })}
                    />
                    <Button type="button" variant="ghost" size="icon" aria-label="Remover linha" onClick={() => setItems((p) => p.filter((x) => x.key !== i.key))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => add("deduction")}><Plus className="h-3.5 w-3.5 mr-1" />Abatimento</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => add("irrf")}><Plus className="h-3.5 w-3.5 mr-1" />IRRF</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => add("late_fee")}><Plus className="h-3.5 w-3.5 mr-1" />Multa/juros</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => add("discount")}><Plus className="h-3.5 w-3.5 mr-1" />Desconto</Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 gap-2 sm:items-center">
          {data?.anchor && (
            <div className="flex-1 text-sm">
              <span className="font-semibold tabular-nums">Líquido do mês: {f(net)}</span>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!data?.anchor || !!error || save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
