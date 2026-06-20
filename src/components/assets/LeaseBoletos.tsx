import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ENV } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Copy, MoreHorizontal, Loader2, Receipt, AlertCircle, RefreshCw, Mail, XCircle, CalendarClock, TrendingUp, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  RECEIVED: { label: "Pago", variant: "default" },
  CONFIRMED: { label: "Confirmado", variant: "default" },
  OVERDUE: { label: "Vencido", variant: "destructive" },
  REFUNDED: { label: "Estornado", variant: "outline" },
  CANCELLED: { label: "Cancelado", variant: "outline" },
};

interface Props {
  leaseId: string;
  brokerId: string;
}

export function LeaseBoletos({ leaseId, brokerId }: Props) {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => { const { data } = await supabase.auth.getSession(); return data.session; },
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dueDateDialog, setDueDateDialog] = useState<{ id: string; current: string } | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [valueDialog, setValueDialog] = useState<{ id: string; current: number } | null>(null);
  const [newValue, setNewValue] = useState("");
  const queryClient = useQueryClient();

  const { data: boletos, isLoading, refetch } = useQuery({
    queryKey: ["lease-boletos", leaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asaas_payments")
        .select("id, asaas_payment_id, billing_type, value, due_date, status, bank_slip_url, pix_qr_code, pix_copy_paste, invoice_url, created_at")
        .eq("lease_id", leaseId)
        .eq("broker_id", brokerId)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!leaseId && !!brokerId,
  });

  async function handleAction(
    paymentId: string,
    action: "get_slip_url" | "send_email" | "cancel" | "update_due_date" | "update_value",
    extra: Record<string, any> = {}
  ) {
    if (action === "cancel" && !window.confirm("Cancelar esta cobrança no Asaas? Ação irreversível.")) return;
    setActionLoading(`${paymentId}-${action}`);
    try {
      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/asaas-payment-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: ENV.SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ payment_id: paymentId, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      if (action === "get_slip_url" && data.bank_slip_url) window.open(data.bank_slip_url, "_blank");
      else if (action === "send_email") toast.success("E-mail enviado!");
      else if (action === "cancel") { toast.success("Cobrança cancelada."); refetch(); }
      else if (action === "update_due_date") { toast.success("Vencimento atualizado."); refetch(); }
      else if (action === "update_value") { toast.success("Valor atualizado."); refetch(); }
    } catch (err) {
      toast.error("Erro", { description: (err as Error).message });
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!boletos || boletos.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
        <p className="text-sm font-medium text-muted-foreground">Nenhuma cobrança gerada</p>
        <p className="text-xs text-muted-foreground mt-1">Ative a cobrança automática na aba Cobrança</p>
      </div>
    );
  }

  const pending = boletos.filter(b => b.status === "PENDING").reduce((s, b) => s + Number(b.value), 0);
  const paid = boletos.filter(b => ["RECEIVED","CONFIRMED"].includes(b.status as string)).reduce((s, b) => s + Number(b.value), 0);
  const overdue = boletos.filter(b => b.status === "OVERDUE").reduce((s, b) => s + Number(b.value), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendente", value: pending, cls: "text-yellow-600" },
          { label: "Recebido", value: paid, cls: "text-green-600" },
          { label: "Vencido", value: overdue, cls: "text-red-600" },
        ].map(c => (
          <div key={c.label} className="border rounded-lg p-3 bg-card">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={cn("text-base font-semibold mt-0.5", c.cls)}>
              {c.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boletos.map(b => {
              const st = STATUS_MAP[b.status || ""] || { label: b.status || "—", variant: "outline" as const };
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {b.billing_type === "BOLETO" ? "Boleto" : "PIX"}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {Number(b.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.due_date ? format(new Date(b.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAction(b.id, "get_slip_url")}>
                          <RefreshCw className="mr-2 h-4 w-4" />Reemitir boleto
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(b.id, "send_email")}>
                          <Mail className="mr-2 h-4 w-4" />Enviar por e-mail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setNewDueDate(b.due_date || ""); setDueDateDialog({ id: b.id, current: b.due_date || "" }); }}>
                          <CalendarClock className="mr-2 h-4 w-4" />Alterar vencimento
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setNewValue(String(b.value ?? "")); setValueDialog({ id: b.id, current: Number(b.value) }); }}>
                          <TrendingUp className="mr-2 h-4 w-4" />Reajustar valor
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleAction(b.id, "cancel")}>
                          <XCircle className="mr-2 h-4 w-4" />Cancelar cobrança
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {b.bank_slip_url && (
                          <DropdownMenuItem onClick={() => window.open(b.bank_slip_url!, "_blank")}>
                            <ExternalLink className="mr-2 h-4 w-4" />Ver boleto
                          </DropdownMenuItem>
                        )}
                        {b.invoice_url && (
                          <DropdownMenuItem onClick={() => window.open(b.invoice_url!, "_blank")}>
                            <FileText className="mr-2 h-4 w-4" />Ver fatura Asaas
                          </DropdownMenuItem>
                        )}
                        {b.pix_copy_paste && (
                          <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(b.pix_copy_paste!); toast.success("Código PIX copiado!"); }}>
                            <Copy className="mr-2 h-4 w-4" />Copiar código PIX
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Alterar vencimento */}
      <Dialog open={!!dueDateDialog} onOpenChange={open => !open && setDueDateDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar vencimento</DialogTitle><DialogDescription>Nova data de vencimento no Asaas.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nova data</Label>
            <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDueDateDialog(null)}>Cancelar</Button>
            <Button onClick={async () => { await handleAction(dueDateDialog!.id, "update_due_date", { new_due_date: newDueDate }); setDueDateDialog(null); }} disabled={!newDueDate}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reajustar valor */}
      <Dialog open={!!valueDialog} onOpenChange={open => !open && setValueDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reajustar valor</DialogTitle><DialogDescription>Novo valor em R$.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Novo valor</Label>
            <Input type="number" step="0.01" min="0" value={newValue} onChange={e => setNewValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialog(null)}>Cancelar</Button>
            <Button onClick={async () => { const v = parseFloat(newValue.replace(",",".")); if (isNaN(v) || v <= 0) { toast.error("Valor inválido"); return; } await handleAction(valueDialog!.id, "update_value", { new_value: v }); setValueDialog(null); }} disabled={!newValue}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
