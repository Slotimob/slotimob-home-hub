import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  FileSignature,
  FileText,
  Loader2,
  MessageCircle,
  MessageSquareWarning,
  RefreshCw,
  Send,
  Wrench,
} from "lucide-react";
import { addDays, addMonths, format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { HelpTooltip } from "@/components/help/HelpTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useLeases, generateBillingMessage, type Lease } from "@/hooks/useLeases";
import {
  useActionCenterPending,
  type PendingContract,
  type PendingMaintenance,
  type PendingPayable,
  type PendingProposalFollowup,
  type PendingReceivable,
} from "@/hooks/useActionCenterPending";
import { openLeaseRoute } from "@/lib/lease-navigation";
import { formatPhoneForWhatsApp } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Régua de cobrança (fonte: contratos + automação de cobrança)        */
/* ------------------------------------------------------------------ */

type BillingFollowup = {
  id: string;
  lease: Lease;
  stage: "reminder" | "due" | "overdue";
  stageLabel: string;
  dueDate: Date;
  phone: string;
  message: string;
};

const getNextDueDate = (dueDay: number) => {
  const today = startOfDay(new Date());
  const currentMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
  currentMonthDue.setHours(0, 0, 0, 0);
  if (currentMonthDue.getTime() < today.getTime()) {
    const nextMonthDue = addMonths(currentMonthDue, 1);
    nextMonthDue.setHours(0, 0, 0, 0);
    return nextMonthDue;
  }
  return currentMonthDue;
};

const getBillingStage = (
  lease: Lease
): { stage: BillingFollowup["stage"]; stageLabel: string; dueDate: Date } | null => {
  const automation = lease.billing_automation;
  const dueDate = getNextDueDate(lease.due_day);
  const today = startOfDay(new Date());
  const reminderDate = addDays(dueDate, -5);
  const overdueDate = addDays(dueDate, 3);

  if (automation?.reminder_3_days_late && today.getTime() >= overdueDate.getTime()) {
    return { stage: "overdue", stageLabel: "3 dias após", dueDate };
  }
  if (automation?.reminder_due_day && today.getTime() >= dueDate.getTime()) {
    return { stage: "due", stageLabel: "Dia do vencimento", dueDate };
  }
  if (
    automation?.reminder_5_days &&
    today.getTime() >= reminderDate.getTime() &&
    today.getTime() < dueDate.getTime()
  ) {
    return { stage: "reminder", stageLabel: "5 dias antes", dueDate };
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Primitivas compactas de UI                                          */
/* ------------------------------------------------------------------ */

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v || 0);

function SectionCard({
  title,
  icon: Icon,
  accent,
  count,
  children,
}: {
  title: string;
  icon: React.ElementType;
  accent: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="py-2.5 px-3 border-b">
        <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wide">
          <Icon className={`h-3.5 w-3.5 ${accent}`} />
          {title}
          <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-1.5 max-h-[340px] overflow-y-auto">
        <div className="divide-y divide-border/60">{children}</div>
      </CardContent>
    </Card>
  );
}

function Row({
  title,
  subtitle,
  badge,
  badgeVariant = "outline",
  danger,
  right,
  onClick,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "outline" | "secondary" | "destructive";
  danger?: boolean;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
        onClick ? "cursor-pointer hover:bg-muted/60" : ""
      }`}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate leading-tight">{title}</p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {badge && (
        <Badge
          variant={danger ? "destructive" : badgeVariant}
          className="h-5 shrink-0 px-1.5 text-[10px] font-normal"
        >
          {badge}
        </Badge>
      )}
      {right && <div className="shrink-0 flex items-center gap-1">{right}</div>}
    </div>
  );
}

const CONTRACT_ISSUE_LABEL: Record<PendingContract["issue_type"], string> = {
  pending_setup: "Aguardando ativação",
  pending_signature: "Sem assinatura",
  adjustment_due: "Reajuste próximo",
  adjustment_overdue: "Reajuste atrasado",
  expiring: "A vencer",
  expired: "Vencido",
};

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

const AfazeresEmGestao = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canView = hasPermission("management_tasks", "view");
  const canEdit = hasPermission("management_tasks", "edit");

  const { data: leases = [] } = useLeases();
  const {
    receivables,
    payables,
    contracts,
    proposalFollowups,
    maintenances,
    totalCount,
    isLoading,
  } = useActionCenterPending();

  const [busyId, setBusyId] = useState<string | null>(null);

  const billingFollowups = useMemo(() => {
    return leases
      .filter(
        (lease) =>
          (lease.status === "active" || lease.status === "pending") &&
          !!(lease.tenant?.whatsapp || lease.tenant?.phone)
      )
      .map((lease) => {
        const rule = getBillingStage(lease);
        if (!rule) return null;
        const monthLabel = format(rule.dueDate, "MMMM/yyyy", { locale: ptBR });
        const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
        const { whatsappPhone, message } = generateBillingMessage(
          lease,
          rule.stage,
          capitalizedMonth
        );
        if (!whatsappPhone) return null;
        return {
          id: `${lease.id}-${rule.stage}`,
          lease,
          stage: rule.stage,
          stageLabel: rule.stageLabel,
          dueDate: rule.dueDate,
          phone: whatsappPhone,
          message,
        } satisfies BillingFollowup;
      })
      .filter((item): item is BillingFollowup => Boolean(item))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [leases]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const refreshAll = () => {
    [
      "action-center-receivables",
      "action-center-payables",
      "action-center-contracts",
      "action-center-proposals",
      "action-center-maintenances",
      "leases",
    ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const openLeaseById = (leaseId: string, status?: string | null) =>
    openLeaseRoute(navigate, { id: leaseId, status });

  const collectReceivable = (item: PendingReceivable) => {
    const phone = item.contact_phone ? formatPhoneForWhatsApp(item.contact_phone) : "";
    const message = `Olá${item.contact_name ? ` ${item.contact_name.split(" ")[0]}` : ""}! Passando para lembrar sobre *${item.description}* no valor de *${brl(item.amount)}*, com vencimento em ${format(new Date(item.due_date), "dd/MM/yyyy")}.`;
    navigate(`/whatsapp?${phone ? `phone=${phone}&` : ""}text=${encodeURIComponent(message)}`);
  };

  const markPayablePaid = async (item: PendingPayable) => {
    setBusyId(item.id);
    try {
      const { error } = await supabase
        .from("financial_transactions")
        .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] })
        .eq("id", item.id);
      if (error) throw error;
      toast.success("Despesa marcada como paga");
      queryClient.invalidateQueries({ queryKey: ["action-center-payables"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    } finally {
      setBusyId(null);
    }
  };

  const markProposalSent = async (item: PendingProposalFollowup) => {
    setBusyId(item.id);
    try {
      const { error } = await supabase
        .from("proposals")
        .update({
          status: item.kind === "draft" ? "sent" : "viewed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (error) throw error;
      toast.success(item.kind === "draft" ? "Proposta marcada como enviada" : "Follow-up concluído");
      queryClient.invalidateQueries({ queryKey: ["action-center-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    } finally {
      setBusyId(null);
    }
  };

  const completeMaintenance = async (item: PendingMaintenance) => {
    setBusyId(item.id);
    try {
      const { error } = await (supabase as any)
        .from("property_activities")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) throw error;
      toast.success("Manutenção concluída");
      queryClient.invalidateQueries({ queryKey: ["action-center-maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["activities-list"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grandTotal = totalCount + billingFollowups.length;

  return (
    <>
      <SEOHead
        title="Afazeres - Gestão"
        description="Acompanhe pendências financeiras, contratuais e de manutenção dos seus imóveis"
        path="/gestao/afazeres"
        noIndex={true}
      />
      <AppLayout title="Afazeres" titleExtra={<HelpTooltip featureKey="management.tasks" />}>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Afazeres</h1>
              <p className="text-xs text-muted-foreground">
                {grandTotal === 0
                  ? "Nenhuma pendência no momento"
                  : `${grandTotal} pendência${grandTotal > 1 ? "s" : ""} de financeiro, contratos, manutenções e propostas`}
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8" onClick={refreshAll}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Atualizar
            </Button>
          </div>

          {!canView ? (
            <div className="text-center py-16 border rounded-lg">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm font-medium">Você não tem permissão para visualizar afazeres.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fale com o administrador da sua conta.
              </p>
            </div>
          ) : isLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : grandTotal === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4 mb-3">
                  <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold mb-1">Tudo em dia!</h3>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  Não há pendências financeiras, contratuais ou de manutenção no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 items-start">
              {/* Contratos */}
              {contracts.length > 0 && (
                <SectionCard
                  title="Contratos"
                  icon={FileSignature}
                  accent="text-blue-500"
                  count={contracts.length}
                >
                  {contracts.map((c) => (
                    <Row
                      key={`${c.id}-${c.issue_type}`}
                      title={
                        c.property_name ? `${c.property_name} · ${c.unit_number}` : c.unit_number
                      }
                      subtitle={`${c.tenant_name} · ${brl(c.rent_amount)}${
                        c.issue_type === "expiring" || c.issue_type === "expired"
                          ? ` · até ${format(parseISO(c.end_date!), "dd/MM/yy")}`
                          : c.next_adjustment_date &&
                            c.issue_type.startsWith("adjustment")
                          ? ` · ${format(parseISO(c.next_adjustment_date), "dd/MM/yy")}`
                          : ""
                      }`}
                      badge={CONTRACT_ISSUE_LABEL[c.issue_type]}
                      danger={c.issue_type === "adjustment_overdue" || c.issue_type === "expired"}
                      onClick={() => openLeaseById(c.id, c.lease_status)}
                    />
                  ))}
                </SectionCard>
              )}

              {/* Financeiro a receber */}
              {receivables.length > 0 && (
                <SectionCard
                  title="A receber"
                  icon={ArrowDownCircle}
                  accent="text-red-500"
                  count={receivables.length}
                >
                  {receivables.map((r) => (
                    <Row
                      key={r.id}
                      title={r.description}
                      subtitle={[r.unit_number, r.contact_name].filter(Boolean).join(" · ")}
                      badge={
                        r.is_overdue
                          ? `${r.days_overdue}d atraso`
                          : format(new Date(r.due_date), "dd/MM")
                      }
                      danger={r.is_overdue}
                      right={
                        <>
                          <span className="text-xs font-semibold tabular-nums">
                            {brl(r.amount)}
                          </span>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Cobrar via WhatsApp"
                              onClick={() => collectReceivable(r)}
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          )}
                        </>
                      }
                    />
                  ))}
                </SectionCard>
              )}

              {/* Financeiro a pagar */}
              {payables.length > 0 && (
                <SectionCard
                  title="A pagar"
                  icon={ArrowUpCircle}
                  accent="text-amber-500"
                  count={payables.length}
                >
                  {payables.map((p) => (
                    <Row
                      key={p.id}
                      title={p.description}
                      subtitle={[p.unit_number, p.obligation_type].filter(Boolean).join(" · ")}
                      badge={
                        p.is_overdue
                          ? `${p.days_overdue}d atraso`
                          : format(new Date(p.due_date), "dd/MM")
                      }
                      danger={p.is_overdue}
                      right={
                        <>
                          <span className="text-xs font-semibold tabular-nums">
                            {brl(p.amount)}
                          </span>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Marcar como pago"
                              disabled={busyId === p.id}
                              onClick={() => markPayablePaid(p)}
                            >
                              {busyId === p.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                            </Button>
                          )}
                        </>
                      }
                    />
                  ))}
                </SectionCard>
              )}

              {/* Manutenções */}
              {maintenances.length > 0 && (
                <SectionCard
                  title="Manutenções pendentes"
                  icon={Wrench}
                  accent="text-orange-500"
                  count={maintenances.length}
                >
                  {maintenances.map((m) => (
                    <Row
                      key={m.id}
                      title={m.title}
                      subtitle={[
                        m.asset_label,
                        m.scheduled_at
                          ? format(new Date(m.scheduled_at), "dd/MM/yy", { locale: ptBR })
                          : "Sem data",
                        m.estimated_cost ? brl(m.estimated_cost) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      badge={m.is_overdue ? `${m.days_overdue}d atraso` : "Pendente"}
                      danger={m.is_overdue}
                      onClick={() => navigate("/gestao/manutencoes")}
                      right={
                        canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Concluir manutenção"
                            disabled={busyId === m.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              completeMaintenance(m);
                            }}
                          >
                            {busyId === m.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </SectionCard>
              )}

              {/* Régua de cobrança */}
              {billingFollowups.length > 0 && (
                <SectionCard
                  title="Régua de cobrança"
                  icon={MessageSquareWarning}
                  accent="text-primary"
                  count={billingFollowups.length}
                >
                  {billingFollowups.map((item) => (
                    <Row
                      key={item.id}
                      title={item.lease.tenant?.name || "Inquilino"}
                      subtitle={`${
                        item.lease.unit?.property?.name
                          ? `${item.lease.unit.property.name} · ${item.lease.unit?.unit_number}`
                          : item.lease.unit?.unit_number || "Contrato"
                      } · venc. ${format(item.dueDate, "dd/MM/yy")}`}
                      badge={item.stageLabel}
                      danger={item.stage === "overdue"}
                      right={
                        canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Cobrar via WhatsApp"
                            onClick={() =>
                              navigate(
                                `/whatsapp?phone=${formatPhoneForWhatsApp(item.phone)}&text=${encodeURIComponent(item.message)}`
                              )
                            }
                          >
                            <Send className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </SectionCard>
              )}

              {/* Propostas */}
              {proposalFollowups.length > 0 && (
                <SectionCard
                  title="Propostas"
                  icon={FileText}
                  accent="text-violet-500"
                  count={proposalFollowups.length}
                >
                  {proposalFollowups.map((p) => (
                    <Row
                      key={p.id}
                      title={p.lead_name}
                      subtitle={[
                        p.property_name || p.unit_number,
                        p.kind === "draft"
                          ? `criada em ${format(new Date(p.created_at), "dd/MM/yy")}`
                          : `enviada há ${Math.floor(p.hours_since_sent / 24)}d`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      badge={p.kind === "draft" ? "Não enviada" : "Follow-up"}
                      onClick={() => navigate("/crm/propostas")}
                      right={
                        canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title={p.kind === "draft" ? "Marcar enviada" : "Concluir follow-up"}
                            disabled={busyId === p.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              markProposalSent(p);
                            }}
                          >
                            {busyId === p.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </SectionCard>
              )}
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
};

export default AfazeresEmGestao;
