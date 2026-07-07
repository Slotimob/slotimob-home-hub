import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ENV } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ExternalLink,
  Copy,
  MoreHorizontal,
  Loader2,
  Receipt,
  RefreshCw,
  Mail,
  XCircle,
  CalendarClock,
  TrendingUp,
  FileText,
  Zap,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmitirCobrancaDialog } from "@/components/asaas/EmitirCobrancaDialog";
import { AsaasFinancialSeal, AsaasTransparencyNote } from "@/components/asaas/AsaasFinancialSeal";

const STATUS_MAP: Record<
  string,
  { label: string; cls: string }
> = {
  PENDING: {
    label: "Aguardando",
    cls: "border-yellow-500/40 text-yellow-700 bg-yellow-500/10",
  },
  RECEIVED: {
    label: "Pago",
    cls: "border-green-500/40 text-green-700 bg-green-500/10",
  },
  CONFIRMED: {
    label: "Pago",
    cls: "border-green-500/40 text-green-700 bg-green-500/10",
  },
  OVERDUE: {
    label: "Vencido",
    cls: "border-red-500/40 text-red-700 bg-red-500/10",
  },
  REFUNDED: {
    label: "Estornado",
    cls: "border-purple-500/40 text-purple-700 bg-purple-500/10",
  },
  CANCELLED: {
    label: "Cancelado",
    cls: "border-muted text-muted-foreground bg-muted/40",
  },
};

interface Props {
  leaseId: string;
  brokerId: string;
  onGoToBillingTab?: () => void;
}

function brl(v: number | string | null | undefined) {
  return Number(v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function billingLabel(t: string | null | undefined) {
  if (t === "BOLETO") return "Boleto";
  if (t === "PIX") return "PIX";
  if (t === "CREDIT_CARD") return "Cartão";
  return "Fatura";
}

export function LeaseBoletos({ leaseId, brokerId, onGoToBillingTab }: Props) {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dueDateDialog, setDueDateDialog] = useState<{ id: string; current: string } | null>(
    null
  );
  const [newDueDate, setNewDueDate] = useState("");
  const [valueDialog, setValueDialog] = useState<{ id: string; current: number } | null>(null);
  const [newValue, setNewValue] = useState("");
  const [cancelPayment, setCancelPayment] = useState<{ id: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [emitirOpen, setEmitirOpen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const {
    data: boletos,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["lease-boletos", leaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asaas_payments")
        .select(
          "id, asaas_payment_id, asaas_subscription_id, billing_type, value, due_date, status, bank_slip_url, pix_qr_code, pix_copy_paste, invoice_url, created_at"
        )
        .eq("lease_id", leaseId)
        .eq("broker_id", brokerId)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!leaseId && !!brokerId,
    refetchOnWindowFocus: true,
  });

  async function handleAction(
    paymentId: string,
    action: "get_slip_url" | "send_email" | "cancel" | "update_due_date" | "update_value",
    extra: Record<string, any> = {}
  ) {
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
      if (action === "get_slip_url" && data.bank_slip_url) {
        window.open(data.bank_slip_url, "_blank");
      } else if (action === "send_email") {
        toast.success("E-mail enviado ao inquilino");
      } else if (action === "cancel") {
        toast.success("Cobrança cancelada");
        await refetch();
      } else if (action === "update_due_date") {
        toast.success("Vencimento atualizado");
        await refetch();
      } else if (action === "update_value") {
        toast.success("Valor atualizado");
        await refetch();
      }
    } catch (err) {
      toast.error("Erro", { description: (err as Error).message });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-subscription", {
        body: { action: "sync_payments", lease_id: leaseId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const n = data?.synced ?? 0;
      toast.success(
        n === 0
          ? "Nenhuma cobrança nova encontrada"
          : `${n} cobrança${n > 1 ? "s" : ""} sincronizada${n > 1 ? "s" : ""}`
      );
      await queryClient.invalidateQueries({ queryKey: ["lease-boletos", leaseId] });
    } catch (err) {
      toast.error("Erro ao sincronizar", { description: (err as Error).message });
    } finally {
      setSyncing(false);
    }
  }

  const list = boletos || [];
  const pending = list
    .filter((b) => b.status === "PENDING")
    .reduce((s, b) => s + Number(b.value), 0);
  const paidCount = list.filter((b) =>
    ["RECEIVED", "CONFIRMED"].includes(b.status as string)
  ).length;
  const overdueCount = list.filter((b) => b.status === "OVERDUE").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="py-3 px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Em aberto: </span>
              <span className="font-semibold text-yellow-700">{brl(pending)}</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <div>
              <span className="font-semibold text-green-700">{paidCount}</span>
              <span className="text-muted-foreground"> paga{paidCount === 1 ? "" : "s"}</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <div>
              <span className="font-semibold text-red-700">{overdueCount}</span>
              <span className="text-muted-foreground">
                {" "}
                vencida{overdueCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmitirOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Cobrança avulsa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="gap-1.5"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sincronizar com Asaas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">Nenhuma cobrança ainda</p>
            <p className="text-xs text-muted-foreground">
              Ative a cobrança automática para emissões mensais ou crie uma cobrança avulsa.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => onGoToBillingTab?.()}
                className="gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                Ativar cobrança automática
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmitirOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Emitir cobrança avulsa
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((b) => {
                const st =
                  STATUS_MAP[b.status || ""] || {
                    label: b.status || "—",
                    cls: "border-muted text-muted-foreground bg-muted/40",
                  };
                const isAuto = !!b.asaas_subscription_id;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm">
                      {b.due_date
                        ? format(new Date(b.due_date + "T12:00:00"), "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{brl(b.value)}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {billingLabel(b.billing_type)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          isAuto
                            ? "border-blue-500/30 text-blue-700 bg-blue-500/10"
                            : "border-muted text-muted-foreground bg-muted/40"
                        )}
                      >
                        {isAuto ? "Automática" : "Avulsa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", st.cls)}>
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {actionLoading?.startsWith(b.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {b.invoice_url && (
                            <DropdownMenuItem
                              onClick={() => window.open(b.invoice_url!, "_blank")}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Ver fatura
                            </DropdownMenuItem>
                          )}
                          {b.bank_slip_url && (
                            <DropdownMenuItem
                              onClick={() => window.open(b.bank_slip_url!, "_blank")}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Boleto PDF
                            </DropdownMenuItem>
                          )}
                          {b.pix_copy_paste && (
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(b.pix_copy_paste!);
                                toast.success("Código PIX copiado!");
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar PIX
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleAction(b.id, "send_email")}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Reenviar por e-mail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setNewDueDate(b.due_date || "");
                              setDueDateDialog({ id: b.id, current: b.due_date || "" });
                            }}
                          >
                            <CalendarClock className="mr-2 h-4 w-4" />
                            Alterar vencimento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setNewValue(String(b.value ?? ""));
                              setValueDialog({ id: b.id, current: Number(b.value) });
                            }}
                          >
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Alterar valor
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setCancelPayment({ id: b.id })}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar cobrança
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
      )}

      <div className="mt-6 border-t pt-4 space-y-3">
        <AsaasFinancialSeal size="sm" />
        <AsaasTransparencyNote />
      </div>

      {/* Alterar vencimento */}
      <Dialog open={!!dueDateDialog} onOpenChange={(o) => !o && setDueDateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar vencimento</DialogTitle>
            <DialogDescription>Nova data de vencimento no Asaas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nova data</Label>
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDueDateDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await handleAction(dueDateDialog!.id, "update_due_date", {
                  new_due_date: newDueDate,
                });
                setDueDateDialog(null);
              }}
              disabled={!newDueDate}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alterar valor */}
      <Dialog open={!!valueDialog} onOpenChange={(o) => !o && setValueDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar valor</DialogTitle>
            <DialogDescription>Novo valor em R$.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Novo valor</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const v = parseFloat(newValue.replace(",", "."));
                if (isNaN(v) || v <= 0) {
                  toast.error("Valor inválido");
                  return;
                }
                await handleAction(valueDialog!.id, "update_value", { new_value: v });
                setValueDialog(null);
              }}
              disabled={!newValue}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancelar cobrança confirm */}
      <AlertDialog
        open={!!cancelPayment}
        onOpenChange={(o) => !o && setCancelPayment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação cancela a cobrança no Asaas e é irreversível. O inquilino não
              conseguirá mais pagá-la.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                const id = cancelPayment!.id;
                setCancelPayment(null);
                handleAction(id, "cancel");
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cancelar cobrança
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Emitir cobrança avulsa */}
      <EmitirCobrancaDialog
        open={emitirOpen}
        onOpenChange={setEmitirOpen}
        preselectedLeaseId={leaseId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["lease-boletos", leaseId] });
        }}
      />
    </div>
  );
}
