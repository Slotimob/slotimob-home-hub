import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ENV } from "@/config/env";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ExternalLink, Copy, MoreHorizontal, Search, FileText, Loader2, Receipt, AlertCircle, RefreshCw, Mail, XCircle, CalendarClock, TrendingUp, Plus } from "lucide-react";
import { EmitirCobrancaDialog } from "@/components/asaas/EmitirCobrancaDialog";
import { AsaasFinancialSeal, AsaasTransparencyNote } from "@/components/asaas/AsaasFinancialSeal";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";


const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  PENDING: { label: "Pendente", variant: "yellow" },
  RECEIVED: { label: "Pago", variant: "green" },
  CONFIRMED: { label: "Confirmado", variant: "green" },
  OVERDUE: { label: "Vencido", variant: "red" },
  REFUNDED: { label: "Estornado", variant: "blue" },
  CANCELLED: { label: "Cancelado", variant: "gray" },
  AWAITING_RISK_ANALYSIS: { label: "Em análise", variant: "yellow" },
};

export default function BoletosEmGestao() {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canView = hasPermission("management_boletos", "view");
  const canCreate = hasPermission("management_boletos", "create");
  const canEdit = hasPermission("management_boletos", "edit");
  const canDelete = hasPermission("management_boletos", "delete");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [emitirOpen, setEmitirOpen] = useState(false);

  // Dialogs: alterar vencimento e reajustar valor
  const [dueDateDialog, setDueDateDialog] = useState<{ id: string; current: string } | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [valueDialog, setValueDialog] = useState<{ id: string; current: number } | null>(null);
  const [newValue, setNewValue] = useState("");



  const { data: boletos, isLoading, refetch } = useQuery({
    queryKey: ['asaas-payments', effectiveBrokerId, user?.id, statusFilter, unitFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('asaas_payments')
        .select(`
          id,
          asaas_payment_id,
          billing_type,
          value,
          due_date,
          status,
          bank_slip_url,
          pix_qr_code,
          pix_copy_paste,
          invoice_url,
          created_at,
          lease_id,
          leases (
            id,
            rent_amount,
            tenant_contact:contacts!leases_tenant_contact_id_fkey (id, name, email),
            unit:units!leases_unit_id_fkey (id, name)
          )
        `)
        .eq('broker_id', effectiveBrokerId || user!.id)
        .order('due_date', { ascending: false });

      if (statusFilter !== "all") query = query.eq('status', statusFilter);
      if (unitFilter !== "all") query = query.eq('lease_id', unitFilter);
      if (dateFrom) query = query.gte('due_date', dateFrom);
      if (dateTo) query = query.lte('due_date', dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: units } = useQuery({
    queryKey: ['units-filter', effectiveBrokerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select('id, unit_number')
        .eq('broker_id', effectiveBrokerId!)
        .order('unit_number');
      return data ?? [];
    },
    enabled: !!effectiveBrokerId,
  });

  const filtered = boletos?.filter(b => {
    if (!search) return true;
    const tenantName = (b.leases as any)?.tenant_contact?.name?.toLowerCase() || '';
    const unitName = (b.leases as any)?.unit?.name?.toLowerCase() || '';
    const s = search.toLowerCase();
    return tenantName.includes(s) || unitName.includes(s) || b.asaas_payment_id?.toLowerCase().includes(s);
  }) || [];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  async function handlePaymentAction(
    paymentId: string,
    action: 'get_slip_url' | 'send_email' | 'cancel' | 'update_due_date' | 'update_value',
    extraPayload: Record<string, any> = {}
  ) {
    if (action === 'cancel') {
      if (!window.confirm('Tem certeza que deseja cancelar esta cobrança no Asaas? Esta ação não pode ser desfeita.')) return;
    }
    setActionLoading(`${paymentId}-${action}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-payment-action`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ payment_id: paymentId, action, ...extraPayload }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

      if (action === 'get_slip_url' && data.bank_slip_url) {
        window.open(data.bank_slip_url, '_blank');
      } else if (action === 'send_email') {
        toast({ title: 'E-mail enviado com sucesso!' });
      } else if (action === 'cancel') {
        toast({ title: 'Cobrança cancelada no Asaas.' });
        refetch();
      } else if (action === 'update_due_date') {
        toast({ title: 'Vencimento atualizado.' });
        refetch();
      } else if (action === 'update_value') {
        toast({ title: 'Valor atualizado.' });
        refetch();
      }
    } catch (err) {
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }

  function openChangeDueDateDialog(boleto: any) {
    setNewDueDate(boleto.due_date || "");
    setDueDateDialog({ id: boleto.id, current: boleto.due_date || "" });
  }

  function openReajusteDialog(boleto: any) {
    setNewValue(String(boleto.value ?? ""));
    setValueDialog({ id: boleto.id, current: Number(boleto.value) || 0 });
  }

  async function confirmDueDate() {
    if (!dueDateDialog || !newDueDate) return;
    await handlePaymentAction(dueDateDialog.id, 'update_due_date', { new_due_date: newDueDate });
    setDueDateDialog(null);
  }

  async function confirmValue() {
    if (!valueDialog) return;
    const parsed = parseFloat(newValue.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }
    await handlePaymentAction(valueDialog.id, 'update_value', { new_value: parsed });
    setValueDialog(null);
  }


  const getBadgeClass = (variant: string) => {
    switch (variant) {
      case "green": return "bg-green-100 text-green-700 border-green-200";
      case "yellow": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "red": return "bg-red-100 text-red-700 border-red-200";
      case "blue": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const total = filtered.length;
  const pendingAmount = filtered.filter(b => b.status === 'PENDING').reduce((s, b) => s + Number(b.value), 0);
  const paidAmount = filtered.filter(b => ['RECEIVED','CONFIRMED'].includes(b.status as string)).reduce((s, b) => s + Number(b.value), 0);
  const overdueAmount = filtered.filter(b => b.status === 'OVERDUE').reduce((s, b) => s + Number(b.value), 0);

  return (
    <AppLayout title="Boletos e Cobranças">
    <div className="space-y-6 p-4 sm:p-6">

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Boletos e Cobranças
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie as cobranças automáticas via Asaas</p>
        </div>
        {canCreate && (
          <Button onClick={() => setEmitirOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nova Cobrança
          </Button>
        )}
      </div>

      {!canView ? (
        <div className="text-center py-16 border rounded-lg">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm font-medium">Você não tem permissão para visualizar boletos.</p>
          <p className="text-xs text-muted-foreground mt-1">Fale com o administrador da sua conta.</p>
        </div>
      ) : (<>

      <EmitirCobrancaDialog
        open={emitirOpen}
        onOpenChange={setEmitirOpen}
        onSuccess={() => refetch()}
      />


      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, format: "count", color: "text-foreground" },
          { label: "Pendente", value: pendingAmount, format: "currency", color: "text-yellow-600" },
          { label: "Recebido", value: paidAmount, format: "currency", color: "text-green-600" },
          { label: "Vencido", value: overdueAmount, format: "currency", color: "text-red-600" },
        ].map(card => (
          <div key={card.label} className="border rounded-lg p-3 bg-card">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={cn("text-lg font-semibold mt-0.5", card.color)}>
              {card.format === "currency"
                ? card.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Inquilino, imóvel ou ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="RECEIVED">Pago</SelectItem>
            <SelectItem value="OVERDUE">Vencido</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os imóveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os imóveis</SelectItem>
            {units?.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.unit_number || '—'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" className="w-[150px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input type="date" className="w-[150px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma cobrança encontrada</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ative a cobrança automática em um contrato para começar
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Inquilino</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(boleto => {
                const lease = boleto.leases as any;
                const statusInfo = STATUS_MAP[boleto.status || ''] || { label: boleto.status || '—', variant: 'gray' };
                return (
                  <TableRow key={boleto.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{lease?.tenant_contact?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{lease?.tenant_contact?.email || ''}</p>
                    </TableCell>
                    <TableCell className="text-sm">{lease?.unit?.name || '—'}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {boleto.billing_type === 'BOLETO' ? 'Boleto' : 'PIX'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {Number(boleto.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {boleto.due_date ? format(new Date(boleto.due_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", getBadgeClass(statusInfo.variant))}>
                        {statusInfo.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handlePaymentAction(boleto.id, 'get_slip_url')}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reemitir boleto
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => handlePaymentAction(boleto.id, 'send_email')}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Enviar por e-mail
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem onClick={() => openChangeDueDateDialog(boleto)}>
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Alterar vencimento
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem onClick={() => openReajusteDialog(boleto)}>
                              <TrendingUp className="mr-2 h-4 w-4" />
                              Reajustar valor
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handlePaymentAction(boleto.id, 'cancel')}
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar cobrança
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />

                          {boleto.bank_slip_url && (
                            <DropdownMenuItem onClick={() => window.open(boleto.bank_slip_url!, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver boleto
                            </DropdownMenuItem>
                          )}
                          {boleto.invoice_url && (
                            <DropdownMenuItem onClick={() => window.open(boleto.invoice_url!, '_blank')}>
                              <FileText className="h-4 w-4 mr-2" />
                              Ver fatura Asaas
                            </DropdownMenuItem>
                          )}
                          {boleto.pix_copy_paste && (
                            <DropdownMenuItem onClick={() => copyToClipboard(boleto.pix_copy_paste!, 'Código PIX')}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar código PIX
                            </DropdownMenuItem>
                          )}
                          {boleto.asaas_payment_id && (
                            <DropdownMenuItem onClick={() => copyToClipboard(boleto.asaas_payment_id!, 'ID Asaas')}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar ID Asaas
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
      )}

      <div className="mt-6 border-t pt-4 space-y-3">
        <AsaasFinancialSeal size="sm" />
        <AsaasTransparencyNote />
      </div>
      </>)}
    </div>

    {/* Dialog: Alterar vencimento */}
    <Dialog open={!!dueDateDialog} onOpenChange={(open) => !open && setDueDateDialog(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar vencimento</DialogTitle>
          <DialogDescription>
            Informe a nova data de vencimento. A cobrança será atualizada no Asaas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="new-due-date">Nova data</Label>
          <Input
            id="new-due-date"
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDueDateDialog(null)}>Cancelar</Button>
          <Button
            onClick={confirmDueDate}
            disabled={!newDueDate || actionLoading === `${dueDateDialog?.id}-update_due_date`}
          >
            {actionLoading === `${dueDateDialog?.id}-update_due_date` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog: Reajustar valor */}
    <Dialog open={!!valueDialog} onOpenChange={(open) => !open && setValueDialog(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reajustar valor</DialogTitle>
          <DialogDescription>
            Informe o novo valor (R$). A cobrança será atualizada no Asaas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="new-value">Novo valor</Label>
          <CurrencyInput
            id="new-value"
            value={newValue}
            onChange={setNewValue}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setValueDialog(null)}>Cancelar</Button>
          <Button
            onClick={confirmValue}
            disabled={!newValue || actionLoading === `${valueDialog?.id}-update_value`}
          >
            {actionLoading === `${valueDialog?.id}-update_value` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </AppLayout>
  );
}
