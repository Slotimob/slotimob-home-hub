import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addMonths, startOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Home,
  Building2,
  Receipt,
  Link2,
  Plus,
  Check,
  Clock,
  AlertCircle,
  Building,
  Zap,
  Droplets,
  Flame,
  Shield,
  MoreHorizontal,
  Pencil,
  FileText,
  type LucideIcon,
  Loader2,
  Save,
} from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { AssetActivitiesPanel } from "@/components/assets/AssetActivitiesPanel";
import { UnitCrmHistoryCard } from "@/components/assets/UnitCrmHistoryCard";
import { RAReportConfigDialog } from "@/components/reports/RAReportConfigDialog";
import { generateAssetReportPdf } from "@/utils/assetReportPdfGenerator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/usePermissions";
import { useObligationCategoryMapping } from "@/hooks/useObligationCategoryMapping";
import {
  useAssetHealth,
  type ObligationConfig,
  type ObligationsConfig,
  type ObligationStatus,
  type ObligationType,
} from "@/hooks/useAssetHealth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

import {
  CreateTransactionDialog,
  type TransactionPrefill,
} from "@/components/finance/CreateTransactionDialog";
import { MonthYearPicker } from "@/components/schedule/MonthYearPicker";
import { AssetMetricsCards } from "@/components/assets/AssetMetricsCards";
import { ObligationsConfigForm } from "@/components/assets/ObligationsConfigForm";
import { DimobStatusCard } from "@/components/assets/DimobStatusCard";
import { ContractGeneratorDialog } from "@/components/assets/ContractGeneratorDialog";
import { EditUnitDialog } from "@/components/units/EditUnitDialog";

const OBLIGATION_LABELS: Record<ObligationType, string> = {
  rent: "Aluguel",
  condominium: "Condomínio",
  iptu: "IPTU",
  energy: "Energia",
  water: "Água",
  gas: "Gás",
  garbage_fee: "Taxa de Lixo",
  insurance: "Seguro",
  other: "Outros",
};

const OBLIGATION_ICONS: Record<ObligationType, LucideIcon> = {
  rent: Home,
  condominium: Building,
  iptu: Receipt,
  energy: Zap,
  water: Droplets,
  gas: Flame,
  garbage_fee: Trash2,
  insurance: Shield,
  other: MoreHorizontal,
};

const STATUS_CONFIG: Record<
  ObligationStatus,
  { label: string; icon: LucideIcon; className: string; bgClassName: string }
> = {
  paid: {
    label: "Pago",
    icon: Check,
    className: "text-green-600",
    bgClassName: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "text-yellow-600",
    bgClassName: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  },
  overdue: {
    label: "Atrasado",
    icon: AlertCircle,
    className: "text-red-600",
    bgClassName: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  ignored: {
    label: "Desativado",
    icon: MoreHorizontal,
    className: "text-muted-foreground",
    bgClassName: "bg-muted text-muted-foreground",
  },
};

const OVERALL_STATUS_CONFIG = {
  healthy: {
    label: "Saudável",
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  attention: {
    label: "Atenção",
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  },
  critical: {
    label: "Crítico",
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
} as const;

interface MonthlyObligation {
  type: ObligationType;
  label: string;
  config: ObligationConfig | null;
  status: ObligationStatus;
  transaction: {
    id: string;
    amount: number;
    status: string;
    transaction_date: string;
    description: string;
  } | null;
}

const AlugueiDetalhe = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const unitId = searchParams.get("id");

  const { user, loading } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canView = hasPermission("management_rentals", "view");
  const canCreate = hasPermission("management_rentals", "create");
  const canEdit = hasPermission("management_rentals", "edit");
  const { findCategoryForObligation, getTransactionTypeForObligation } =
    useObligationCategoryMapping();

  // Asset list (for header info / overall status)
  const { data: assets, isLoading: isLoadingAssets } = useAssetHealth(new Date());
  const asset = useMemo(
    () => assets?.find((a) => a.unitId === unitId) ?? null,
    [assets, unitId]
  );

  // ----- Local state (mirrors AssetDetailDialog) -----
  const [activeTab, setActiveTab] = useState("overview");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionPrefill, setTransactionPrefill] = useState<
    TransactionPrefill | undefined
  >();
  const [selectedObligationType, setSelectedObligationType] =
    useState<ObligationType | null>(null);
  const [linkingTransactionFor, setLinkingTransactionFor] =
    useState<ObligationType | null>(null);
  const [obligationsView, setObligationsView] = useState<"config" | "status">(
    "config"
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [raConfigOpen, setRaConfigOpen] = useState(false);

  const competencyPeriod = format(currentMonth, "yyyy-MM");
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });
  const capitalizedMonthLabel =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!unitId) navigate("/gestao/alugueis", { replace: true });
  }, [unitId, navigate]);

  // ----- Queries -----
  const { data: unitData } = useQuery({
    queryKey: ["unit-full-data", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("id", unitId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!unitId,
  });

  const unitLabel =
    (unitData as any)?.unit_number || (unitData as any)?.address || "Esta unidade";



  const { data: unitConfig } = useQuery({
    queryKey: ["unit-obligations-config", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("obligations_config")
        .eq("id", unitId!)
        .single();
      if (error) throw error;
      return (data?.obligations_config as ObligationsConfig) || {};
    },
    enabled: !!unitId,
  });

  const { data: monthTransactions = [] } = useQuery({
    queryKey: ["unit-month-transactions", unitId, competencyPeriod],
    queryFn: async () => {
      if (!unitId) return [];
      const monthStart = format(currentMonth, "yyyy-MM-01");
      const monthEnd = format(addMonths(currentMonth, 1), "yyyy-MM-01");
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(
          `id, amount, status, transaction_date, description, obligation_type, competency_period, is_reconciled, category:financial_categories(name)`
        )
        .eq("unit_id", unitId)
        .or(
          `competency_period.eq.${competencyPeriod},and(competency_period.is.null,transaction_date.gte.${monthStart},transaction_date.lt.${monthEnd})`
        );
      if (error) throw error;
      return data || [];
    },
    enabled: !!unitId,
  });

  const { data: availableFinancialTransactions = [] } = useQuery({
    queryKey: ["unlinked-transactions", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(
          `id, amount, status, transaction_date, description, category:financial_categories(name)`
        )
        .eq("unit_id", unitId!)
        .is("obligation_type", null)
        .order("transaction_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map((t) => ({ ...t, source: "financial" as const }));
    },
    enabled: !!unitId && !!linkingTransactionFor,
  });

  const { data: availableManagerialTransactions = [] } = useQuery({
    queryKey: ["unlinked-managerial-transactions", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("managerial_transactions")
        .select("id, amount, status, due_date, description")
        .eq("unit_id", unitId!)
        .is("obligation_type", null)
        .order("due_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map((t) => ({
        ...t,
        transaction_date: t.due_date || "",
        source: "managerial" as const,
      }));
    },
    enabled: !!unitId && !!linkingTransactionFor,
  });

  const availableTransactions = [
    ...availableFinancialTransactions,
    ...availableManagerialTransactions,
  ];

  const monthlyObligations = useMemo((): MonthlyObligation[] => {
    if (!unitConfig) return [];
    const today = new Date();
    const isCurrentMonth = format(today, "yyyy-MM") === competencyPeriod;
    const currentDay = today.getDate();

    return (Object.keys(OBLIGATION_LABELS) as ObligationType[])
      .map((type) => {
        const config = unitConfig[type] || { active: false };
        const transaction =
          monthTransactions.find(
            (t) =>
              t.obligation_type === type && t.competency_period === competencyPeriod
          ) ||
          monthTransactions.find(
            (t) => t.obligation_type === type && !t.competency_period
          ) ||
          monthTransactions.find((t) => {
            if (t.obligation_type) return false;
            const categoryName = (t.category?.name || "").toLowerCase();
            const description = (t.description || "").toLowerCase();
            const keywords = [OBLIGATION_LABELS[type].toLowerCase()];
            return keywords.some(
              (k) => categoryName.includes(k) || description.includes(k)
            );
          });

        let status: ObligationStatus = "ignored";
        if (config.active) {
          if (transaction) {
            if (transaction.is_reconciled === true) {
              status = "paid";
            } else if (transaction.status === "paid") {
              status = "paid";
            } else if (transaction.status === "overdue") {
              status = "overdue";
            } else {
              const dueDay = config.due_day || 10;
              status =
                isCurrentMonth && currentDay > dueDay ? "overdue" : "pending";
            }
          } else {
            const dueDay = config.due_day || 10;
            status = isCurrentMonth && currentDay > dueDay ? "overdue" : "pending";
          }
        }

        return {
          type,
          label: OBLIGATION_LABELS[type],
          config: config.active ? config : null,
          status,
          transaction: transaction
            ? {
                id: transaction.id,
                amount: transaction.amount,
                status: transaction.status,
                transaction_date: transaction.transaction_date,
                description: transaction.description,
              }
            : null,
        };
      })
      .filter((o) => o.config !== null);
  }, [unitConfig, monthTransactions, competencyPeriod]);

  const handleCreateTransaction = (obligationType: ObligationType) => {
    if (!unitId) return;
    const config = unitConfig?.[obligationType];
    const dueDay = config?.due_day || 10;
    const dueDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      dueDay
    );
    const categoryId = findCategoryForObligation(obligationType);
    const transactionType = getTransactionTypeForObligation(obligationType);

    setSelectedObligationType(obligationType);
    setTransactionPrefill({
      description: `${OBLIGATION_LABELS[obligationType]} - ${capitalizedMonthLabel}`,
      unitId,
      categoryId: categoryId || undefined,
      type: transactionType,
      dueDate: format(dueDate, "yyyy-MM-dd"),
      status: "pending",
    });
    setTransactionDialogOpen(true);
  };

  const handleLinkTransaction = async (
    transactionId: string,
    obligationType: ObligationType,
    source: "financial" | "managerial" = "financial"
  ) => {
    try {
      if (source === "managerial") {
        const { error } = await supabase
          .from("managerial_transactions")
          .update({
            obligation_type: obligationType,
            competency_period: competencyPeriod,
          })
          .eq("id", transactionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("financial_transactions")
          .update({
            obligation_type: obligationType,
            competency_period: competencyPeriod,
          })
          .eq("id", transactionId);
        if (error) throw error;
      }
      queryClient.invalidateQueries({
        queryKey: ["unit-month-transactions", unitId],
      });
      queryClient.invalidateQueries({ queryKey: ["unlinked-transactions", unitId] });
      queryClient.invalidateQueries({
        queryKey: ["unlinked-managerial-transactions", unitId],
      });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      setLinkingTransactionFor(null);
    } catch (error) {
      console.error("Error linking transaction:", error);
    }
  };

  const handleTransactionSuccess = () => {
    setTransactionDialogOpen(false);
    setTransactionPrefill(undefined);
    setSelectedObligationType(null);
    queryClient.invalidateQueries({
      queryKey: ["unit-month-transactions", unitId],
    });
    queryClient.invalidateQueries({ queryKey: ["asset-health"] });
    queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["action-center-payables"] });
    queryClient.invalidateQueries({ queryKey: ["action-center-receivables"] });
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["unit-full-data", unitId] });
    queryClient.invalidateQueries({ queryKey: ["asset-health"] });
  };

  const handleCreateLease = () => {
    if (!unitId) return;
    const params = new URLSearchParams();
    params.set("unitId", unitId);
    const tenantId = unitData?.tenant_contact_id;
    if (tenantId) params.set("tenantId", tenantId);
    navigate(`/gestao/contratos/novo?${params.toString()}`);
  };

  // ----- Loading / Not found -----
  if (loading || !user) return null;

  if (isLoadingAssets || !asset) {
    return (
      <AppLayout title="Detalhe do Ativo">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!canView) {
    return (
      <AppLayout title="Aluguéis">
        <div className="text-center py-16 border rounded-lg">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm font-medium">Você não tem permissão para visualizar aluguéis.</p>
          <p className="text-xs text-muted-foreground mt-1">Fale com o administrador da sua conta.</p>
        </div>
      </AppLayout>
    );
  }

  const title = asset.propertyName
    ? `${asset.unitNumber} — ${asset.propertyName}`
    : asset.unitNumber;

  return (
    <>
      <SEOHead
        title={title}
        description="Gestão de ativo imobiliário"
        path="/gestao/alugueis"
        noIndex
      />
      <AppLayout title="Gestão de Ativo">
        {/* Header card */}
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 text-muted-foreground"
              onClick={() => navigate("/gestao/alugueis")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Aluguéis
            </Button>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  {asset.propertyName ? (
                    <Building2 className="h-5 w-5" />
                  ) : (
                    <Home className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold truncate">{asset.unitNumber}</h2>
                  {asset.propertyName && (
                    <p className="text-sm text-muted-foreground truncate">
                      {asset.propertyName}
                    </p>
                  )}
                  {asset.ownerName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Proprietário: {asset.ownerName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={OVERALL_STATUS_CONFIG[asset.overallStatus].className}
                    >
                      {OVERALL_STATUS_CONFIG[asset.overallStatus].label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Editar Imóvel
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setContractDialogOpen(true)}
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Contrato
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/finance/transactions?unitId=${unitId}`)
                  }
                >
                  <Receipt className="h-4 w-4 mr-1.5" />
                  Lançamentos
                </Button>
                {canCreate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateLease}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Nova Locação
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="obligations" className="text-xs">
              Obrigações
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="text-xs">
              Fiscal
            </TabsTrigger>
            <TabsTrigger value="activities" className="text-xs">
              Atividades
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <AssetMetricsCards
              unitId={unitId!}
              rentAmount={unitData?.rent_price || undefined}
              marketValue={unitData?.market_value || unitData?.price || undefined}
            />

            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-3">Dados do Imóvel</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Tipo</p>
                    <p className="font-medium">{unitData?.property_type || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Área</p>
                    <p className="font-medium">
                      {unitData?.area ? `${unitData.area} m²` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Quartos</p>
                    <p className="font-medium">{unitData?.bedrooms ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Vagas</p>
                    <p className="font-medium">{unitData?.parking_spots ?? "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Endereço</p>
                    <p className="font-medium truncate">
                      {unitData?.address
                        ? `${unitData.address}, ${unitData.city} - ${unitData.state}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Matrícula</p>
                    <p className="font-medium">
                      {unitData?.registration_number || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">CIB</p>
                    <p className="font-medium">{unitData?.cib || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-medium mb-3">Resumo Financeiro</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Aluguel</p>
                    <p className="font-medium">
                      {unitData?.rent_price
                        ? `R$ ${unitData.rent_price.toLocaleString("pt-BR")}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Condomínio</p>
                    <p className="font-medium">
                      {unitData?.condo_fee
                        ? `R$ ${unitData.condo_fee.toLocaleString("pt-BR")}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">IPTU (anual)</p>
                    <p className="font-medium">
                      {unitData?.iptu
                        ? `R$ ${unitData.iptu.toLocaleString("pt-BR")}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Valor Estimado</p>
                    <p className="font-medium">
                      {unitData?.market_value || unitData?.price
                        ? `R$ ${(
                            unitData.market_value || unitData.price
                          )?.toLocaleString("pt-BR")}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Obligations */}
          <TabsContent value="obligations" className="mt-4 space-y-6">
            <Tabs
              value={obligationsView}
              onValueChange={(v) => setObligationsView(v as typeof obligationsView)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config" className="text-xs">
                  Configurar
                </TabsTrigger>
                <TabsTrigger value="status" className="text-xs">
                  Status Mensal
                </TabsTrigger>
              </TabsList>
            </Tabs>


            {obligationsView === "config" && (
              canEdit ? (
                <ObligationsConfigForm
                  unitId={unitId}
                  unitName={asset.unitNumber}
                  onSaved={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["unit-obligations-config", unitId],
                    });
                    queryClient.invalidateQueries({ queryKey: ["asset-health"] });
                  }}
                />
              ) : (
                <div className="text-center py-10 border rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm font-medium">Você não tem permissão para configurar obrigações.</p>
                  <p className="text-xs text-muted-foreground mt-1">Fale com o administrador da sua conta.</p>
                </div>
              )
            )}

            {obligationsView === "status" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-2">
                  <MonthYearPicker
                    value={currentMonth}
                    onChange={setCurrentMonth}
                    showNavigation
                  />
                </div>
                <div className="space-y-3">
                  {monthlyObligations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma obrigação configurada</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setObligationsView("config")}
                      >
                        Configurar obrigações
                      </Button>
                    </div>
                  ) : (
                    monthlyObligations.map((obligation) => {
                      const Icon = OBLIGATION_ICONS[obligation.type];
                      const statusConfig = STATUS_CONFIG[obligation.status];
                      const StatusIcon = statusConfig.icon;
                      return (
                        <Card key={obligation.type} className="overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                  statusConfig.bgClassName
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">
                                    {obligation.label}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      statusConfig.bgClassName
                                    )}
                                  >
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                                {obligation.config?.due_day && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Vence dia {obligation.config.due_day}
                                  </p>
                                )}
                                {obligation.transaction ? (
                                  <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm truncate">
                                        {obligation.transaction.description}
                                      </span>
                                      <span className="text-sm font-medium">
                                        R${" "}
                                        {obligation.transaction.amount.toLocaleString(
                                          "pt-BR",
                                          { minimumFractionDigits: 2 }
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {format(
                                        parseISO(
                                          obligation.transaction.transaction_date
                                        ),
                                        "dd/MM/yyyy"
                                      )}
                                    </p>
                                  </div>
                                ) : (
                                  obligation.status !== "ignored" && canCreate && (
                                    <div className="flex gap-2 mt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs flex-1"
                                        onClick={() =>
                                          handleCreateTransaction(obligation.type)
                                        }
                                      >
                                        <Plus className="h-3 w-3 mr-1" /> Criar
                                        Lançamento
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() =>
                                          setLinkingTransactionFor(obligation.type)
                                        }
                                      >
                                        <Link2 className="h-3 w-3 mr-1" /> Vincular
                                      </Button>
                                    </div>
                                  )
                                )}
                                {linkingTransactionFor === obligation.type && (
                                  <div className="mt-2 p-2 border rounded-md bg-card">
                                    <p className="text-xs font-medium mb-2">
                                      Selecione um lançamento:
                                    </p>
                                    {availableTransactions.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">
                                        Nenhum lançamento disponível
                                      </p>
                                    ) : (
                                      <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {availableTransactions.map((tx: any) => (
                                          <button
                                            key={`${tx.source}-${tx.id}`}
                                            className="w-full text-left p-2 text-xs rounded hover:bg-muted transition-colors"
                                            onClick={() =>
                                              handleLinkTransaction(
                                                tx.id,
                                                obligation.type,
                                                tx.source
                                              )
                                            }
                                          >
                                            <div className="flex justify-between items-center">
                                              <span className="truncate flex items-center gap-1">
                                                {tx.description}
                                                {tx.source === "managerial" && (
                                                  <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                                    Gerencial
                                                  </span>
                                                )}
                                              </span>
                                              <span className="font-medium">
                                                R${" "}
                                                {tx.amount.toLocaleString("pt-BR", {
                                                  minimumFractionDigits: 2,
                                                })}
                                              </span>
                                            </div>
                                            <span className="text-muted-foreground">
                                              {tx.transaction_date
                                                ? format(
                                                    parseISO(tx.transaction_date),
                                                    "dd/MM/yyyy"
                                                  )
                                                : "—"}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full h-6 text-xs mt-2"
                                      onClick={() => setLinkingTransactionFor(null)}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Fiscal */}
          <TabsContent value="fiscal" className="mt-4 space-y-4">
            {unitData && (
              <DimobStatusCard
                unitId={unitId!}
                onEditUnit={() => setEditDialogOpen(true)}
                onCreateLease={handleCreateLease}
              />
            )}
          </TabsContent>

          {/* Activities */}
          <TabsContent value="activities" className="mt-4 space-y-4">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setRaConfigOpen(true)}>
                <FileText className="h-3.5 w-3.5 mr-1" />
                Relatório do imóvel
              </Button>
              {canCreate && (
                <Button size="sm" onClick={() => setActivityDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Nova atividade
                </Button>
              )}
            </div>

            <AssetActivitiesPanel
              scopeUnitId={unitId}
              scopeAssetLabel={unitLabel}
              canManage={canEdit || canCreate}
              createDialogOpen={activityDialogOpen}
              onCreateDialogOpenChange={setActivityDialogOpen}
            />

            <UnitCrmHistoryCard unitId={unitId} />
          </TabsContent>
        </Tabs>

        {/* Sub-dialogs */}
        <CreateTransactionDialog
          open={transactionDialogOpen}
          onOpenChange={setTransactionDialogOpen}
          onSuccess={handleTransactionSuccess}
          prefill={transactionPrefill}
          obligationType={selectedObligationType}
          competencyPeriod={competencyPeriod}
        />

        {unitData && (
          <EditUnitDialog
            unit={unitData as any}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSuccess={handleEditSuccess}
          />
        )}

        {unitId && (
          <ContractGeneratorDialog
            open={contractDialogOpen}
            onOpenChange={setContractDialogOpen}
            unitId={unitId}
          />
        )}
        {unitId && (
          <RAReportConfigDialog
            open={raConfigOpen}
            onOpenChange={setRaConfigOpen}
            dateRange={{ from: null, to: new Date() }}
            onGenerate={async (data) => {
              try {
                await generateAssetReportPdf(data);
                toast({ title: "PDF gerado com sucesso!", duration: 1000 });
              } catch (e: any) {
                toast({
                  title: "Erro ao gerar relatório",
                  description: e.message,
                  variant: "destructive",
                  duration: 1000,
                });
              }
            }}
            preSelectedAssetIds={[unitId]}
            preSelectedAssetType="unit"
            formatLabel="PDF"
          />
        )}
      </AppLayout>
    </>
  );
};

export default AlugueiDetalhe;
