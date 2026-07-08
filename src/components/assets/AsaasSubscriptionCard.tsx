import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Zap,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Pencil,
  PowerOff,
  Info,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { AsaasFinancialSeal } from "@/components/asaas/AsaasFinancialSeal";
import { usePermissions } from "@/hooks/usePermissions";

type BillingType = "UNDEFINED" | "BOLETO" | "PIX";

interface AsaasSubscriptionSnapshot {
  id: string;
  status?: string;
  billing_type?: BillingType;
  value?: number;
  cycle?: string;
  next_due_date?: string;
  fine?: number;
  interest?: number;
  created_at?: string;
  updated_at?: string;
  cancelled_at?: string;
}

interface Props {
  leaseId: string;
  rentAmount: number;
  dueDay: number | null;
  billingAutomation: Record<string, any> | null;
  onChanged?: () => void;
}

function brl(v: number | string | null | undefined) {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function billingLabel(t?: string) {
  if (t === "BOLETO") return "Boleto";
  if (t === "PIX") return "PIX";
  return "Fatura (PIX + Boleto + Cartão)";
}

export function AsaasSubscriptionCard({
  leaseId,
  rentAmount,
  dueDay,
  billingAutomation,
  onChanged,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("management_boletos", "create");
  const canEdit = hasPermission("management_boletos", "edit");
  const canDelete = hasPermission("management_boletos", "delete");
  const canView = hasPermission("management_boletos", "view");

  const sub: AsaasSubscriptionSnapshot | null =
    billingAutomation?.asaas_subscription ?? null;
  const isActive = !!sub?.id && sub.status !== "CANCELLED";

  // Activation form
  const [billingType, setBillingType] = useState<BillingType>("UNDEFINED");
  const [value, setValue] = useState<string>(String(rentAmount ?? ""));
  const [fine, setFine] = useState<string>("10");
  const [interest, setInterest] = useState<string>("1");
  const [activating, setActivating] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editBillingType, setEditBillingType] = useState<BillingType>(
    (sub?.billing_type as BillingType) || "UNDEFINED"
  );
  const [editValue, setEditValue] = useState<string>(String(sub?.value ?? rentAmount ?? ""));
  const [editNextDue, setEditNextDue] = useState<string>(sub?.next_due_date ?? "");
  const [editFine, setEditFine] = useState<string>(String(sub?.fine ?? 10));
  const [editInterest, setEditInterest] = useState<string>(String(sub?.interest ?? 1));
  const [saving, setSaving] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // Detect missing subconta Asaas so we can direct to /settings
  const { data: accountStatus } = useQuery({
    queryKey: ["asaas-account-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("asaas_accounts")
        .select("status")
        .maybeSingle();
      return data?.status ?? null;
    },
  });
  const hasSubconta = accountStatus === "active";

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["lease-detail", leaseId] });
    await queryClient.invalidateQueries({ queryKey: ["lease-detail"] });
    await queryClient.invalidateQueries({ queryKey: ["lease-boletos", leaseId] });
    onChanged?.();
  };

  async function invokeAction(payload: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("asaas-subscription", {
      body: { lease_id: leaseId, ...payload },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function handleActivate() {
    const numValue = parseFloat(value.replace(",", "."));
    if (!numValue || numValue <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setActivating(true);
    try {
      await invokeAction({
        action: "create",
        billing_type: billingType,
        value: numValue,
        fine: parseFloat(fine.replace(",", ".")) || 0,
        interest: parseFloat(interest.replace(",", ".")) || 0,
      });
      toast.success("Cobrança automática ativada");
      await invalidateAll();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.toLowerCase().includes("subconta")) {
        toast.error("Subconta Asaas não configurada", {
          description: "Ative em Configurações antes de continuar.",
          action: { label: "Abrir", onClick: () => navigate("/settings") },
        });
      } else {
        toast.error("Erro ao ativar", { description: msg });
      }
    } finally {
      setActivating(false);
    }
  }

  async function handleSaveEdit() {
    const numValue = parseFloat(editValue.replace(",", "."));
    if (!numValue || numValue <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setSaving(true);
    try {
      await invokeAction({
        action: "update",
        billing_type: editBillingType,
        value: numValue,
        next_due_date: editNextDue || undefined,
        fine: parseFloat(editFine.replace(",", ".")) || 0,
        interest: parseFloat(editInterest.replace(",", ".")) || 0,
      });
      toast.success("Assinatura atualizada");
      setEditOpen(false);
      await invalidateAll();
    } catch (err) {
      toast.error("Erro ao atualizar", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await invokeAction({ action: "cancel" });
      toast.success("Cobrança automática cancelada");
      setCancelOpen(false);
      await invalidateAll();
    } catch (err) {
      toast.error("Erro ao cancelar", { description: (err as Error).message });
    } finally {
      setCancelling(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await invokeAction({ action: "get" });
      toast.success("Status atualizado");
      await invalidateAll();
    } catch (err) {
      toast.error("Erro ao atualizar status", { description: (err as Error).message });
    } finally {
      setRefreshing(false);
    }
  }

  // ------------------------------ INACTIVE STATE ------------------------------
  if (!isActive) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Cobrança automática
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            O Asaas emite a cobrança todo mês sozinho, envia por e-mail ao inquilino,
            aplica multa e juros no atraso, e o pagamento aparece no bloco Boletos automaticamente.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {!hasSubconta && (
            <div className="p-3 rounded-md border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <p className="font-medium">Subconta Asaas não configurada.</p>
                <p>Para ativar a cobrança automática, finalize a integração nas configurações.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Ir para configurações
                </Button>
              </div>
            </div>
          )}

          {sub?.status === "CANCELLED" && (
            <div className="p-2.5 rounded-md border bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
              <PowerOff className="h-3.5 w-3.5" />
              Assinatura anterior cancelada
              {sub.cancelled_at
                ? ` em ${format(new Date(sub.cancelled_at), "dd/MM/yyyy", { locale: ptBR })}`
                : ""}
              . Você pode ativar novamente abaixo.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Forma de cobrança</Label>
              <Select value={billingType} onValueChange={(v) => setBillingType(v as BillingType)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNDEFINED">
                    Fatura completa — inquilino escolhe PIX, boleto ou cartão (recomendado)
                  </SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dia de vencimento</Label>
              <Input
                value={dueDay ? `Todo dia ${dueDay}` : "—"}
                readOnly
                disabled
                className="h-9 text-sm bg-muted/40"
              />
              <p className="text-[10px] text-muted-foreground">
                Segue o contrato. Para alterar, edite o contrato.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Multa (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={fine}
                onChange={(e) => setFine(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Juros ao mês (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleActivate}
            disabled={activating || !hasSubconta}
          >
            {activating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Ativar cobrança automática
              </>
            )}
          </Button>

          <div className="border-t pt-3 mt-4">
            <AsaasFinancialSeal size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ------------------------------ ACTIVE STATE ------------------------------
  const activeSub = sub!;
  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Cobrança automática
            </CardTitle>
            <Badge
              variant="outline"
              className="border-green-500/40 text-green-700 bg-green-500/10 gap-1"
            >
              <CheckCircle2 className="h-3 w-3" /> ATIVA
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Info2 label="Valor mensal" value={brl(activeSub.value)} />
            <Info2 label="Ciclo" value="Mensal" />
            <Info2
              label="Próxima cobrança"
              value={
                activeSub.next_due_date
                  ? format(new Date(activeSub.next_due_date + "T12:00:00"), "dd/MM/yyyy", {
                      locale: ptBR,
                    })
                  : "—"
              }
            />
            <Info2 label="Forma" value={billingLabel(activeSub.billing_type)} />
            <Info2 label="Multa" value={`${activeSub.fine ?? 0}%`} />
            <Info2 label="Juros / mês" value={`${activeSub.interest ?? 0}%`} />
            {activeSub.created_at && (
              <Info2
                label="Ativado em"
                value={format(new Date(activeSub.created_at), "dd/MM/yyyy", { locale: ptBR })}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Atualizar status
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setCancelOpen(true)}
            >
              <PowerOff className="h-3.5 w-3.5 mr-1.5" />
              Cancelar cobrança automática
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            As cobranças emitidas aparecem na aba <span className="font-medium">Boletos</span>.
          </p>

          <div className="border-t pt-3 mt-4">
            <AsaasFinancialSeal size="sm" />
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => !saving && setEditOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cobrança automática</DialogTitle>
            <DialogDescription>
              As alterações são aplicadas na próxima cobrança emitida.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Forma de cobrança</Label>
              <Select
                value={editBillingType}
                onValueChange={(v) => setEditBillingType(v as BillingType)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNDEFINED">Fatura completa (recomendado)</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Próximo vencimento</Label>
              <Input
                type="date"
                value={editNextDue}
                onChange={(e) => setEditNextDue(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Multa (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={editFine}
                onChange={(e) => setEditFine(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Juros / mês (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={editInterest}
                onChange={(e) => setEditInterest(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <AlertDialog open={cancelOpen} onOpenChange={(o) => !cancelling && setCancelOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar cobrança automática?</AlertDialogTitle>
            <AlertDialogDescription>
              O Asaas deixará de emitir novas cobranças mensais para este contrato.
              As cobranças já emitidas continuam válidas e visíveis na aba Boletos.
              Você pode reativar a cobrança automática a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Confirmar cancelamento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Info2({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value}</p>
    </div>
  );
}
