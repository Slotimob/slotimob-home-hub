import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAssetHealth, AssetHealth as AssetHealthType, ObligationHealth } from "@/hooks/useAssetHealth";
import { useActionCenterPending } from "@/hooks/useActionCenterPending";
import { useLeaseConversionContext, type LeaseConversionContext } from "@/hooks/useLeaseConversionContext";
import { AppLayout } from "@/components/AppLayout";
import { AssetHealthCard } from "@/components/assets/AssetHealthCard";
import { AssetHealthListItem } from "@/components/assets/AssetHealthListItem";
import { AssetDetailDialog } from "@/components/assets/AssetDetailDialog";
import { ConfigureObligationsDialog } from "@/components/assets/ConfigureObligationsDialog";
import { AssetHealthEmptyState } from "@/components/assets/AssetHealthEmptyState";
import { LeaseManagementSheet } from "@/components/assets/LeaseManagementSheet";
import { CreateLeaseWizard } from "@/components/assets/CreateLeaseWizard";
import { ContractsTab } from "@/components/assets/ContractsTab";
import { TasksTab } from "@/components/assets/TasksTab";
import { MonthYearPicker } from "@/components/schedule/MonthYearPicker";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  LayoutGrid,
  List,
  MessageSquare,
  Send,
  Download,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  Home,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportOverdueToPdf, exportOverdueToCsv, getOverdueAssets } from "@/utils/assetHealthExport";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "healthy" | "attention" | "critical";

const AssetHealth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // CRM conversion context detection
  const { consumeConversionContext, clearContext } = useLeaseConversionContext();
  const [crmConversionData, setCrmConversionData] = useState<LeaseConversionContext | null>(null);
  
  // Month filter state
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const { data: assets, isLoading, refetch } = useAssetHealth(selectedMonth);

  // Action center pending count for badge
  const { totalCount: actionCenterCount } = useActionCenterPending();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [leaseSheetOpen, setLeaseSheetOpen] = useState(false);
  const [leaseWizardOpen, setLeaseWizardOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetHealthType | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<{
    id: string;
    name: string;
    ownerContactId?: string | null;
  } | null>(null);

  // WhatsApp dialog state
  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const [selectedObligationForMessage, setSelectedObligationForMessage] = useState<{
    asset: AssetHealthType;
    obligation: ObligationHealth;
  } | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // DISABLED: WhatsApp connection check - causing 406 errors that block network
  // TODO: Re-enable once whatsapp_connections table RLS is fixed
  const whatsAppConnection = null;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Detect CRM conversion context and auto-open the wizard
  useEffect(() => {
    // Only run when the page first loads with location state
    const locationState = location.state as { 
      leaseConversion?: LeaseConversionContext;
      autoOpenWizard?: boolean;
    } | null;

    if (locationState?.leaseConversion && locationState?.autoOpenWizard) {
      const context = locationState.leaseConversion;
      
      // Store the context and set up for wizard opening
      setCrmConversionData(context);
      
      // Switch to contracts tab
      setActiveTab("contracts");
      
      // Set up the selected unit for the wizard
      setSelectedUnit({
        id: context.unitId,
        name: context.unitNumber,
      });
      
      // Open the wizard
      setLeaseWizardOpen(true);
      
      // Clear the URL state to prevent re-triggering
      window.history.replaceState({}, document.title);
      
      toast({
        title: "📄 Criando contrato",
        description: `Preencha os dados do contrato para ${context.leadName}`,
      });
    }
  }, [location.state, toast]);

  // Filter assets based on search and status
  const filteredAssets = useMemo(() => {
    if (!assets) return [];

    return assets.filter((asset) => {
      const matchesSearch =
        asset.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (asset.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesStatus =
        statusFilter === "all" || asset.overallStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assets, searchTerm, statusFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!assets) return { healthy: 0, attention: 0, critical: 0, total: 0 };

    return {
      total: assets.length,
      healthy: assets.filter((a) => a.overallStatus === "healthy").length,
      attention: assets.filter((a) => a.overallStatus === "attention").length,
      critical: assets.filter((a) => a.overallStatus === "critical").length,
    };
  }, [assets]);

  const handleConfigureClick = (unitId: string) => {
    const asset = assets?.find((a) => a.unitId === unitId);
    if (asset) {
      setSelectedUnit({ id: unitId, name: asset.unitNumber });
      setConfigDialogOpen(true);
    }
  };

  const handleAssetClick = (asset: AssetHealthType) => {
    setSelectedAsset(asset);
    setDetailDialogOpen(true);
  };

  const handleEditUnit = () => {
    if (selectedAsset) {
      navigate(`/real-estate?edit=${selectedAsset.unitId}`);
    }
  };

  const handleCreateLease = () => {
    if (selectedAsset) {
      setLeaseSheetOpen(false);
      setLeaseWizardOpen(true);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["asset-health"] });
    refetch();
  };

  const overdueCount = useMemo(() => {
    if (!assets) return 0;
    return getOverdueAssets(assets).length;
  }, [assets]);

  const handleExportPdf = () => {
    if (!assets) return;
    const overdueItems = getOverdueAssets(assets);
    if (overdueItems.length === 0) {
      toast({
        title: "Nenhuma pendência",
        description: "Não há obrigações em atraso para exportar.",
      });
      return;
    }
    exportOverdueToPdf(assets);
    toast({
      title: "PDF gerado!",
      description: `Relatório com ${overdueItems.length} pendência(s) exportado.`,
    });
  };

  const handleExportCsv = () => {
    if (!assets) return;
    const overdueItems = getOverdueAssets(assets);
    if (overdueItems.length === 0) {
      toast({
        title: "Nenhuma pendência",
        description: "Não há obrigações em atraso para exportar.",
      });
      return;
    }
    exportOverdueToCsv(assets);
    toast({
      title: "CSV gerado!",
      description: `Relatório com ${overdueItems.length} pendência(s) exportado.`,
    });
  };

  const handleWhatsAppClick = (asset: AssetHealthType, obligation: ObligationHealth) => {
    if (!whatsAppConnection) {
      toast({
        title: "WhatsApp não conectado",
        description: "Conecte o WhatsApp primeiro nas configurações.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    const monthYear = format(now, "MMMM/yyyy", { locale: ptBR });
    const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    const statusText = obligation.status === "overdue" ? "está em atraso" : "está pendente";

    const defaultMessage = `Olá! 

Referente ao imóvel *${asset.unitNumber}*${asset.propertyName ? ` (${asset.propertyName})` : ""}, a obrigação de *${obligation.label}* de ${capitalizedMonthYear} ${statusText}.

Por gentileza, envie o comprovante de pagamento ou entre em contato para regularização.

Atenciosamente.`;

    setSelectedObligationForMessage({ asset, obligation });
    setWhatsAppMessage(defaultMessage);
    setWhatsAppDialogOpen(true);
  };

  const handleSendWhatsAppMessage = async () => {
    if (!selectedObligationForMessage || !whatsAppMessage.trim()) return;

    setIsSendingMessage(true);

    try {
      // Get owner/tenant phone from the unit
      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select(`
          owner:owners(phone, name),
          lead:leads(phone, name)
        `)
        .eq("id", selectedObligationForMessage.asset.unitId)
        .single();

      if (unitError) throw unitError;

      const phone = unitData?.owner?.phone || unitData?.lead?.phone;

      if (!phone) {
        toast({
          title: "Telefone não encontrado",
          description: "O proprietário/inquilino não tem telefone cadastrado.",
          variant: "destructive",
        });
        return;
      }

      // Send WhatsApp message via edge function
      const { error: sendError } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          phone: phone.replace(/\D/g, ""),
          message: whatsAppMessage,
        },
      });

      if (sendError) throw sendError;

      toast({
        title: "Mensagem enviada!",
        description: `Cobrança enviada para ${unitData?.owner?.name || unitData?.lead?.name || phone}`,
      });

      setWhatsAppDialogOpen(false);
      setSelectedObligationForMessage(null);
      setWhatsAppMessage("");
    } catch (error: any) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

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
        title="Gestão de Ativos"
        description="Monitore a saúde operacional dos seus imóveis em tempo real"
        path="/asset-health"
        noIndex={true}
      />
      <AppLayout title="Gestão de Ativos">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <TabsList className="w-full justify-start mb-4 h-auto flex-wrap">
            <TabsTrigger value="overview" className="gap-1.5">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
              <span className="sm:hidden">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-1.5">
              <FileText className="h-4 w-4" />
              <span>Contratos</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 relative">
              <CheckSquare className="h-4 w-4" />
              <span>Afazeres</span>
              {actionCenterCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px] font-bold"
                >
                  {actionCenterCount > 99 ? "99+" : actionCenterCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Original Dashboard Content */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gestão de Ativos</h1>
              <p className="text-muted-foreground">
                Monitore a saúde operacional dos seus imóveis em tempo real
              </p>
            </div>

          {/* Summary Cards - Single row, responsive */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            <Card
              className={cn(
                "cursor-pointer transition-all",
                statusFilter === "all" && "ring-2 ring-primary"
              )}
              onClick={() => setStatusFilter("all")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all",
                statusFilter === "healthy" && "ring-2 ring-green-500"
              )}
              onClick={() => setStatusFilter("healthy")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saudáveis</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.healthy}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all",
                statusFilter === "attention" && "ring-2 ring-yellow-500"
              )}
              onClick={() => setStatusFilter("attention")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Atenção</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.attention}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all",
                statusFilter === "critical" && "ring-2 ring-red-500"
              )}
              onClick={() => setStatusFilter("critical")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Críticos</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.critical}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar - Search Row */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por unidade, empreendimento ou proprietário..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Toolbar - Filters and Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left side: Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="healthy">Saudáveis</SelectItem>
                    <SelectItem value="attention">Atenção</SelectItem>
                    <SelectItem value="critical">Críticos</SelectItem>
                  </SelectContent>
                </Select>
                
                <MonthYearPicker
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                />
              </div>

              {/* Right side: Actions */}
              <TooltipProvider delayDuration={0}>
                <div className="flex items-center gap-2">
                  {/* Export Button */}
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-1.5 h-9"
                            disabled={overdueCount === 0}
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Exportar Pendências</span>
                            {overdueCount > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-red-500/15 text-red-600 rounded-full">
                                {overdueCount}
                              </span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      {!isMobile && overdueCount === 0 && (
                        <TooltipContent>
                          <p>Gere um relatório em PDF ou CSV de todos os ativos com pendências financeiras ou contratuais</p>
                        </TooltipContent>
                      )}
                      {!isMobile && overdueCount > 0 && (
                        <TooltipContent>
                          <p>Gere um relatório em PDF ou CSV de todos os ativos com pendências financeiras ou contratuais</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportPdf}>
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportCsv}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Exportar CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleRefresh}>
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    {!isMobile && (
                      <TooltipContent>
                        <p>Atualizar dados</p>
                      </TooltipContent>
                    )}
                  </Tooltip>

                  <div className="flex rounded-md border h-9">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === "grid" ? "secondary" : "ghost"}
                          size="icon"
                          className="rounded-r-none h-full w-9"
                          onClick={() => setViewMode("grid")}
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      {!isMobile && (
                        <TooltipContent>
                          <p>Grade</p>
                        </TooltipContent>
                      )}
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === "list" ? "secondary" : "ghost"}
                          size="icon"
                          className="rounded-l-none h-full w-9"
                          onClick={() => setViewMode("list")}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      {!isMobile && (
                        <TooltipContent>
                          <p>Lista</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>
              </TooltipProvider>
            </div>
          </div>

          {/* Assets Grid/List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <AssetHealthEmptyState
              hasFilters={!!searchTerm || statusFilter !== "all"}
              onClearFilters={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
            />
          ) : (
            viewMode === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAssets.map((asset) => (
                  <AssetHealthCard
                    key={asset.unitId}
                    asset={asset}
                    onConfigureClick={handleConfigureClick}
                    onManageClick={handleAssetClick}
                    onWhatsAppClick={whatsAppConnection ? handleWhatsAppClick : undefined}
                    referenceDate={selectedMonth}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAssets.map((asset) => (
                  <AssetHealthListItem
                    key={asset.unitId}
                    asset={asset}
                    onConfigureClick={handleConfigureClick}
                    onManageClick={handleAssetClick}
                    onWhatsAppClick={whatsAppConnection ? handleWhatsAppClick : undefined}
                    referenceDate={selectedMonth}
                  />
                ))}
              </div>
            )
          )}

          {/* Results count */}
          {filteredAssets.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Exibindo {filteredAssets.length} de {stats.total} ativos
            </div>
          )}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="mt-0">
            <ContractsTab />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-0">
            <TasksTab />
          </TabsContent>
        </Tabs>

        {/* Configure Obligations Dialog */}
        <ConfigureObligationsDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          unitId={selectedUnit?.id || null}
          unitName={selectedUnit?.name || ""}
        />

        {/* Asset Detail Dialog */}
        <AssetDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          asset={selectedAsset}
        />

        {/* WhatsApp Message Dialog */}
        <Dialog open={whatsAppDialogOpen} onOpenChange={setWhatsAppDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Enviar Cobrança via WhatsApp
              </DialogTitle>
              <DialogDescription>
                {selectedObligationForMessage && (
                  <>
                    Cobrança de <strong>{selectedObligationForMessage.obligation.label}</strong> 
                    {" "}para o imóvel{" "}
                    <strong>{selectedObligationForMessage.asset.unitNumber}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Mensagem</label>
                <textarea
                  className="w-full mt-1.5 p-3 text-sm border rounded-md min-h-[150px] resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  placeholder="Digite a mensagem..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setWhatsAppDialogOpen(false)}
                disabled={isSendingMessage}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendWhatsAppMessage}
                disabled={isSendingMessage || !whatsAppMessage.trim()}
              >
                {isSendingMessage ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Mensagem
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lease Management Sheet */}
        <LeaseManagementSheet
          open={leaseSheetOpen}
          onOpenChange={setLeaseSheetOpen}
          asset={selectedAsset}
          onCreateLease={handleCreateLease}
          onEditUnit={handleEditUnit}
        />

        {/* Create Lease Wizard */}
        {(selectedAsset || selectedUnit) && (
          <CreateLeaseWizard
            open={leaseWizardOpen}
            onOpenChange={(open) => {
              setLeaseWizardOpen(open);
              // Clear CRM conversion data when closing
              if (!open) {
                setCrmConversionData(null);
              }
            }}
            unitId={selectedAsset?.unitId || selectedUnit?.id || ""}
            unitName={selectedAsset?.unitNumber || selectedUnit?.name || ""}
            ownerContactId={selectedUnit?.ownerContactId}
            preFillData={
              crmConversionData
                ? {
                    tenantName: crmConversionData.leadName,
                    tenantEmail: crmConversionData.leadEmail,
                    tenantPhone: crmConversionData.leadPhone,
                    rentAmount: crmConversionData.estimatedValue || 0,
                    dealId: crmConversionData.dealId,
                  }
                : undefined
            }
            conversionContext={crmConversionData}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["asset-health"] });
              queryClient.invalidateQueries({ queryKey: ["leases"] });
              setCrmConversionData(null);
            }}
          />
        )}
      </AppLayout>
    </>
  );
};

export default AssetHealth;
