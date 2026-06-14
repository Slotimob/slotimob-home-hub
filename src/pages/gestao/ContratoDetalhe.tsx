import { useState, useMemo, useEffect } from "react";
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
  MessageSquare,
  ExternalLink,
  Calendar,
  Plus,
  Phone,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Pencil,
  Route as RouteIcon,
  Scale,
  Zap,
  Save,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DimobStatusCard } from "@/components/assets/DimobStatusCard";
import { TenantStatementDialog } from "@/components/assets/TenantStatementDialog";
import { OwnerReportDialog } from "@/components/assets/OwnerReportDialog";
import { ConfigureObligationsDialog } from "@/components/assets/ConfigureObligationsDialog";
import { ContractGeneratorDialog } from "@/components/assets/ContractGeneratorDialog";
import { TerminateContractDialog } from "@/components/assets/TerminateContractDialog";
import { EditStartDateDialog } from "@/components/assets/EditStartDateDialog";

import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useUpdateLease, generateBillingMessage, type BillingLog, type BillingAutomation } from "@/hooks/useLeases";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn, formatPhoneForWhatsApp } from "@/lib/utils";
import { toast as sonnerToast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  pending_signature: { label: "Aguardando Assinatura", variant: "secondary" },
  expired: { label: "Expirado", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
  terminated: { label: "Encerrado", variant: "outline" },
  pending: { label: "Pendente", variant: "secondary" },
};

export default function ContratoDetalhe() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") ?? undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateLease = useUpdateLease();

  const [activeTab, setActiveTab] = useState("journey");
  const [showTenantStatement, setShowTenantStatement] = useState(false);
  const [showOwnerReport, setShowOwnerReport] = useState(false);
  const [showObligationsDialog, setShowObligationsDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showEditStartDateDialog, setShowEditStartDateDialog] = useState(false);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showBillingLogForm, setShowBillingLogForm] = useState(false);
  const [billingLogForm, setBillingLogForm] = useState({
    sent_by: "",
    method: "whatsapp" as "whatsapp" | "email" | "phone" | "in_person" | "other",
    notes: "",
    sent_to: "",
  });
  const [logsLimit, setLogsLimit] = useState(20);

  const [isEditingCib, setIsEditingCib] = useState(false);
  const [editedCib, setEditedCib] = useState("");

  const [automationForm, setAutomationForm] = useState({
    email_enabled: false,
    email_destination: "",
    whatsapp_enabled: false,
  });
  const [savingAutomation, setSavingAutomation] = useState(false);

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
           termination_reason, guarantee_type, guarantor_data, payment_info,
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

  const nextDueDate = useMemo(() => {
    if (!lease) return null;
    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth(), lease.due_day);
    return isBefore(current, today) ? addMonths(current, 1) : current;
  }, [lease]);

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
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const { data } = await supabase
        .from("financial_transactions")
        .select("id, amount, due_date, payment_date, status, description, type")
        .eq("broker_id", effectiveBrokerId || user!.id)
        .like("reference", `lease:${lease.id}%`)
        .gte("due_date", threeMonthsAgo.toISOString().split("T")[0])
        .order("due_date", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!user && !!lease,
  });

  const { data: brokerProfile } = useQuery({
    queryKey: ["broker-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", effectiveBrokerId || user!.id)
        .maybeSingle();
      return data;
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

  const capitalizedMonth = useMemo(() => {
    const m = format(new Date(), "MMMM/yyyy", { locale: ptBR });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }, []);

  const handleAutomationToggle = async (key: keyof BillingAutomation, value: boolean) => {
    if (!lease) return;
    try {
      const currentAutomation = { ...(lease.billing_automation || {}) };
      await updateLease.mutateAsync({
        id: lease.id,
        data: {
          billing_automation: { ...currentAutomation, [key]: value } as BillingAutomation,
        },
      });
      toast({ title: "Configuração atualizada!" });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  // Calcular fora do useEffect para ser usado como dependência estável
  const billingAutomationKey = JSON.stringify(lease?.billing_automation);

  // Hydrate automation form when lease loads
  useEffect(() => {
    const auto: any = (lease as any)?.billing_automation;
    if (auto) {
      setAutomationForm({
        email_enabled: !!auto.email_enabled,
        email_destination: auto.email_destination || lease?.tenant_contact?.email || "",
        whatsapp_enabled: !!auto.whatsapp_enabled,
      });
    }
  }, [billingAutomationKey, lease?.tenant_contact?.email]);

  const handleSaveAutomation = async () => {
    if (!lease) return;
    setSavingAutomation(true);
    try {
      const currentAutomation = { ...(lease.billing_automation || {}) };
      await updateLease.mutateAsync({
        id: lease.id,
        data: {
          billing_automation: {
            ...currentAutomation,
            email_enabled: automationForm.email_enabled,
            email_destination: automationForm.email_destination,
            whatsapp_enabled: automationForm.whatsapp_enabled,
          } as BillingAutomation,
        },
      });
      toast({ title: "Configurações salvas com sucesso" });
    } catch {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleSaveCib = async () => {
    if (!lease) return;
    try {
      const { error } = await supabase.from("units").update({ cib: editedCib || null }).eq("id", lease.unit_id);
      if (error) throw error;
      toast({ title: "CIB atualizado com sucesso!" });
      setIsEditingCib(false);
      queryClient.invalidateQueries({ queryKey: ["units"] });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const confirmDeleteLease = async () => {
    if (!lease || !user) return;
    setIsDeleting(true);
    try {
      await supabase
        .from("financial_transactions")
        .delete()
        .eq("broker_id", effectiveBrokerId || user.id)
        .eq("reference", `lease:${lease.id}`);

      await supabase
        .from("units")
        .update({ is_occupied: false, tenant_contact_id: null })
        .eq("id", lease.unit_id);

      const { error } = await supabase
        .from("leases")
        .delete()
        .eq("id", lease.id)
        .eq("broker_id", effectiveBrokerId || user.id);
      if (error) throw error;

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

  // Not authenticated guard
  if (!user) {
    navigate("/auth");
    return null;
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

  const statusConfig = STATUS_LABELS[lease.status] || STATUS_LABELS.active;
  const tenant = lease.tenant_contact;
  const tenantWhatsApp = tenant?.whatsapp || tenant?.phone || null;
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
                <h2 className="text-lg font-bold truncate">{unit?.unit_number ?? "Unidade"}</h2>
                {unit?.address && <p className="text-sm text-muted-foreground truncate">{unit.address}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      isSigned
                        ? "border-green-500/30 text-green-700 bg-green-500/10"
                        : "border-amber-500/30 text-amber-700 bg-amber-500/10"
                    )}
                  >
                    {isSigned ? "Assinado" : "Pendente assinatura"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowContractDialog(true)}>
                <FileSignature className="h-4 w-4 mr-1.5" />
                Gerar PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/finance/transactions?unitId=${lease.unit_id}&action=new`)}
              >
                <Receipt className="h-4 w-4 mr-1.5" />
                Registrar Pagamento
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/gestao/contratos/novo?edit=${lease.id}`)}>
                <Edit3 className="h-4 w-4 mr-1.5" />
                Editar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={lease.status === "terminated"}
                    onClick={() => setTerminateDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Encerrar Locação
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Contrato
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="journey" className="gap-1 text-xs px-1">
            <RouteIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Jornada</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs px-1">Visão Geral</TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-1 text-xs px-1">
            <Scale className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fiscal</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-xs px-1">Cobrança</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs px-1">Relatórios</TabsTrigger>
        </TabsList>

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
              unit: unit,
              tenant: tenant,
            }}
            onEditContract={() => navigate(`/gestao/contratos/novo?edit=${lease.id}`)}
            onConfigureObligations={() => setShowObligationsDialog(true)}
            onDownloadPdf={() => setShowContractDialog(true)}
            onTerminate={() => setTerminateDialogOpen(true)}
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
                  className="bg-green-500/15 text-green-600 border-green-500/30"
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
                    <p className="font-semibold text-sm">{format(new Date(lease.start_date), "dd/MM/yyyy")}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowEditStartDateDialog(true)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
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

          {/* CIB */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">CIB - Cadastro Imobiliário</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-3.5 w-3.5 text-primary" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p><strong>IMPORTANTE:</strong> O CIB é o identificador único do imóvel na Receita Federal. Obrigatório para a declaração DIMOB.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (isEditingCib) handleSaveCib();
                    else {
                      setEditedCib(lease.cib || "");
                      setIsEditingCib(true);
                    }
                  }}
                >
                  {isEditingCib ? "Salvar" : "Editar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-4">
              {isEditingCib ? (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Número CIB</Label>
                  <Input
                    value={editedCib}
                    onChange={(e) => setEditedCib(e.target.value)}
                    placeholder="Ex: 12345678901234567890"
                    className="h-8 font-mono"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">CIB: {lease.cib || "-"}</p>
              )}
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
                    <span className="text-sm text-red-600 font-medium">Em atraso</span>
                  </>
                ) : billingStatus.dueDay ? (
                  <>
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-yellow-600 font-medium">Vence hoje</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">Em dia</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiscal */}
        <TabsContent value="fiscal" className="space-y-4 mt-4">
          <DimobStatusCard
            unitId={lease.unit_id}
            onEditUnit={() => navigate(`/units?edit=${lease.unit_id}`)}
            onCreateLease={() => {}}
          />
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-4 mt-4">
          {/* Card 1: Automação de Cobrança */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Automação de Cobrança
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Configure os canais e destinatários para envio automático das cobranças.
              </p>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-4">
              {/* Email panel */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">E-mail</p>
                        {automationForm.email_enabled && automationForm.email_destination && (
                          <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-700 bg-green-500/10">
                            Configurado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Enviado em seu nome pela plataforma</p>
                    </div>
                  </div>
                  <Switch
                    checked={automationForm.email_enabled}
                    onCheckedChange={(v) => setAutomationForm((p) => ({ ...p, email_enabled: v }))}
                  />
                </div>
                {automationForm.email_enabled && (
                  <div className="space-y-3">
                    <div className="rounded-md bg-muted/50 border border-border px-3 py-2 flex items-start gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          {brokerProfile?.full_name || user?.email || "Seu nome"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Enviado pela plataforma Slotimob em seu nome.{" "}
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => navigate("/settings")}
                          >
                            Atualizar perfil
                          </button>
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Para (e-mail destino)</Label>
                      <Input
                        type="email"
                        placeholder={tenant?.email || "email@exemplo.com"}
                        value={automationForm.email_destination}
                        onChange={(e) =>
                          setAutomationForm((p) => ({ ...p, email_destination: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Padrão: e-mail do inquilino{tenant?.email ? ` (${tenant.email})` : " (não cadastrado)"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp panel */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">WhatsApp</p>
                        {automationForm.whatsapp_enabled && (
                          <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-700 bg-green-500/10">
                            Configurado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {hasWhatsappConnected ? "Integração Evolution API conectada" : "Requer integração WhatsApp"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={automationForm.whatsapp_enabled}
                    onCheckedChange={(v) => setAutomationForm((p) => ({ ...p, whatsapp_enabled: v }))}
                    disabled={!hasWhatsappConnected}
                  />
                </div>
                {!hasWhatsappConnected && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-1.5">
                    <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      WhatsApp não conectado
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Conecte seu número via Evolution API para habilitar o envio automático de cobranças.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/10 gap-1.5 mt-1"
                      onClick={() => navigate("/whatsapp")}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Conectar WhatsApp
                    </Button>
                  </div>
                )}
                {hasWhatsappConnected && automationForm.whatsapp_enabled && (
                  <>
                    <div className="rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 flex items-start gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-green-700">
                          {whatsappConnection!.phone_number || whatsappConnection!.instance_name || "Número conectado"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Enviado via Evolution API · instância {whatsappConnection!.instance_name || "configurada"}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px] border-green-500/30 text-green-700 bg-green-500/10 flex-shrink-0">
                        Conectado
                      </Badge>
                    </div>

                    <div className="rounded-md bg-muted/40 border px-3 py-2 flex items-start gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">
                          {tenant?.whatsapp || tenant?.phone || "Nenhum contato disponível"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Número do inquilino será usado automaticamente
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveAutomation} disabled={savingAutomation}>
                  {savingAutomation ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  Salvar configuração
                </Button>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-3 py-2 mt-1">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Os envios automáticos são processados nos horários da régua de cobrança configurada abaixo. Para funcionar, é necessário ativar pelo menos um canal e configurar o destinatário.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Régua de Cobrança */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Régua de Cobrança</CardTitle>
              <p className="text-xs text-muted-foreground">
                Ao ativar uma etapa, ela também passa a ser acompanhada em Afazeres conforme a data de vencimento do contrato.
              </p>
            </CardHeader>
            <CardContent className="py-2 px-4">
              {(() => {
                const channels: string[] = [];
                if (automationForm.email_enabled && automationForm.email_destination) channels.push("e-mail");
                if (automationForm.whatsapp_enabled && (tenant?.whatsapp || tenant?.phone)) channels.push("WhatsApp");
                const automationReady = channels.length > 0;

                const renderHint = (icon?: React.ReactNode) =>
                  automationReady ? (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {icon}
                      Enviará via {channels.join(" e ")}
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Configure a automação acima para envio automático
                    </p>
                  );

                const items = [
                  {
                    key: "reminder_5_days",
                    color: billingStatus.reminder5 ? "bg-green-500" : "bg-muted",
                    title: "5 dias antes",
                    subtitle: "Lembrete de vencimento próximo",
                  },
                  {
                    key: "reminder_due_day",
                    color: billingStatus.dueDay ? "bg-yellow-500" : "bg-muted",
                    title: "Dia do vencimento",
                    subtitle: "Cobrança no dia D",
                  },
                  {
                    key: "reminder_3_days_late",
                    color: billingStatus.overdue ? "bg-red-500" : "bg-muted",
                    title: "3 dias após",
                    subtitle: "Aviso de inadimplência",
                  },
                ];

                return (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.key} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className={cn("h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0", item.color)} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                            {renderHint()}
                          </div>
                        </div>
                        <Switch
                          checked={!!(lease as any).billing_automation?.[item.key]}
                          onCheckedChange={(v) => handleAutomationToggle(item.key as keyof BillingAutomation, v)}
                        />
                      </div>
                    ))}

                    {/* 4th item - Legal notification */}
                    <div className="flex items-start justify-between gap-3 pt-3 border-t">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0",
                          (lease as any).billing_automation?.legal_notification_7_days ? "bg-purple-600" : "bg-muted"
                        )} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">7 dias após</p>
                            {(lease as any).billing_automation?.legal_notification_7_days && (
                              <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-700 bg-purple-500/10 gap-1">
                                <Scale className="h-2.5 w-2.5" />
                                Jurídico
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Notificação formal de inadimplência</p>
                          <p className="text-[10px] text-muted-foreground">
                            Marca a intenção de notificação formal — registro interno
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={!!(lease as any).billing_automation?.legal_notification_7_days}
                        onCheckedChange={(v) => handleAutomationToggle("legal_notification_7_days", v)}
                      />
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Card 3: Histórico de Envios */}
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Histórico de Envios</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowBillingLogForm(!showBillingLogForm)}
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar
              </Button>
            </CardHeader>
            <CardContent className="py-2 px-4">
              {showBillingLogForm && (
                <div className="mb-4 p-3 border rounded-lg bg-muted/30 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Quem entrou em contato</Label>
                    <Input
                      placeholder="Nome do responsável"
                      value={billingLogForm.sent_by}
                      onChange={(e) => setBillingLogForm({ ...billingLogForm, sent_by: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Canal de contato</Label>
                    <Select
                      value={billingLogForm.method}
                      onValueChange={(v) =>
                        setBillingLogForm({ ...billingLogForm, method: v as typeof billingLogForm.method })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-green-600" /> WhatsApp</div>
                        </SelectItem>
                        <SelectItem value="phone">
                          <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-blue-600" /> Ligação</div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-violet-600" /> E-mail</div>
                        </SelectItem>
                        <SelectItem value="in_person">
                          <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-amber-600" /> Presencial</div>
                        </SelectItem>
                        <SelectItem value="other">
                          <div className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5" /> Outro</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Para (destinatário — opcional)</Label>
                    <Input
                      placeholder="E-mail ou número usado"
                      value={billingLogForm.sent_to}
                      onChange={(e) => setBillingLogForm({ ...billingLogForm, sent_to: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Observações (opcional)</Label>
                    <Input
                      placeholder="Ex: Inquilino prometeu pagar até sexta"
                      value={billingLogForm.notes}
                      onChange={(e) => setBillingLogForm({ ...billingLogForm, notes: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8"
                      onClick={async () => {
                        if (!billingLogForm.sent_by.trim()) {
                          toast({ title: "Informe quem fez o contato", variant: "destructive" });
                          return;
                        }
                        try {
                          const newLog: BillingLog = {
                            type: "manual",
                            sent_at: new Date().toISOString(),
                            method: billingLogForm.method,
                            success: true,
                            sent_by: billingLogForm.sent_by.trim(),
                            sent_to: billingLogForm.sent_to.trim() || undefined,
                            notes: billingLogForm.notes.trim() || undefined,
                          };
                          const updatedLogs = [...((lease.billing_logs as BillingLog[]) || []), newLog];
                          await updateLease.mutateAsync({
                            id: lease.id,
                            data: { billing_logs: updatedLogs } as any,
                          });
                          toast({ title: "Contato registrado!" });
                          setShowBillingLogForm(false);
                          setBillingLogForm({ sent_by: "", method: "whatsapp", notes: "", sent_to: "" });
                          refetch();
                        } catch {
                          toast({ title: "Erro ao registrar", variant: "destructive" });
                        }
                      }}
                    >
                      Salvar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        setShowBillingLogForm(false);
                        setBillingLogForm({ sent_by: "", method: "whatsapp", notes: "", sent_to: "" });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {(() => {
                const allLogs = ((lease.billing_logs as BillingLog[]) || []).slice().reverse();
                if (allLogs.length === 0) {
                  return !showBillingLogForm ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum envio registrado ainda</p>
                  ) : null;
                }
                const visible = allLogs.slice(0, logsLimit);
                const hasMore = allLogs.length > visible.length;
                return (
                  <>
                    <div className="space-y-2">
                      {visible.map((log, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between text-sm py-2 border-b border-border/50 last:border-0 gap-3"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="mt-0.5">
                              {log.method === "whatsapp" && <MessageSquare className="h-3.5 w-3.5 text-green-600" />}
                              {log.method === "phone" && <Phone className="h-3.5 w-3.5 text-blue-600" />}
                              {log.method === "email" && <Mail className="h-3.5 w-3.5 text-violet-600" />}
                              {log.method === "in_person" && <Users className="h-3.5 w-3.5 text-amber-600" />}
                              {log.method === "other" && <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium capitalize">
                                {log.type === "manual" ? "Contato manual" : log.type.replace(/_/g, " ")}
                              </span>
                              {log.sent_by && (
                                <span className="text-[10px] text-muted-foreground">por {log.sent_by}</span>
                              )}
                              {log.sent_to && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  Para: {log.sent_to}
                                </span>
                              )}
                              {log.notes && (
                                <span className="text-[10px] text-muted-foreground italic truncate max-w-[220px]">
                                  {log.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-muted-foreground text-xs whitespace-nowrap">
                              {format(new Date(log.sent_at), "dd/MM HH:mm")}
                            </span>
                            {log.success ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMore && (
                      <div className="flex justify-center mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setLogsLimit((prev) => prev + 20)}
                        >
                          Ver mais ({allLogs.length - visible.length} restantes)
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-500" />
                Relatório do Proprietário — {capitalizedMonth}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              {(() => {
                const rent = Number(lease.rent_amount) || 0;
                const feePct = Number(lease.admin_fee_percentage) || 0;
                const fee = rent * feePct / 100;
                const lateFee = billingStatus.overdue ? rent * 0.1 : 0; // 10% multa padrão
                const net = rent - fee;
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aluguel Recebido</span>
                      <span className="font-medium">
                        {rent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa Administração ({feePct}%)</span>
                      <span className="font-medium text-destructive">
                        -{fee.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    {lateFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Multa por atraso (estimada)</span>
                        <span className="font-medium text-amber-600">
                          +{lateFee.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </div>
                    )}
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
                      <span className="font-medium">Repasse Líquido Estimado</span>
                      <span className="font-bold text-emerald-600 text-base">
                        {net.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
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
                  Nenhum lançamento nos últimos 3 meses.
                </p>
              ) : (
                <div className="divide-y">
                  {recentTransactions.map((t: any) => {
                    const due = t.due_date ? new Date(t.due_date + "T00:00:00") : null;
                    const paid = t.payment_date ? new Date(t.payment_date + "T00:00:00") : null;
                    const today = new Date();
                    const isPaid = t.status === "paid" || !!paid;
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
                            {due ? format(due, "MMM/yyyy", { locale: ptBR }) : "—"}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {paid ? `Pago em ${format(paid, "dd/MM/yyyy")}` : due ? `Vence ${format(due, "dd/MM/yyyy")}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0 mr-2">
                          <p className="font-medium">
                            {Number(t.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
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
        onOpenChange={(open) => {
          setShowObligationsDialog(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["lease-detail", id, effectiveBrokerId] });
            refetch();
          }
        }}
        unitId={lease.unit_id}
        unitName={unit?.unit_number ?? ""}
        onSaved={async () => {
          try {
            await supabase
              .from("leases")
              .update({
                metadata: {
                  ...(lease.metadata || {}),
                  obligations_configured: true,
                },
              })
              .eq("id", lease.id);
            queryClient.invalidateQueries({ queryKey: ["lease-detail", id, effectiveBrokerId] });
            refetch();
          } catch {
            /* silently fail */
          }
        }}
      />
      <ContractGeneratorDialog open={showContractDialog} onOpenChange={setShowContractDialog} unitId={lease.unit_id} />
      <EditStartDateDialog
        open={showEditStartDateDialog}
        onOpenChange={setShowEditStartDateDialog}
        lease={{ id: lease.id, start_date: lease.start_date, unit: unit, tenant: tenant } as any}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["leases"] });
          refetch();
        }}
      />
      <TerminateContractDialog
        open={terminateDialogOpen}
        onOpenChange={setTerminateDialogOpen}
        lease={{ id: lease.id, unit_id: lease.unit_id, unit: unit, tenant_contact: tenant } as any}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["leases"] });
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
              <span className="block p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <span className="block text-sm font-medium text-destructive">
                  ⚠️ Atenção: Esta ação é irreversível!
                </span>
                <span className="block text-sm text-muted-foreground mt-2">
                  • O registro será excluído permanentemente do banco de dados<br />
                  • Todas as transações financeiras vinculadas serão removidas<br />
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
              disabled={isDeleting}
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
    </AppLayout>
  );
}
