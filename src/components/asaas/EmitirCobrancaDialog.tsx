import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, ExternalLink, AlertCircle, CheckCircle2, Receipt } from "lucide-react";
import { Link } from "react-router-dom";

interface EmitirCobrancaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedLeaseId?: string;
  onSuccess?: () => void;
}

interface LeaseOption {
  id: string;
  rent_amount: number;
  due_day: number | null;
  tenant_name: string;
  unit_name: string;
}

interface ChargeResult {
  success: boolean;
  billing_type: "BOLETO" | "PIX";
  bank_slip_url?: string | null;
  invoice_url?: string | null;
  pix_qr_code?: string | null;
  pix_copy_paste?: string | null;
}

function computeDefaultDueDate(dueDay: number | null | undefined): string {
  const day = dueDay && dueDay > 0 && dueDay <= 31 ? dueDay : new Date().getDate() + 5;
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth(); // 0-based
  if (today.getDate() > day) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const finalDay = Math.min(day, lastDayOfMonth);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(finalDay).padStart(2, "0")}`;
}

export function EmitirCobrancaDialog({
  open,
  onOpenChange,
  preselectedLeaseId,
  onSuccess,
}: EmitirCobrancaDialogProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();

  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("");
  const [billingType, setBillingType] = useState<"BOLETO" | "PIX">("BOLETO");
  const [dueDate, setDueDate] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ChargeResult | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const brokerId = effectiveBrokerId || user?.id;

  const { data: leases, isLoading: leasesLoading } = useQuery({
    queryKey: ["leases-for-charge", brokerId],
    queryFn: async (): Promise<LeaseOption[]> => {
      const { data, error } = await supabase
        .from("leases")
        .select(`
          id, rent_amount, due_day,
          tenant_contact:contacts!leases_tenant_contact_id_fkey (name),
          unit:units!leases_unit_id_fkey (name)
        `)
        .eq("broker_id", brokerId!)
        .eq("status", "active");
      if (error) throw error;
      return (data || [])
        .map((l: any) => ({
          id: l.id,
          rent_amount: Number(l.rent_amount) || 0,
          due_day: l.due_day,
          tenant_name: l.tenant_contact?.name || "Sem inquilino",
          unit_name: l.unit?.name || "",
        }))
        .sort((a, b) => a.tenant_name.localeCompare(b.tenant_name));
    },
    enabled: open && !!brokerId,
  });

  const selectedLease = useMemo(
    () => leases?.find((l) => l.id === selectedLeaseId),
    [leases, selectedLeaseId]
  );

  // Reset / initialize when opening or when preselectedLeaseId changes
  useEffect(() => {
    if (!open) {
      setResult(null);
      setNotConfigured(false);
      setDescription("");
      setSubmitting(false);
      return;
    }
    if (preselectedLeaseId) {
      setSelectedLeaseId(preselectedLeaseId);
    } else {
      setSelectedLeaseId("");
    }
    setBillingType("BOLETO");
  }, [open, preselectedLeaseId]);

  // When lease selection resolves, pre-fill amount + due date
  useEffect(() => {
    if (selectedLease) {
      setAmount(String(selectedLease.rent_amount || ""));
      setDueDate(computeDefaultDueDate(selectedLease.due_day));
    }
  }, [selectedLease?.id]);

  const handleSubmit = async () => {
    if (!selectedLeaseId) {
      toast({ title: "Selecione um contrato", variant: "destructive" });
      return;
    }
    if (!dueDate) {
      toast({ title: "Informe o vencimento", variant: "destructive" });
      return;
    }
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setNotConfigured(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-asaas-charge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            lease_id: selectedLeaseId,
            billing_type: billingType,
            due_date: dueDate,
            amount_override: parsedAmount,
            description: description || undefined,
            broker_id: brokerId,
          }),
        }
      );
      const data = await res.json();
      if (data.error) {
        if (typeof data.error === "string" && data.error.toLowerCase().includes("subconta asaas não configurada")) {
          setNotConfigured(true);
        } else {
          toast({ title: "Erro ao emitir cobrança", description: data.error, variant: "destructive" });
        }
        return;
      }
      setResult({
        success: true,
        billing_type: billingType,
        bank_slip_url: data.bank_slip_url,
        invoice_url: data.invoice_url,
        pix_qr_code: data.pix_qr_code,
        pix_copy_paste: data.pix_copy_paste,
      });
      toast({ title: billingType === "PIX" ? "PIX gerado!" : "Boleto gerado!" });
    } catch (err) {
      toast({ title: "Erro inesperado", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (result) onSuccess?.();
    onOpenChange(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? handleClose() : onOpenChange(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Emitir Cobrança
          </DialogTitle>
          <DialogDescription>
            Gere um boleto ou PIX para o inquilino do contrato selecionado.
          </DialogDescription>
        </DialogHeader>

        {notConfigured ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm">
            <div className="flex gap-2 items-start">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-yellow-900">Subconta Asaas não configurada</p>
                <p className="text-yellow-800">
                  Para emitir cobranças automáticas, ative sua integração Asaas.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/settings#asaas" onClick={() => onOpenChange(false)}>
                    Ir para Configurações
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">
                {result.billing_type === "PIX" ? "PIX gerado com sucesso!" : "Boleto gerado com sucesso!"}
              </p>
            </div>

            {result.billing_type === "BOLETO" && (
              <div className="space-y-2">
                {result.bank_slip_url && (
                  <Button
                    className="w-full"
                    onClick={() => window.open(result.bank_slip_url!, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Boleto
                  </Button>
                )}
                {result.invoice_url && (
                  <a
                    href={result.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm text-primary hover:underline text-center"
                  >
                    Ver fatura Asaas
                  </a>
                )}
              </div>
            )}

            {result.billing_type === "PIX" && (
              <div className="space-y-3">
                {result.pix_qr_code && (
                  <img
                    src={`data:image/png;base64,${result.pix_qr_code}`}
                    alt="QR Code PIX"
                    className="mx-auto w-48 h-48 border rounded"
                  />
                )}
                {result.pix_copy_paste && (
                  <div className="space-y-1">
                    <Label className="text-xs">Código copia e cola</Label>
                    <div className="flex gap-2">
                      <Input value={result.pix_copy_paste} readOnly className="text-xs font-mono" />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(result.pix_copy_paste!, "Código PIX")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {result.invoice_url && (
                  <a
                    href={result.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm text-primary hover:underline text-center"
                  >
                    Ver fatura Asaas
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {preselectedLeaseId ? (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                {selectedLease ? (
                  <>
                    <p className="font-medium">{selectedLease.tenant_name}</p>
                    {selectedLease.unit_name && (
                      <p className="text-muted-foreground text-xs">{selectedLease.unit_name}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Carregando contrato...</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Contrato</Label>
                <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder={leasesLoading ? "Carregando..." : "Selecione o contrato"} />
                  </SelectTrigger>
                  <SelectContent>
                    {leases?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.tenant_name}
                        {l.unit_name ? ` — ${l.unit_name}` : ""} ·{" "}
                        {l.rent_amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Tipo de cobrança</Label>
              <Select value={billingType} onValueChange={(v) => setBillingType(v as "BOLETO" | "PIX")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Aluguel julho 2025 – Apt 101"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {result || notConfigured ? (
            <Button onClick={handleClose} variant="outline" className="w-full">
              Fechar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !selectedLeaseId}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Emitindo...
                  </>
                ) : (
                  "Emitir Cobrança"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
