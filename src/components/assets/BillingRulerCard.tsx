import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUpdateLease, type BillingAutomation } from "@/hooks/useLeases";
import { cn } from "@/lib/utils";

export type BillingMode = "off" | "own" | "asaas";

const STEPS: { flag: string; offset: number; title: string; subtitle: string }[] = [
  { flag: "reminder_5_days", offset: -5, title: "5 dias antes", subtitle: "Lembrete de vencimento próximo" },
  { flag: "reminder_due_day", offset: 0, title: "No vencimento", subtitle: "Cobrança no dia D" },
  { flag: "reminder_3_days_late", offset: 3, title: "3 dias depois", subtitle: "Aviso de atraso" },
  { flag: "reminder_7_days_late", offset: 7, title: "7 dias depois", subtitle: "Último aviso antes da cobrança formal" },
];

export function offsetLabel(offset: number): string {
  switch (offset) {
    case -5:
      return "5 dias antes";
    case 0:
      return "No vencimento";
    case 3:
      return "3 dias depois";
    case 7:
      return "7 dias depois";
    default:
      return offset < 0 ? `${Math.abs(offset)} dias antes` : `${offset} dias depois`;
  }
}

interface BillingRulerCardProps {
  leaseId: string;
  brokerId: string | null | undefined;
  billingAutomation: Record<string, any> | null;
  canEdit: boolean;
  hasWhatsappConnected: boolean;
}

export function BillingRulerCard({
  leaseId,
  brokerId,
  billingAutomation,
  canEdit,
  hasWhatsappConnected,
}: BillingRulerCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateLease = useUpdateLease();

  const auto = billingAutomation ?? {};
  const [mode, setMode] = useState<BillingMode>(
    auto.mode === "own" || auto.mode === "asaas" ? auto.mode : "off",
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    STEPS.reduce((acc, s) => ({ ...acc, [s.flag]: !!auto[s.flag] }), {} as Record<string, boolean>),
  );
  const [channels, setChannels] = useState<{ email: boolean; whatsapp: boolean }>({
    email: auto.channels?.email ?? !!auto.email_enabled,
    whatsapp: auto.channels?.whatsapp ?? !!auto.whatsapp_enabled,
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Subconta Asaas ativa?
  const { data: asaasAccount, isLoading: loadingAsaas } = useQuery({
    queryKey: ["asaas-account", brokerId],
    enabled: !!brokerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("asaas_accounts")
        .select("id, status")
        .eq("broker_id", brokerId as string)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const asaasAvailable = !!asaasAccount && asaasAccount.status !== "inactive";

  // Configuração real de notificações na Asaas
  const {
    data: asaasConfig,
    isLoading: loadingConfig,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ["asaas-notifications", leaseId],
    enabled: mode === "asaas" && asaasAvailable,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("asaas-notifications", {
        body: { action: "get", lease_id: leaseId },
      });
      if (error) throw error;
      return data as any;
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLease.mutateAsync({
        id: leaseId,
        data: {
          billing_automation: {
            ...(billingAutomation ?? {}),
            mode,
            channels,
            // flags legadas preservadas / sincronizadas
            reminder_5_days: !!flags.reminder_5_days,
            reminder_due_day: !!flags.reminder_due_day,
            reminder_3_days_late: !!flags.reminder_3_days_late,
            reminder_7_days_late: !!flags.reminder_7_days_late,
            email_enabled: channels.email,
            whatsapp_enabled: channels.whatsapp,
          } as unknown as BillingAutomation,
        },
      });
      toast({ title: "Régua de cobrança salva" });
    } catch {
      toast({ title: "Erro ao salvar a régua", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-notifications", {
        body: {
          action: "sync",
          lease_id: leaseId,
          steps: flags,
          channels,
        },
      });
      if (error) throw error;
      setSyncResult(data);
      toast({ title: "Notificações sincronizadas com a Asaas" });
      refetchConfig();
    } catch (e: any) {
      toast({ title: "Erro ao sincronizar", description: e?.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const modeOptions: {
    value: BillingMode;
    title: string;
    description: string;
    icon: React.ReactNode;
    disabled?: boolean;
    disabledReason?: string;
  }[] = [
    {
      value: "off",
      title: "Desligada",
      description: "Nenhum aviso automático é enviado ao inquilino.",
      icon: <Ban className="h-4 w-4" />,
    },
    {
      value: "own",
      title: "Slotimob envia",
      description: "E-mail enviado pela Slotimob em seu nome e WhatsApp pela sua própria conexão.",
      icon: <Send className="h-4 w-4" />,
    },
    {
      value: "asaas",
      title: "Asaas envia",
      description: "A régua fica a cargo da sua subconta Asaas, junto com a cobrança.",
      icon: <Zap className="h-4 w-4" />,
      disabled: !asaasAvailable,
      disabledReason: loadingAsaas
        ? "Verificando subconta..."
        : "Nenhuma subconta Asaas ativa nesta conta.",
    },
  ];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Régua de cobrança</CardTitle>
        <p className="text-xs text-muted-foreground">
          Define quem envia os avisos de cobrança ao inquilino e em quais momentos.
        </p>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-5">
        {/* Modo */}
        <div className="grid gap-2 sm:grid-cols-3">
          {modeOptions.map((opt) => {
            const selected = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={!canEdit || opt.disabled}
                onClick={() => setMode(opt.value)}
                className={cn(
                  "text-left rounded-lg border p-3 transition-colors",
                  selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/50",
                  (opt.disabled || !canEdit) && "opacity-60 cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(selected ? "text-primary" : "text-muted-foreground")}>{opt.icon}</span>
                  <span className="text-sm font-medium">{opt.title}</span>
                  {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">{opt.description}</p>
                {opt.disabled && (
                  <p className="text-[11px] text-amber-600 mt-1.5">{opt.disabledReason}</p>
                )}
              </button>
            );
          })}
        </div>

        {!asaasAvailable && !loadingAsaas && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs gap-1"
            onClick={() => navigate("/settings")}
          >
            <ExternalLink className="h-3 w-3" />
            Configurar subconta Asaas
          </Button>
        )}

        {mode === "off" ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2.5 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              A régua está desligada. Nenhum aviso será enviado ao inquilino até que você escolha quem envia.
            </p>
          </div>
        ) : (
          <>
            {/* Canais */}
            <div className="space-y-2">
              <Label className="text-xs">Canais</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">E-mail</span>
                  </div>
                  <Switch
                    disabled={!canEdit}
                    checked={channels.email}
                    onCheckedChange={(v) => setChannels((p) => ({ ...p, email: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">WhatsApp</span>
                  </div>
                  <Switch
                    disabled={!canEdit}
                    checked={channels.whatsapp}
                    onCheckedChange={(v) => setChannels((p) => ({ ...p, whatsapp: v }))}
                  />
                </div>
              </div>
              {mode === "own" && channels.whatsapp && !hasWhatsappConnected && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground">
                    Nenhuma conexão de WhatsApp ativa. Os avisos por WhatsApp serão pulados até você conectar um
                    número.
                  </p>
                </div>
              )}
            </div>

            {/* Passos */}
            <div className="space-y-3">
              <Label className="text-xs">Momentos</Label>
              {STEPS.map((step) => {
                const unsupported = mode === "asaas" && step.flag === "reminder_3_days_late";
                return (
                  <div key={step.flag} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{step.title}</p>
                        {unsupported && (
                          <Badge variant="outline" className="text-[10px]">
                            Não suportado pela Asaas
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                      {unsupported && (
                        <p className="text-[11px] text-amber-600 mt-0.5">
                          A Asaas só possui notificações fixas de atraso em 0 e 7 dias e não permite criar novas
                          pela API. Use o modo "Slotimob envia" se este passo for necessário.
                        </p>
                      )}
                    </div>
                    <Switch
                      disabled={!canEdit || unsupported}
                      checked={!unsupported && !!flags[step.flag]}
                      onCheckedChange={(v) => setFlags((p) => ({ ...p, [step.flag]: v }))}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Salvar régua
            </Button>
          </div>
        )}

        {/* Painel Asaas */}
        {mode === "asaas" && asaasAvailable && (
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">O que a Asaas vai enviar</p>
              {canEdit && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleSync} disabled={syncing}>
                  {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Sincronizar com a Asaas
                </Button>
              )}
            </div>

            {loadingConfig ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando configuração...
              </p>
            ) : Array.isArray(asaasConfig?.notifications) && asaasConfig.notifications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left font-medium py-1.5 pr-3">Evento</th>
                      <th className="text-left font-medium py-1.5 pr-3">Dias</th>
                      <th className="text-left font-medium py-1.5">Canais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asaasConfig.notifications.map((n: any, i: number) => (
                      <tr key={n.id ?? i} className="border-b last:border-0">
                        <td className="py-1.5 pr-3">{n.event}</td>
                        <td className="py-1.5 pr-3">
                          {typeof n.scheduleOffset === "number" ? offsetLabel(n.scheduleOffset) : "—"}
                        </td>
                        <td className="py-1.5">
                          {[n.emailEnabledForCustomer && "E-mail", n.whatsappEnabledForCustomer && "WhatsApp"]
                            .filter(Boolean)
                            .join(" · ") || "Nenhum"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma configuração retornada pela Asaas.</p>
            )}

            {syncResult && (
              <div className="rounded-md bg-muted/40 border px-3 py-2 space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  Notificações atualizadas: {syncResult.updated ?? 0}
                </p>
                {Array.isArray(syncResult.unsupported) && syncResult.unsupported.length > 0 && (
                  <p className="text-[11px] text-amber-600">
                    Não suportado pela Asaas: {syncResult.unsupported.join(", ")}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-md bg-muted/40 border px-3 py-2 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                A Asaas não avisa por webhook quando dispara uma notificação — não existe comprovante de entrega. O
                que dá para acompanhar é o ciclo da cobrança (criada, vencida, paga) e quando o inquilino abriu o
                boleto ou o checkout.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
        .select("id, created_at, channel, schedule_offset, recipient, status, error_message")
        .eq("lease_id", leaseId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium">Histórico de avisos</CardTitle>
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
                  return (
                    <tr key={log.id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-2 pr-3">{log.channel === "whatsapp" ? "WhatsApp" : log.channel === "email" ? "E-mail" : log.channel}</td>
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
