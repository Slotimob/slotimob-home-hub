import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ENV } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Copy, MoreHorizontal, Loader2, Receipt, RefreshCw, Mail, XCircle, CalendarClock, TrendingUp, FileText, Zap, CheckCircle2, PowerOff, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; cls?: string }> = {
  PENDING: { label: "Pendente", variant: "outline", cls: "border-yellow-500/40 text-yellow-700 bg-yellow-500/10" },
  RECEIVED: { label: "Pago", variant: "outline", cls: "border-green-500/40 text-green-700 bg-green-500/10" },
  CONFIRMED: { label: "Confirmado", variant: "outline", cls: "border-green-500/40 text-green-700 bg-green-500/10" },
  OVERDUE: { label: "Vencido", variant: "outline", cls: "border-red-500/40 text-red-700 bg-red-500/10" },
  REFUNDED: { label: "Estornado", variant: "outline" },
  CANCELLED: { label: "Cancelado", variant: "outline", cls: "border-muted text-muted-foreground bg-muted/40" },
};

interface Props {
  leaseId: string;
  brokerId: string;
}

function brl(v: number | string | null | undefined) {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function LeaseBoletos({ leaseId, brokerId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dueDateDialog, setDueDateDialog] = useState<{ id: string; current: string } | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [valueDialog, setValueDialog] = useState<{ id: string; current: number } | null>(null);
  const [newValue, setNewValue] = useState("");
  const [activateOpen, setActivateOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => { const { data } = await supabase.auth.getSession(); return data.session; },
  });

  const { data: charge, isLoading: loadingCharge, refetch: refetchCharge } = useQuery({
    queryKey: ["contract-charge", leaseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contract_charges")
        .select("*")
        .eq("lease_id", leaseId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!leaseId,
  });

  const { data: lease } = useQuery({
    queryKey: ["lease-amount", leaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("rent_amount, due_day")
        .eq("id", leaseId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!leaseId,
  });

  const isActivated = !!charge?.asaas_subscription_id;

  const { data: boletos, isLoading: loadingBoletos, refetch: refetchBoletos } = useQuery({
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
    enabled: !!leaseId && !!brokerId && isActivated,
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
      else if (action === "cancel") { toast.success("Cobrança cancelada."); refetchBoletos(); }
      else if (action === "update_due_date") { toast.success("Vencimento atualizado."); refetchBoletos(); }
      else if (action === "update_value") { toast.success("Valor atualizado."); refetchBoletos(); }
    } catch (err) {
      toast.error("Erro", { description: (err as Error).message });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleActivate() {
    setActivating(true);
    try {
      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/create-asaas-charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: ENV.SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ lease_id: leaseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao ativar cobrança");
      toast.success("✓ Cobrança ativada com sucesso");
      setActivateOpen(false);
      await Promise.all([refetchCharge(), refetchBoletos()]);
      queryClient.invalidateQueries({ queryKey: ["lease-boletos", leaseId] });
    } catch (err) {
      toast.error("Erro ao ativar cobrança", { description: (err as Error).message });
    } finally {
      setActivating(false);
    }
  }

  if (loadingCharge) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Estado D — Sem configuração
  if (!charge) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhuma configuração de cobrança encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">Configure a cobrança automática na edição do contrato.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(`/gestao/contratos/novo?edit=${leaseId}&step=billing`)}>
            Configurar cobrança
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado C — Cobrança desativada
  if (charge.is_active === false) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="inline-flex">
            <Badge variant="outline" className="border-muted text-muted-foreground bg-muted/40 gap-1">
              <PowerOff className="h-3 w-3" /> Cobrança desativada
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">A cobrança automática está desativada para este contrato.</p>
          <Button variant="outline" size="sm" onClick={() => navigate(`/gestao/contratos/novo?edit=${leaseId}&step=billing`)}>
            Editar configurações de cobrança
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado A — Cobrança não ativada (configurada mas sem subscription)
  if (charge.is_active && !charge.asaas_subscription_id) {
    return (
      <>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Resumo da cobrança pré-configurada
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <Field label="Tipo" value={charge.billing_type === "BOLETO" ? "Boleto" : charge.billing_type === "PIX" ? "PIX" : charge.billing_type === "CREDIT_CARD" ? "Cartão" : charge.billing_type || "—"} />
              <Field label="Dia de vencimento" value={lease?.due_day ? `Todo dia ${lease.due_day}` : "—"} />
              <Field label="Valor do aluguel" value={brl(lease?.rent_amount)} />
              <Field label="Multa" value={`${charge.fine_percentage ?? 0}%`} />
              <Field label="Juros (mês)" value={`${charge.interest_percentage ?? 0}%`} />
              <Field label="Desconto" value={charge.discount_value ? `${brl(charge.discount_value)} • ${charge.discount_days ?? 0}d` : "—"} />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Ao ativar, o Asaas passará a gerar os boletos automaticamente a cada vencimento.</span>
            </div>
            <Button className="w-full" onClick={() => setActivateOpen(true)}>
              <Zap className="h-4 w-4 mr-2" /> Ativar cobrança automática
            </Button>
          </CardContent>
        </Card>

        <Dialog open={activateOpen} onOpenChange={(o) => !activating && setActivateOpen(o)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar ativação da cobrança</DialogTitle>
              <DialogDescription>
                Será criada uma assinatura no Asaas com os dados abaixo. Os boletos passarão a ser gerados automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-xs py-2">
              <Field label="Tipo" value={charge.billing_type || "—"} />
              <Field label="Dia de vencimento" value={lease?.due_day ? `Todo dia ${lease.due_day}` : "—"} />
              <Field label="Valor" value={brl(lease?.rent_amount)} />
              <Field label="Multa / Juros" value={`${charge.fine_percentage ?? 0}% / ${charge.interest_percentage ?? 0}%`} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivateOpen(false)} disabled={activating}>Cancelar</Button>
              <Button onClick={handleActivate} disabled={activating}>
                {activating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ativando...</> : "Confirmar e ativar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Estado B — Cobrança ativa
  const pending = (boletos || []).filter(b => b.status === "PENDING").reduce((s, b) => s + Number(b.value), 0);
  const paid = (boletos || []).filter(b => ["RECEIVED","CONFIRMED"].includes(b.status as string)).reduce((s, b) => s + Number(b.value), 0);
  const overdue = (boletos || []).filter(b => b.status === "OVERDUE").reduce((s, b) => s + Number(b.value), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-green-500/40 text-green-700 bg-green-500/10 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Cobrança ativa
          </Badge>
          {charge.asaas_subscription_id && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[220px]" title={charge.asaas_subscription_id}>
              ID: {charge.asaas_subscription_id}
            </span>
          )}
        </div>
      </div>

      {loadingBoletos ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (!boletos || boletos.length === 0) ? (
        <div className="text-center py-10 border rounded-lg">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm font-medium">Boletos serão gerados automaticamente pelo Asaas</p>
          <p className="text-xs text-muted-foreground mt-1">
            {lease?.due_day ? `Próximo vencimento estimado: dia ${lease.due_day}.` : "Aguardando geração."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pendente", value: pending, cls: "text-yellow-600" },
              { label: "Recebido", value: paid, cls: "text-green-600" },
              { label: "Vencido", value: overdue, cls: "text-red-600" },
            ].map(c => (
              <div key={c.label} className="border rounded-lg p-3 bg-card">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={cn("text-base font-semibold mt-0.5", c.cls)}>{brl(c.value)}</p>
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
                      <TableCell className="font-medium text-sm">{brl(b.value)}</TableCell>
                      <TableCell className="text-sm">
                        {b.due_date ? format(new Date(b.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className={cn("text-[10px]", st.cls)}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {actionLoading?.startsWith(b.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {b.bank_slip_url && (
                              <DropdownMenuItem onClick={() => window.open(b.bank_slip_url!, "_blank")}>
                                <ExternalLink className="mr-2 h-4 w-4" />Ver boleto
                              </DropdownMenuItem>
                            )}
                            {b.bank_slip_url && (
                              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(b.bank_slip_url!); toast.success("Link copiado!"); }}>
                                <Copy className="mr-2 h-4 w-4" />Copiar link
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleAction(b.id, "get_slip_url")}>
                              <RefreshCw className="mr-2 h-4 w-4" />Reemitir boleto
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction(b.id, "send_email")}>
                              <Mail className="mr-2 h-4 w-4" />Reenviar por e-mail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setNewDueDate(b.due_date || ""); setDueDateDialog({ id: b.id, current: b.due_date || "" }); }}>
                              <CalendarClock className="mr-2 h-4 w-4" />Alterar vencimento
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setNewValue(String(b.value ?? "")); setValueDialog({ id: b.id, current: Number(b.value) }); }}>
                              <TrendingUp className="mr-2 h-4 w-4" />Reajustar valor
                            </DropdownMenuItem>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleAction(b.id, "cancel")}>
                              <XCircle className="mr-2 h-4 w-4" />Cancelar cobrança
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value}</p>
    </div>
  );
}
