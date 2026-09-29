import { useState, useMemo, useEffect } from "react";
import { formatDateOnly, toDateOnly } from "@/lib/date-only";
import { RegisterRentReceiptButton } from "@/components/assets/RegisterRentReceiptButton";
import { ConfirmLeaseProjectionDialog, type LeaseForProjection } from "@/components/assets/ConfirmLeaseProjectionDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, addMonths, isBefore, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Home,
  Building2,
  ArrowLeft,
  FileSignature,
  Receipt,
  Edit3,
  MoreVertical,
  XCircle,
  Trash2,
  Loader2,
  User,
  Mail,
  ExternalLink,
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Pencil,
  Route as RouteIcon,
  Scale,
  Zap,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettlementBreakdownPopover } from "@/components/finance/SettlementBreakdownPopover";
import { fetchSettlementGroups, settlementBreakdown } from "@/lib/settlement-group";
import { LeaseFinancialConditionsCard, computeLeaseMonthFromConfig } from "@/components/assets/LeaseFinancialConditionsCard";
import { useLeaseNextDue } from "@/hooks/useLeaseNextDue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { LeaseJourneyTab } from "@/components/assets/LeaseJourneyTab";
import { LeaseBoletos } from "@/components/assets/LeaseBoletos";
import { DimobStatusCard } from "@/components/assets/DimobStatusCard";
import { TenantStatementDialog } from "@/components/assets/TenantStatementDialog";
import { OwnerReportDialog } from "@/components/assets/OwnerReportDialog";
import { ConfigureObligationsDialog } from "@/components/assets/ConfigureObligationsDialog";
import { ContractGeneratorDialog } from "@/components/assets/ContractGeneratorDialog";
import { TerminateContractDialog } from "@/components/assets/TerminateContractDialog";
import { EditStartDateDialog } from "@/components/assets/EditStartDateDialog";
import {
  BillingEmailRemindersCard,
  BillingWhatsappManualCard,
  BillingReminderLogsCard,
} from "@/components/assets/BillingRulerCard";


import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { useUpdateLease } from "@/hooks/useLeases";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLeaseDeleteGuard, LeaseDeleteGuardNotice } from "@/components/assets/ContractsTab";
import { computeOwnerReport } from "@/lib/owner-report";
import { getLeaseUnitRefs, releaseLeaseUnits } from "@/lib/unit-status-sync";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from "sonner";
import {
  getLeaseStatusConfig,
  getSignatureStatus,
  getAdjustmentStatusConfig,
  isLeasePendingSetup,
} from "@/lib/lease-status";
import { invalidateLeaseQueries } from "@/lib/query-invalidation";
import { LeaseUnitsCard } from "@/components/assets/LeaseUnitsCard";
import { freeGraceCompetencies } from "@/lib/lease-obligations-inheritance";
import { todayInSaoPauloDateOnly } from "@/lib/date-only";
import { suggestSubscriptionStart } from "@/lib/lease-special-conditions";

export default function ContratoDetalhe() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") ?? undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateLease = useUpdateLease();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("management_contracts", "edit");
  const canDelete = hasPermission("management_contracts", "delete");

  const [activeTab, setActiveTab] = useState("journey");
  const [showTenantStatement, setShowTenantStatement] = useState(false);
  const [showOwnerReport, setShowOwnerReport] = useState(false);
  const [showObligationsDialog, setShowObligationsDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showEditStartDateDialog, setShowEditStartDateDialog] = useState(false);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: deleteGuard, isLoading: deleteGuardLoading } = useLeaseDeleteGuard(id, deleteDialogOpen);
  const [isDeleting, setIsDeleting] = useState(false);

  const [projectionOpen, setProjectionOpen] = useState(false);

  const { data: lease, isLoading, refetch } = useQuery({
    queryKey: ["lease-detail", id, effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select(
          `id, unit_id, broker_id, rent_amount, admin_fee_percentage, due_day,
           deposit_amount, adjustment_index, next_adjustment_date, start_date,
           end_date, contract_status, status, tenant_contact_id, owner_contact_id,
           cib, is_dimob_deductible, notes, billing_automation, billing_logs,
           metadata, signature_status, signed_contract_path, termination_date,
           fire_insurance, iptu_charge, additional_obligations,
           termination_reason, guarantee_type, guarantor_data, payment_info,
           is_indefinite_term, adjustment_periodicity_months, unit_subdivision_id,
           rent_grace, rent_deductions, rent_withholding,
           tenant_contact:contacts!leases_tenant_contact_id_fkey(id, name, email, phone, whatsapp),
           unit:units!leases_unit_id_fkey(id, unit_number, address)`
        )
        .eq("id", id!)
        .eq("broker_id", effectiveBrokerId || user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user && !!id,
  });

  const { data: subdivisionLabel } = useQuery({
    queryKey: ["lease-subdivision-label", lease?.unit_subdivision_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("unit_subdivisions")
        .select("label")
        .eq("id", lease!.unit_subdivision_id)
        .maybeSingle();
      return (data?.label as string) || null;
    },
    enabled: !!lease?.unit_subdivision_id,
  });

  // C6: aluguel pendente mais antigo; sem lançamento, pela configuração (pula carência isenta)
  const nextDue = useLeaseNextDue(lease as any);
  const nextDueDate = useMemo(
    () => (nextDue ? new Date(`${nextDue.dueDate}T00:00:00`) : null),
    [nextDue?.dueDate],
  );

  const billingStatus = useMemo(() => {
    if (!lease || !nextDueDate) return { reminder5: false, dueDay: false, overdue: false };
    const today = new Date();
    const reminder5Date = addDays(nextDueDate, -5);
    return {
      reminder5: isBefore(reminder5Date, today) || isToday(reminder5Date),
      dueDay: isToday(nextDueDate),
      overdue: isBefore(nextDueDate, today),
    };
  }, [lease, nextDueDate]);

  // Recent transactions for the "Situação dos Últimos 3 Meses" card
  const { data: recentTransactions } = useQuery({
    queryKey: ["recent-lease-transactions", lease?.id, effectiveBrokerId],
    queryFn: async () => {
      if (!lease) return [];
      const nowSp = todayInSaoPauloDateOnly();
      const [yy, mm] = nowSp.split("-").map(Number);
      const rangeStart = toDateOnly(new Date(yy, mm - 3, 1));
      const rangeEnd = toDateOnly(new Date(yy, mm, 0));
      // Mesmo regime do relatório: pagos pela data do pagamento, abertos pelo vencimento.
      const base = () =>
        supabase
          .from("financial_transactions")
          .select("id, amount, due_date, paid_date, status, description, type, obligation_type, settlement_group_id, competency_period, lease_id")
          .eq("broker_id", effectiveBrokerId || user!.id)
          .or(`lease_id.eq.${lease.id},reference.like.lease:${lease.id}%`)
          .neq("status", "cancelled");
      const [paidRes, openRes] = await Promise.all([
        base().eq("status", "paid").gte("paid_date", rangeStart).lte("paid_date", rangeEnd).limit(60),
        base().neq("status", "paid").gte("due_date", rangeStart).lte("due_date", rangeEnd).limit(60),
      ]);
      if (paidRes.error) throw paidRes.error;
      if (openRes.error) throw openRes.error;
      const refDate = (t: any) => (t.status === "paid" ? t.paid_date || t.due_date : t.due_date) || "";
      const data = [...(paidRes.data || []), ...(openRes.data || [])].sort((a, b) => refDate(a).localeCompare(refDate(b)));
      // Baixa conjunta: o grupo vira UMA linha (âncora = receita de aluguel) com o líquido.
      const isAnchor = (t: any) =>
        t.type === "income" &&
        (!t.obligation_type || t.obligation_type === "rent" || t.obligation_type === "rent_balance");
      const rows = (data || []).filter((t: any) => !t.settlement_group_id || isAnchor(t));
      const groupIds = rows.map((t: any) => t.settlement_group_id).filter(Boolean) as string[];
      const groups = groupIds.length ? await fetchSettlementGroups(groupIds) : {};
      return rows.slice(0, 6).map((t: any) => {
        const lines = t.settlement_group_id ? groups[t.settlement_group_id] : null;
        if (!lines || lines.length < 2) return t;
        const breakdown = settlementBreakdown(lines);
        return { ...t, amount: breakdown.net, breakdown };
      });
    },
    enabled: !!user && !!lease,
  });

  // Relatório do proprietário do mês corrente: mesmo cálculo do "Relatório Completo".
  const { data: ownerMonthTx } = useQuery({
    queryKey: ["contract-owner-month", lease?.id, lease?.unit_id],
    queryFn: async () => {
      const nowSp = todayInSaoPauloDateOnly();
      const [yy, mm] = nowSp.split("-").map(Number);
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("unit_id", lease!.unit_id)
        .eq("status", "paid")
        .gte("paid_date", toDateOnly(new Date(yy, mm - 1, 1)))
        .lte("paid_date", toDateOnly(new Date(yy, mm, 0)));
      if (error) throw error;
      const rows = data || [];
      return {
        income: rows.filter((t: any) => t.type === "income"),
        expenses: rows.filter((t: any) => t.type === "expense"),
      };
    },
    enabled: !!user && !!lease?.unit_id,
  });

  const { data: brokerProfile } = useQuery({
    queryKey: ["broker-profile", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profile_directory")
        .select("full_name")
        .eq("id", effectiveBrokerId || user!.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user,
  });

  const { data: whatsappConnection } = useQuery({
    queryKey: ["whatsapp-connection", effectiveBrokerId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_connections")
        .select("id, phone_number, status, instance_name, evolution_api_url")
        .eq("broker_id", effectiveBrokerId || user!.id)
        .eq("status", "connected")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const hasWhatsappConnected = !!whatsappConnection;

  const ownerHasTx =
    !!ownerMonthTx &&
    (ownerMonthTx.income.length > 0 || ownerMonthTx.expenses.length > 0) &&
    !(lease?.start_date && todayInSaoPauloDateOnly() < lease.start_date.slice(0, 10));

  const capitalizedMonth = useMemo(() => {
    const m = format(new Date(), "MMMM/yyyy", { locale: ptBR });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }, []);

  // Guarda: contrato ainda não configurado não tem tela de detalhe — vai para o wizard
  useEffect(() => {
    if (lease && isLeasePendingSetup(lease.status)) {
      navigate(`/gestao/contratos/novo?edit=${lease.id}`, { replace: true });
    }
  }, [lease?.id, lease?.status, navigate]);

  const confirmDeleteLease = async () => {
    if (!lease || !user) return;
    setIsDeleting(true);
    try {
      await supabase
        .from("financial_transactions")
        .delete()
        .eq("broker_id", effectiveBrokerId || user.id)
        .eq("reference", `lease:${lease.id}`);

      // Captura os imóveis antes da exclusão (lease_units cai em cascata)
      const leaseUnitRefs = await getLeaseUnitRefs(lease.id);

      const { error } = await supabase
        .from("leases")
        .delete()
        .eq("id", lease.id)
        .eq("broker_id", effectiveBrokerId || user.id);
      if (error) throw error;

      // Libera só os imóveis sem outro contrato vivo e sincroniza o status
      await releaseLeaseUnits(
        lease.id,
        leaseUnitRefs.length
          ? leaseUnitRefs
          : [{ unit_id: lease.unit_id, unit_subdivision_id: (lease as any).unit_subdivision_id ?? null }]
      );


      sonnerToast.success("Contrato excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      navigate("/gestao/contratos");
    } catch {
      sonnerToast.error("Erro ao excluir contrato");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Not authenticated guard (AuthGuard already protects the route)
  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="Detalhe do Contrato">
        <SEOHead title="Detalhe do Contrato" description="Detalhes do contrato" path={`/gestao/contratos?id=${id}`} noIndex />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!lease) {
    return (
      <AppLayout title="Detalhe do Contrato">
        <SEOHead title="Contrato não encontrado" description="Contrato não encontrado" path={`/gestao/contratos?id=${id}`} noIndex />
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="py-10 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Contrato não encontrado.</p>
            <Button variant="outline" onClick={() => navigate("/gestao/contratos")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para contratos
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const statusConfig = getLeaseStatusConfig(lease.status);
  const signatureConfig = getSignatureStatus(lease.signature_status);
  const adjustmentConfig = getAdjustmentStatusConfig(lease.next_adjustment_date);
  const tenant = lease.tenant_contact;

  // Cobrança pelo LÍQUIDO da competência estável (depois da carência e dos abatimentos parcelados)
  const boletoDefaults = (() => {
    const sug = suggestSubscriptionStart(lease as any, todayInSaoPauloDateOnly());
    const f = sug.figures;
    const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const breakdown =
      f.deductions > 0 || f.irrf > 0 || f.grace > 0
        ? `Aluguel ${fmt(f.gross)}${f.grace > 0 ? ` − carência ${fmt(f.grace)}` : ""} − abatimentos ${fmt(f.deductions)} − IRRF ${fmt(f.irrf)} = líquido ${fmt(f.net)}`
        : null;
    return { amount: sug.amount, breakdown, firstDue: sug.firstDue, differentMonths: sug.differentMonths };
  })();
  const unit = lease.unit;
  const isSigned = lease.signature_status === "signed";

  return (
    <AppLayout title="Detalhe do Contrato">
      <SEOHead title="Detalhe do Contrato" description={`Contrato ${unit?.unit_number ?? ""}`} path={`/gestao/contratos?id=${id}`} noIndex />

      {/* Header */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground" onClick={() => navigate("/gestao/contratos")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Contratos
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {unit?.address ? <Building2 className="h-5 w-5" /> : <Home className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">
                  {unit?.unit_number ?? "Unidade"}
                  {subdivisionLabel ? ` · ${subdivisionLabel}` : ""}
                </h2>
                {unit?.address && <p className="text-sm text-muted-foreground truncate">{unit.address}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  <Badge variant="outline" className={cn("text-xs", signatureConfig.className)}>
                    {signatureConfig.label}
                  </Badge>
                  <Badge variant={adjustmentConfig.variant} className={cn("text-xs", adjustmentConfig.className)}>
                    {adjustmentConfig.label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowContractDialog(true)}>
                <FileSignature className="h-4 w-4 mr-1.5" />
                Gerar PDF
              </Button>
              <RegisterRentReceiptButton lease={lease} />
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/gestao/contratos/novo?edit=${lease.id}`)}>
                  <Edit3 className="h-4 w-4 mr-1.5" />
                  Editar
                </Button>
              )}
              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Mais ações do contrato">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem
                        disabled={lease.status === "terminated"}
                        onClick={() => setProjectionOpen(true)}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Gerar lançamentos
                      </DropdownMenuItem>
                    )}
                    {canEdit && <DropdownMenuSeparator />}
                    {canEdit && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={lease.status === "terminated"}
                        onClick={() => setTerminateDialogOpen(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Encerrar Locação
                      </DropdownMenuItem>
                    )}
                    {canEdit && canDelete && <DropdownMenuSeparator />}
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Contrato
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* MOB1: rolagem horizontal no celular, ícone + texto em todas as abas */}
        <div className="-mx-1 overflow-x-auto px-1">
        <TabsList className="inline-flex w-max min-w-full justify-start sm:grid sm:w-full sm:grid-cols-6">
          <TabsTrigger value="journey" className="gap-1 text-xs px-2 sm:px-1 shrink-0">
            <RouteIcon className="h-3.5 w-3.5" />
            <span>Jornada</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs px-2 sm:px-1 shrink-0">Visão Geral</TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-1 text-xs px-2 sm:px-1 shrink-0">
            <Scale className="h-3.5 w-3.5" />
            <span>Fiscal</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-xs px-2 sm:px-1 shrink-0">Cobrança</TabsTrigger>
          <TabsTrigger value="boletos" className="text-xs px-2 sm:px-1 shrink-0">Boletos</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs px-2 sm:px-1 shrink-0">Relatórios</TabsTrigger>
        </TabsList>
        </div>

        {/* Journey */}
        <TabsContent value="journey" className="mt-4">
          <LeaseJourneyTab
            lease={{
              id: lease.id,
              unit_id: lease.unit_id,
              status: lease.status,
              signature_status: lease.signature_status,
              signed_contract_path: lease.signed_contract_path,
              metadata: lease.metadata as any,
              termination_date: lease.termination_date,
            }}
            unitId={lease.unit_id}
            fullLeaseData={{
              id: lease.id,
              start_date: lease.start_date,
              rent_amount: lease.rent_amount,
              next_adjustment_date: lease.next_adjustment_date,
              adjustment_index: lease.adjustment_index,
              end_date: lease.end_date,
              is_indefinite_term: lease.is_indefinite_term ?? null,
              due_day: lease.due_day,
              tenant_contact_id: lease.tenant_contact_id,
              owner_contact_id: lease.owner_contact_id ?? null,
              property_id: lease.property_id,
              fire_insurance: lease.fire_insurance ?? null,
              iptu_charge: lease.iptu_charge ?? null,
              additional_obligations: lease.additional_obligations ?? null,
              rent_grace: lease.rent_grace ?? null,
              rent_deductions: lease.rent_deductions ?? null,
              rent_withholding: lease.rent_withholding ?? null,
              admin_fee_percentage: lease.admin_fee_percentage ?? null,
              unit: unit,
              tenant: tenant,
            }}
            onEditContract={canEdit ? () => navigate(`/gestao/contratos/novo?edit=${lease.id}`) : undefined}
            onConfigureObligations={() => setShowObligationsDialog(true)}
            onDownloadPdf={() => setShowContractDialog(true)}
            onTerminate={canEdit ? () => setTerminateDialogOpen(true) : undefined}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Status de Ocupação</CardTitle>
                <Badge
                  variant="default"
                  className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
                >
                  Ocupado
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tenant?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{tenant?.email}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between col-span-2 pb-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Início do Contrato</p>
                    <p className="font-semibold text-sm">{formatDateOnly(lease.start_date, "dd/MM/yyyy")}</p>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowEditStartDateDialog(true)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Aluguel</p>
                  <p className="font-semibold">
                    {Number(lease.rent_amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Vencimento</p>
                  <p className="font-semibold">Dia {lease.due_day}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Taxa Adm.</p>
                  <p className="font-semibold">{lease.admin_fee_percentage}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Próximo Venc.</p>
                  <p className="font-semibold">{nextDueDate ? format(nextDueDate, "dd/MM/yyyy") : "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment health (estimated by overdue) */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Saúde do Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="flex items-center gap-2">
                {billingStatus.overdue ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-400 font-medium">Em atraso</span>
                  </>
                ) : billingStatus.dueDay ? (
                  <>
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Vence hoje</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-700 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">Em dia</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <LeaseUnitsCard leaseId={lease.id} canEdit={canEdit} />

          <LeaseFinancialConditionsCard lease={lease as any} canEdit={canEdit} />
        </TabsContent>

        {/* Fiscal */}
        <TabsContent value="fiscal" className="space-y-4 mt-4">
          <DimobStatusCard
            unitId={lease.unit_id}
            onEditUnit={canEdit ? () => navigate(`/units?edit=${lease.unit_id}`) : undefined}
            onCreateLease={() => {}}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-4 mt-4">
          <BillingEmailRemindersCard
            leaseId={lease.id}
            brokerId={lease.broker_id ?? effectiveBrokerId}
            billingAutomation={(lease.billing_automation as Record<string, any>) || null}
            tenantEmail={lease.tenant_contact?.email ?? null}
            canEdit={canEdit}
          />

          <BillingWhatsappManualCard
            leaseId={lease.id}
            brokerId={lease.broker_id ?? effectiveBrokerId}
            tenantContactId={lease.tenant_contact_id ?? null}
            billingContactId={
              (lease.billing_automation as Record<string, any>)?.billing_contact?.contact_id ?? null
            }
            hasWhatsappConnected={hasWhatsappConnected}
          />

          <BillingReminderLogsCard leaseId={lease.id} />
        </TabsContent>

        {/* Boletos */}
        <TabsContent value="boletos" className="mt-4">
          <LeaseBoletos
            leaseId={lease.id}
            brokerId={effectiveBrokerId || user!.id}
            rentAmount={boletoDefaults.amount}
            amountBreakdown={boletoDefaults.breakdown}
            suggestedFirstDue={boletoDefaults.firstDue}
            differentMonths={boletoDefaults.differentMonths}
            dueDay={lease.due_day ?? null}
            billingAutomation={(lease.billing_automation as Record<string, any>) || null}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-500" />
                Relatório do Proprietário — {ownerHasTx ? `Recebido em ${capitalizedMonth} (data do pagamento)` : "Mês típico"}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              {(() => {
                const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                const feePct = Number(lease.admin_fee_percentage) || 0;
                const hasTx = ownerHasTx;
                // R4: sem pagamento no mês (ou antes do início), "Mês típico" pela configuração
                const cfg = computeLeaseMonthFromConfig(lease as any);
                const rep = hasTx
                  ? computeOwnerReport({ income: ownerMonthTx!.income as any, expenses: ownerMonthTx!.expenses as any, adminFeePercentage: feePct })
                  : (() => {
                      const gross = Math.max(0, cfg.gross - cfg.grace);
                      const adminFee = Math.round(gross * feePct) / 100;
                      return {
                        rentGross: gross, rentAdditions: 0, rentIrrf: cfg.irrf, rentDeductions: cfg.deductions,
                        rentDiscounts: 0, rentNet: cfg.net, otherIncome: 0, adminFee, totalExpenses: 0,
                        netTransfer: Math.round((cfg.net - adminFee) * 100) / 100,
                      };
                    })();
                const line = (label: string, v: number, sign: "+" | "-" | "", cls = "") => (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn("font-medium", cls)}>{sign}{fmt(v)}</span>
                  </div>
                );
                return (
                  <div className="space-y-2 text-sm">
                    {line("Aluguel bruto", rep.rentGross, "")}
                    {rep.rentAdditions > 0 && line("Multa/juros e acréscimos", rep.rentAdditions, "+")}
                    {rep.rentDeductions > 0 && line("Abatimentos do mês", rep.rentDeductions, "-", "text-destructive")}
                    {rep.rentIrrf > 0 && line("IRRF retido", rep.rentIrrf, "-", "text-destructive")}
                    {rep.rentDiscounts > 0 && line("Descontos", rep.rentDiscounts, "-", "text-destructive")}
                    {rep.otherIncome > 0 && line("Outras receitas", rep.otherIncome, "+")}
                    {line(`Taxa Administração (${feePct}%)`, rep.adminFee, "-", "text-destructive")}
                    {rep.totalExpenses > 0 && line("Outras despesas", rep.totalExpenses, "-", "text-destructive")}
                    {nextDueDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Próximo vencimento</span>
                        <span className="font-medium">
                          {format(nextDueDate, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">{hasTx ? "Repasse líquido" : "Repasse líquido do mês típico"}</span>
                      <span className="font-bold text-emerald-600 text-base">{fmt(rep.netTransfer)}</span>
                    </div>
                    {!hasTx && (
                      <p className="text-[11px] text-muted-foreground">Mês típico, estimado pela configuração (aluguel − abatimentos − IRRF − taxa de administração).</p>
                    )}
                  </div>
                );
              })()}
              <Button className="w-full mt-3" variant="outline" size="sm" onClick={() => setShowOwnerReport(true)}>
                <Download className="h-4 w-4 mr-2" />
                Gerar Relatório Completo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Situação dos Últimos 3 Meses
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              {!recentTransactions || recentTransactions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Sem recebimentos nem vencimentos nos últimos 3 meses.
                </p>
              ) : (
                <div className="divide-y">
                  {recentTransactions.map((t: any) => {
                    const due = t.due_date ? new Date(t.due_date + "T00:00:00") : null;
                    const paid = t.paid_date ? new Date(t.paid_date + "T00:00:00") : null;
                    const today = new Date();
                    const isPaid = t.status === "paid" || !!paid;
                    const monthRef = isPaid && paid ? paid : due;
                    const isOverdue = !isPaid && due && due < today;
                    const statusLabel = isPaid ? "Pago" : isOverdue ? "Atrasado" : "Pendente";
                    const statusClass = isPaid
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                      : isOverdue
                      ? "bg-red-100 text-red-700 border-red-300"
                      : "bg-amber-100 text-amber-700 border-amber-300";
                    return (
                      <div key={t.id} className="flex items-center justify-between py-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {monthRef ? format(monthRef, "MMM/yyyy", { locale: ptBR }) : "—"}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {paid ? `Pago em ${format(paid, "dd/MM/yyyy")}` : due ? `Vence ${format(due, "dd/MM/yyyy")}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0 mr-2">
                          <p className="font-medium">
                            {Number(t.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                          {t.breakdown && (
                            <SettlementBreakdownPopover breakdown={t.breakdown} paid={isPaid}>
                              <button type="button" className="text-[10px] text-muted-foreground underline-offset-2 hover:underline">
                                detalhe
                              </button>
                            </SettlementBreakdownPopover>
                          )}
                        </div>
                        <Badge variant="outline" className={cn("text-[10px]", statusClass)}>
                          {statusLabel}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Extrato do Inquilino
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <p className="text-xs text-muted-foreground mb-3">
                Gere um extrato detalhado com histórico de pagamentos para enviar ao inquilino.
              </p>
              <Button className="w-full" size="sm" onClick={() => setShowTenantStatement(true)}>
                <Download className="h-4 w-4 mr-2" />
                Gerar Extrato PDF
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Overlay dialogs */}
      <TenantStatementDialog open={showTenantStatement} onOpenChange={setShowTenantStatement} lease={{ ...lease, tenant } as any} />
      <OwnerReportDialog open={showOwnerReport} onOpenChange={setShowOwnerReport} lease={{ ...lease, tenant } as any} />
      <ConfigureObligationsDialog
        open={showObligationsDialog}
        onOpenChange={async (open) => {
          setShowObligationsDialog(open);
          if (!open) {
            await invalidateLeaseQueries(queryClient);
            refetch();
          }
        }}
        unitId={lease.unit_id}
        unitName={unit?.unit_number ?? ""}
        leaseId={lease.id}
        billingRemindersEnabled={(lease as any).billing_automation?.enabled === true}
        onSaved={async () => {
          try {
            await supabase
              .from("leases")
              .update({
                metadata: {
                  ...(lease.metadata || {}),
                  obligations_configured: true,
                  obligations_pending_review: false,
                },
              })
              .eq("id", lease.id);
            await invalidateLeaseQueries(queryClient);
            refetch();
          } catch {
            /* silently fail */
          }
        }}
      />
      <ContractGeneratorDialog open={showContractDialog} onOpenChange={setShowContractDialog} unitId={lease.unit_id} leaseId={lease.id} />
      <EditStartDateDialog
        open={showEditStartDateDialog}
        onOpenChange={setShowEditStartDateDialog}
        lease={{ id: lease.id, start_date: lease.start_date, unit: unit, tenant: tenant } as any}
        onSuccess={async () => {
          await invalidateLeaseQueries(queryClient);
          refetch();
        }}
      />
      <TerminateContractDialog
        open={terminateDialogOpen}
        onOpenChange={setTerminateDialogOpen}
        lease={{ id: lease.id, unit_id: lease.unit_id, unit: unit, tenant_contact: tenant } as any}
        onSuccess={async () => {
          await invalidateLeaseQueries(queryClient);
          refetch();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Contrato Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                Você está prestes a excluir o contrato do imóvel{" "}
                <strong>{unit?.unit_number}</strong> com o inquilino <strong>{tenant?.name}</strong>.
              </span>
              <LeaseDeleteGuardNotice
                guard={deleteGuard}
                loading={deleteGuardLoading}
                onTerminate={() => {
                  setDeleteDialogOpen(false);
                  setTerminateDialogOpen(true);
                }}
              />
              <span className="block p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <span className="block text-sm font-medium text-destructive">
                  ⚠️ Atenção: Esta ação é irreversível!
                </span>
                <span className="block text-sm text-muted-foreground mt-2">
                  • O registro será excluído permanentemente do banco de dados<br />
                  • Os lançamentos pendentes do contrato serão removidos<br />
                  • O imóvel será liberado para novas locações<br />
                  • Os dados não poderão ser recuperados
                </span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLease}
              disabled={isDeleting || deleteGuardLoading || !deleteGuard || deleteGuard.paid > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Excluindo...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Sim, Excluir Permanentemente</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConfirmLeaseProjectionDialog
        open={projectionOpen}
        onOpenChange={setProjectionOpen}
        lease={lease as unknown as LeaseForProjection}
      />
    </AppLayout>
  );
}
