import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ContactSelector } from "@/components/ContactSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUpdateLease, type BillingAutomation } from "@/hooks/useLeases";
import { cn } from "@/lib/utils";

export const BILLING_SENDER_EMAIL = "cobranca@slotimob.com.br";

type StepKey = "-3" | "0" | "1" | "3";

const STEPS: { key: StepKey; title: string; subtitle: string }[] = [
  { key: "-3", title: "3 dias antes do vencimento", subtitle: "Lembrete preventivo" },
  { key: "0", title: "No dia do vencimento", subtitle: "Cobrança no dia D" },
  { key: "1", title: "1 dia depois", subtitle: "Primeiro aviso de atraso" },
  { key: "3", title: "3 dias depois", subtitle: "Último aviso automático" },
];

export function offsetLabel(offset: number): string {
  switch (offset) {
    case -3:
      return "3 dias antes";
    case 0:
      return "No vencimento";
    case 1:
      return "1 dia depois";
    case 3:
      return "3 dias depois";
    default:
      return offset < 0 ? `${Math.abs(offset)} dias antes` : `${offset} dias depois`;
  }
}

function brl(v: number | string | null | undefined) {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(`${d}T12:00:00`), "dd/MM/yyyy", { locale: ptBR });
}

/* ------------------------------------------------------------------ */
/* Bloco 1 — Avisos automáticos por e-mail                             */
/* ------------------------------------------------------------------ */

interface BillingEmailRemindersCardProps {
  leaseId: string;
  brokerId: string | null | undefined;
  billingAutomation: Record<string, any> | null;
  tenantEmail: string | null | undefined;
  canEdit: boolean;
}

export function BillingEmailRemindersCard({
  leaseId,
  brokerId,
  billingAutomation,
  tenantEmail,
  canEdit,
}: BillingEmailRemindersCardProps) {
  const { toast } = useToast();
  const updateLease = useUpdateLease();

  const auto = billingAutomation ?? {};
  const [enabled, setEnabled] = useState<boolean>(!!auto.enabled);
  const [emailTo, setEmailTo] = useState<string>(auto.email_to ?? "");
  const [steps, setSteps] = useState<Record<StepKey, boolean>>(() =>
    STEPS.reduce(
      (acc, s) => ({ ...acc, [s.key]: !!auto.steps?.[s.key] }),
      {} as Record<StepKey, boolean>,
    ),
  );
  const [saving, setSaving] = useState(false);

  const autoKey = JSON.stringify(billingAutomation ?? {});
  useEffect(() => {
    const a = billingAutomation ?? {};
    setEnabled(!!a.enabled);
    setEmailTo(a.email_to ?? "");
    setSteps(
      STEPS.reduce(
        (acc, s) => ({ ...acc, [s.key]: !!a.steps?.[s.key] }),
        {} as Record<StepKey, boolean>,
      ),
    );
  }, [autoKey]);

  const { data: brokerProfile } = useQuery({
    queryKey: ["billing-sender-profile", brokerId],
    enabled: !!brokerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", brokerId as string)
        .maybeSingle();
      return data;
    },
  });

  const noRecipient = !emailTo.trim() && !tenantEmail;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLease.mutateAsync({
        id: leaseId,
        data: {
          billing_automation: {
            enabled,
            email_to: emailTo.trim() || null,
            steps,
          } as BillingAutomation,
        },
      });
      toast({ title: "Avisos por e-mail salvos" });
    } catch {
      toast({ title: "Erro ao salvar os avisos", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Avisos automáticos por e-mail
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          A Slotimob envia os avisos de cobrança ao inquilino nos momentos escolhidos.
        </p>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Ativar avisos por e-mail</p>
            <p className="text-xs text-muted-foreground">
              Quando desligado, nenhum aviso é enviado para este contrato.
            </p>
          </div>
          <Switch disabled={!canEdit} checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">E-mail de destino</Label>
          <Input
            type="email"
            disabled={!canEdit}
            placeholder={tenantEmail || "Inquilino sem e-mail cadastrado"}
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            className="h-9 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Em branco = e-mail do inquilino
            {tenantEmail ? ` (${tenantEmail})` : ""}.
          </p>
          {noRecipient && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              O inquilino não tem e-mail cadastrado e o campo está vazio: nenhum aviso será enviado.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Momentos de envio</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>
                </div>
                <Switch
                  disabled={!canEdit || !enabled}
                  checked={!!steps[s.key]}
                  onCheckedChange={(v) => setSteps((p) => ({ ...p, [s.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Os avisos saem de um e-mail da Slotimob (
            <span className="font-medium text-foreground">{BILLING_SENDER_EMAIL}</span>), assinados com o nome{" "}
            <span className="font-medium text-foreground">
              {brokerProfile?.full_name || "—"}
            </span>
            . As respostas do inquilino chegam no seu e-mail cadastrado (
            <span className="font-medium text-foreground">{brokerProfile?.email || "—"}</span>).
          </p>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Salvar avisos
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Bloco 2 — Cobrança por WhatsApp (manual)                            */
/* ------------------------------------------------------------------ */

interface BillingWhatsappManualCardProps {
  leaseId: string;
  brokerId: string | null | undefined;
  tenantContactId: string | null | undefined;
  /**
   * Contato definido no passo "Cobrança" do contrato
   * (`billing_automation.billing_contact.contact_id`). Tem precedência sobre o
   * inquilino: é a escolha explícita do usuário, feita uma única vez.
   */
  billingContactId?: string | null;
  hasWhatsappConnected: boolean;
}

export function BillingWhatsappManualCard({
  leaseId,
  brokerId,
  tenantContactId,
  billingContactId,
  hasWhatsappConnected,
}: BillingWhatsappManualCardProps) {
  const navigate = useNavigate();
  const initialContactId = billingContactId || tenantContactId || "";
  const [contactId, setContactId] = useState<string>(initialContactId);

  useEffect(() => {
    if (initialContactId) setContactId(initialContactId);
  }, [initialContactId]);


  // Parcela pendente mais próxima do vencimento
  const { data: nextCharge } = useQuery({
    queryKey: ["lease-next-pending-charge", leaseId, brokerId],
    enabled: !!leaseId && !!brokerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_transactions")
        .select("id, description, amount, due_date, status")
        .eq("broker_id", brokerId as string)
        .like("reference", `lease:${leaseId}%`)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: contact } = useQuery({
    queryKey: ["billing-whatsapp-contact", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, phone, whatsapp")
        .eq("id", contactId)
        .maybeSingle();
      return data;
    },
  });

  const phone = contact?.whatsapp || contact?.phone || "";

  const message = useMemo(() => {
    if (!nextCharge) return "";
    const nome = contact?.name ? `${contact.name}, ` : "";
    return `Olá ${nome}tudo bem? Passando para lembrar da cobrança "${nextCharge.description || "Aluguel"}" no valor de ${brl(nextCharge.amount)}, com vencimento em ${formatDate(nextCharge.due_date)}.`;
  }, [nextCharge, contact?.name]);

  const disabledReason = !hasWhatsappConnected
    ? "Conecte um número de WhatsApp para usar este atalho."
    : !contactId
      ? "Selecione um contato."
      : !phone
        ? "O contato selecionado não tem telefone ou WhatsApp cadastrado."
        : !nextCharge
          ? "Não há parcela pendente neste contrato."
          : null;

  const handleOpen = () => {
    if (disabledReason) return;
    navigate(`/whatsapp?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`);
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Cobrança por WhatsApp
          <Badge variant="outline" className="text-[10px]">Manual</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Não existe régua automática por WhatsApp: enquanto não houver API oficial, o envio é manual para proteger o
          número do corretor.
        </p>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Contato</Label>
          <ContactSelector value={contactId} onChange={(v) => setContactId(v || "")} />
        </div>

        {!hasWhatsappConnected ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              WhatsApp não conectado
            </p>
            <p className="text-[11px] text-muted-foreground">
              Conecte seu número na página de integrações para abrir a conversa direto daqui.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 mt-1"
              onClick={() => navigate("/whatsapp")}
            >
              <ExternalLink className="h-3 w-3" />
              Conectar WhatsApp
            </Button>
          </div>
        ) : nextCharge ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 space-y-0.5">
            <p className="text-[11px] text-muted-foreground">Mensagem pré-preenchida</p>
            <p className="text-xs text-foreground">{message}</p>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[11px] text-muted-foreground">
            A mensagem abre no chat pronta para revisão. Quem aperta enviar é você.
          </p>
          <Button size="sm" disabled={!!disabledReason} onClick={handleOpen} className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Abrir cobrança no WhatsApp
          </Button>
        </div>
        {disabledReason && hasWhatsappConnected && (
          <p className="text-[11px] text-muted-foreground">{disabledReason}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Bloco 3 — Histórico de envios                                       */
/* ------------------------------------------------------------------ */

interface BillingReminderLogsCardProps {
  leaseId: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  sent: { label: "Enviado", className: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10" },
  failed: { label: "Falhou", className: "border-destructive/30 text-destructive bg-destructive/10" },
  skipped: { label: "Pulado", className: "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10" },
};

export function BillingReminderLogsCard({ leaseId }: BillingReminderLogsCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-reminder-logs", leaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_reminder_logs")
        .select("id, created_at, channel, schedule_offset, recipient, status, error_message, transaction_id")
        .eq("lease_id", leaseId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => data ?? [], [data]);

  const transactionIds = useMemo(
    () => Array.from(new Set(rows.map((r: any) => r.transaction_id).filter(Boolean))) as string[],
    [rows],
  );

  const { data: dueDates } = useQuery({
    queryKey: ["billing-reminder-log-due-dates", leaseId, transactionIds.join(",")],
    enabled: transactionIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_transactions")
        .select("id, due_date")
        .in("id", transactionIds);
      const map: Record<string, string | null> = {};
      (data ?? []).forEach((t: any) => {
        map[t.id] = t.due_date;
      });
      return map;
    },
  });

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Histórico de envios</CardTitle>
        <p className="text-xs text-muted-foreground">
          Cada tentativa do motor de cobrança deste contrato, com o resultado real.
        </p>
      </CardHeader>
      <CardContent className="py-2 px-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-4">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
          </p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">
            Nenhum aviso enviado ainda. O motor roda uma vez por dia e registra aqui cada tentativa.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left font-medium py-2 pr-3">Data/hora</th>
                  <th className="text-left font-medium py-2 pr-3">Vencimento</th>
                  <th className="text-left font-medium py-2 pr-3">Canal</th>
                  <th className="text-left font-medium py-2 pr-3">Momento</th>
                  <th className="text-left font-medium py-2 pr-3">Destinatário</th>
                  <th className="text-left font-medium py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((log: any) => {
                  const cfg = STATUS_MAP[log.status] ?? {
                    label: log.status,
                    className: "border-border text-muted-foreground bg-muted/40",
                  };
                  const due = log.transaction_id ? dueDates?.[log.transaction_id] : null;
                  return (
                    <tr key={log.id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(due)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {log.channel === "email" ? "E-mail" : log.channel}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{offsetLabel(log.schedule_offset)}</td>
                      <td className="py-2 pr-3 max-w-[180px] truncate">{log.recipient || "—"}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={cn("text-[10px]", cfg.className)}>
                            {cfg.label}
                          </Badge>
                          {log.error_message && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">{log.error_message}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {log.error_message && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[220px] break-words">
                            {log.error_message}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
