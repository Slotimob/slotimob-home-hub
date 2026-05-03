import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { TasksTab } from "@/components/assets/TasksTab";
import { SEOHead } from "@/components/SEOHead";
import { useProposals } from "@/hooks/useProposals";
import { useLeases, generateBillingMessage, type Lease } from "@/hooks/useLeases";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquareWarning, Send } from "lucide-react";
import { addDays, addMonths, format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneForWhatsApp } from "@/lib/utils";

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

const getBillingStage = (lease: Lease): { stage: BillingFollowup["stage"]; stageLabel: string; dueDate: Date } | null => {
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

const AfazeresEmGestao = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { proposals } = useProposals();
  const { data: leases = [] } = useLeases();

  const draftProposals = proposals.filter(
    (p) => p.status === "draft" || !p.status
  );

  const billingFollowups = useMemo(() => {
    return leases
      .filter((lease) => (lease.status === "active" || lease.status === "pending") && !!(lease.tenant?.whatsapp || lease.tenant?.phone))
      .map((lease) => {
        const rule = getBillingStage(lease);
        if (!rule) return null;

        const monthLabel = format(rule.dueDate, "MMMM/yyyy", { locale: ptBR });
        const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
        const { whatsappPhone, message } = generateBillingMessage(lease, rule.stage, capitalizedMonth);
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
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 8);
  }, [leases]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!user) return null;

  return (
    <>
      <SEOHead
        title="Afazeres - Gestão"
        description="Acompanhe pendências financeiras e contratuais dos seus imóveis"
        path="/gestao/afazeres"
        noIndex={true}
      />
      <AppLayout title="Afazeres" titleExtra={<HelpTooltip featureKey="management.tasks" />}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Afazeres</h1>
            <p className="text-muted-foreground">
              Acompanhe pendências financeiras e contratuais dos seus imóveis
            </p>
          </div>

          {/* Draft Proposals */}
          {draftProposals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Propostas Não Enviadas
                  <Badge variant="secondary" className="ml-auto">
                    {draftProposals.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {draftProposals.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.property?.name
                            ? `${p.property.name} - ${p.unit?.unit_number || ""}`
                            : p.unit?.unit_number || "Imóvel"}
                        </p>
                        {p.lead_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {p.lead_name} ·{" "}
                            {format(new Date(p.created_at), "dd/MM/yy", {
                              locale: ptBR,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/gestao/propostas")}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Enviar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {billingFollowups.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquareWarning className="h-4 w-4 text-primary" />
                  Régua de Cobrança em Acompanhamento
                  <Badge variant="secondary" className="ml-auto">
                    {billingFollowups.length}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Estes avisos aparecem automaticamente aqui quando uma etapa da régua é ativada no contrato.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {billingFollowups.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {item.lease.tenant?.name || "Inquilino"}
                        </p>
                        <Badge variant="outline">{item.stageLabel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.lease.unit?.property?.name
                          ? `${item.lease.unit.property.name} · ${item.lease.unit?.unit_number}`
                          : item.lease.unit?.unit_number || "Contrato"}
                        {" · Vencimento em "}
                        {format(item.dueDate, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/whatsapp?phone=${formatPhoneForWhatsApp(item.phone)}&text=${encodeURIComponent(item.message)}`
                        )
                      }
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Cobrar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <TasksTab />
        </div>
      </AppLayout>
    </>
  );
};

export default AfazeresEmGestao;
