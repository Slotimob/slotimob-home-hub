import { useState } from "react";
import { format, addDays, isBefore, isToday, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  User,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Zap,
  Building2,
  Edit3,
  ExternalLink,
  Download,
  Receipt,
  Calendar,
  Scale,
  Route,
  Upload,
  XCircle,
  FileSignature,
  Trash2,
  Plus,
  Phone,
  Users,
} from "lucide-react";
import { RefreshCw, Pencil } from "lucide-react";
import { cn, formatPhoneForWhatsApp } from "@/lib/utils";
import { useLeaseByUnitId, generateBillingMessage, useUpdateLease, BillingLog } from "@/hooks/useLeases";
import { useNavigate } from "react-router-dom";
import { AssetHealth } from "@/hooks/useAssetHealth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { TenantStatementDialog } from "./TenantStatementDialog";
import { OwnerReportDialog } from "./OwnerReportDialog";
import { DimobStatusCard } from "./DimobStatusCard";
import { LeaseJourneyTab } from "./LeaseJourneyTab";
import { ConfigureObligationsDialog } from "./ConfigureObligationsDialog";
import { ContractGeneratorDialog } from "./ContractGeneratorDialog";
// TerminateContractDialog is now handled by parent component
import { EditStartDateDialog } from "./EditStartDateDialog";
import type { Lease } from "@/hooks/useLeases";

interface LeaseManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetHealth | null;
  onCreateLease: () => void;
  onEditUnit: () => void;
  onEditLease?: () => void;
  onDeleteLease?: () => void;
  // CRITICAL: Delegate terminate to parent to avoid portal conflicts
  onTerminateLease?: () => void;
  // Optional: pass lease data directly (for when opening from contracts table)
  leaseData?: Lease | null;
}

export function LeaseManagementSheet({
  open,
  onOpenChange,
  asset,
  onCreateLease,
  onEditUnit,
  onEditLease,
  onDeleteLease,
  onTerminateLease,
  leaseData,
}: LeaseManagementSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // Use passed leaseData if available, otherwise fetch by unit ID
  const { data: fetchedLease, isLoading } = useLeaseByUnitId(
    leaseData ? null : asset?.unitId || null
  );
  
  // Use passed data or fetched data
  const lease = leaseData || fetchedLease;
  const updateLease = useUpdateLease();
  const [activeTab, setActiveTab] = useState("journey");
  const [showTenantStatement, setShowTenantStatement] = useState(false);
  const [showOwnerReport, setShowOwnerReport] = useState(false);
  const [showObligationsDialog, setShowObligationsDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showEditStartDateDialog, setShowEditStartDateDialog] = useState(false);

  // Manual billing log registration
  const [showBillingLogForm, setShowBillingLogForm] = useState(false);
  const [billingLogForm, setBillingLogForm] = useState({
    sent_by: "",
    method: "whatsapp" as "whatsapp" | "email" | "phone" | "in_person" | "other",
    notes: "",
  });

  // Calculate next due date
  const getNextDueDate = () => {
    if (!lease) return null;
    const today = new Date();
    const currentMonthDue = new Date(today.getFullYear(), today.getMonth(), lease.due_day);
    
    if (isBefore(currentMonthDue, today)) {
      return addMonths(currentMonthDue, 1);
    }
    return currentMonthDue;
  };

  const nextDueDate = getNextDueDate();
  const currentMonth = format(new Date(), "MMMM/yyyy", { locale: ptBR });
  const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

  // Calculate billing reminder statuses
  const getBillingStatus = () => {
    if (!lease || !nextDueDate) return { reminder: false, dueDay: false, overdue: false };

    const today = new Date();
    const reminderDate = addDays(nextDueDate, -3);

    return {
      reminder: isBefore(reminderDate, today) || isToday(reminderDate),
      dueDay: isToday(nextDueDate),
      overdue: isBefore(nextDueDate, today),
    };
  };

  const billingStatus = getBillingStatus();

  // Handle automation step toggle (formato novo: steps por offset em dias)
  const handleAutomationToggle = async (step: "-3" | "0" | "1" | "3", value: boolean) => {
    if (!lease) return;

    try {
      await updateLease.mutateAsync({
        id: lease.id,
        data: {
          billing_automation: {
            ...(lease.billing_automation ?? { enabled: true, email_to: null }),
            enabled: true,
            steps: {
              ...(lease.billing_automation?.steps ?? { "-3": true, "0": true, "1": false, "3": true }),
              [step]: value,
            },
          },
        },
      });
      toast({ title: "Configuração atualizada!" });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  // Quick edit unit (CIB, etc.)
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [editedCib, setEditedCib] = useState("");

  const handleSaveCib = async () => {
    if (!asset) return;

    try {
      const { error } = await supabase
        .from("units")
        .update({ cib: editedCib || null })
        .eq("id", asset.unitId);

      if (error) throw error;

      toast({ title: "CIB atualizado com sucesso!" });
      setIsEditingUnit(false);
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (!asset) return null;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            {asset.propertyName ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <Home className="h-5 w-5 text-primary" />
            )}
            <SheetTitle className="text-lg">{asset.unitNumber}</SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["lease", "unit", asset?.unitId] });
                queryClient.invalidateQueries({ queryKey: ["leases"] });
                queryClient.invalidateQueries({ queryKey: ["asset-health"] });
                toast({ title: "Dados atualizados!" });
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription>
            {asset.propertyName || "Imóvel Avulso"}
          </SheetDescription>
        </SheetHeader>

        {/* Quick Actions Section */}
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ações Rápidas</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Generate PDF */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 justify-start"
              onClick={() => {
                if (lease) {
                setShowContractDialog(true);
                }
              }}
              disabled={!lease}
            >
              <FileSignature className="h-4 w-4" />
              <span className="truncate">Gerar PDF</span>
            </Button>
            
            {/* Register Payment */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 justify-start"
              onClick={() => {
                if (lease && asset) {
                  navigate(`/finance/transactions?unitId=${asset.unitId}&action=new`);
                  onOpenChange(false);
                }
              }}
              disabled={!lease}
            >
              <Receipt className="h-4 w-4" />
              <span className="truncate">Registrar Pagamento</span>
            </Button>
            
            {/* Upload Signed Contract */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 justify-start"
              onClick={() => {
                if (lease) {
                  setActiveTab("journey");
                  toast({ title: "Use a aba Jornada para fazer o upload" });
                }
              }}
              disabled={!lease}
            >
              <Upload className="h-4 w-4" />
              <span className="truncate">Upload Assinado</span>
            </Button>
            
            {/* Terminate Lease */}
            {onTerminateLease && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 justify-start text-destructive hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (lease) {
                  onOpenChange(false);
                  onTerminateLease();
                }
              }}
              disabled={!lease || lease.status === "terminated"}
            >
              <XCircle className="h-4 w-4" />
              <span className="truncate">Encerrar Locação</span>
            </Button>
            )}
            
            {/* Delete Lease */}
            {onDeleteLease && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 justify-start border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive col-span-2"
              onClick={() => {
                if (onDeleteLease) {
                  onDeleteLease();
                }
              }}
              disabled={!lease}
            >
              <Trash2 className="h-4 w-4" />
              <span className="truncate">Excluir Contrato do Sistema</span>
            </Button>
            )}
          </div>
          
          {/* Secondary Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8"
              onClick={onEditUnit}
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
              Editar Imóvel
            </Button>
            {!lease && (
              <Button
                size="sm"
                className="flex-1 h-8 glow-primary"
                onClick={onCreateLease}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Novo Contrato
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="journey" className="gap-1 text-xs px-1">
              <Route className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Jornada</span>
            </TabsTrigger>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="fiscal" className="gap-1 text-xs px-1">
              <Scale className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fiscal</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-xs px-1">Cobrança</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs px-1">Relatórios</TabsTrigger>
          </TabsList>

          {/* Journey Tab */}
          <TabsContent value="journey" className="mt-4">
            <LeaseJourneyTab
              lease={lease ? {
                id: lease.id,
                unit_id: lease.unit_id,
                status: lease.status,
                signature_status: lease.signature_status,
                signed_contract_path: lease.signed_contract_path,
                metadata: lease.metadata as any,
                termination_date: lease.termination_date,
              } : null}
              unitId={asset?.unitId || ""}
               fullLeaseData={lease ? {
                 id: lease.id,
                 start_date: lease.start_date,
                 rent_amount: lease.rent_amount,
                 // FIXED: Now these fields are properly typed in the Lease interface
                 next_adjustment_date: lease.next_adjustment_date,
                 adjustment_index: lease.adjustment_index,
                 end_date: lease.end_date,
                 is_indefinite_term: lease.is_indefinite_term ?? null,
                 due_day: lease.due_day,
                 tenant_contact_id: lease.tenant_contact_id,
                 owner_contact_id: (lease as any).owner_contact_id ?? null,
                 property_id: lease.property_id,
                 fire_insurance: lease.fire_insurance ?? null,
                 iptu_charge: lease.iptu_charge ?? null,
                 additional_obligations: (lease as any).additional_obligations ?? null,
                 unit: lease.unit,
                 tenant: lease.tenant,
               } : null}
              onEditContract={() => {
                if (onEditLease) {
                  onEditLease();
                } else {
                  toast({ title: "Edição não disponível neste contexto" });
                }
              }}
              onConfigureObligations={() => setShowObligationsDialog(true)}
              onDownloadPdf={() => setShowContractDialog(true)}
              onTerminate={() => {
                // CRITICAL FIX: Delegate to parent to handle termination dialog
                if (onTerminateLease) {
                  onOpenChange(false);
                  onTerminateLease();
                }
              }}
            />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Occupancy Status Card */}
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Status de Ocupação</CardTitle>
                  <Badge
                    variant={lease ? "default" : "secondary"}
                    className={cn(
                      lease ? "bg-green-500/15 text-green-600 border-green-500/30" : ""
                    )}
                  >
                    {lease ? "Ocupado" : "Vago"}
                  </Badge>
                </div>
              </CardHeader>
              {lease && (
                <CardContent className="py-2 px-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{lease.tenant?.name}</p>
                      <p className="text-xs text-muted-foreground">{lease.tenant?.email}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                  {/* Start Date Display */}
                  <div className="flex items-center justify-between col-span-2 pb-2">
                    <div>
                      <p className="text-muted-foreground text-xs">Início do Contrato</p>
                      <p className="font-semibold text-sm">
                        {format(new Date(lease.start_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowEditStartDateDialog(true)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Aluguel</p>
                      <p className="font-semibold">
                        {lease.rent_amount.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
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
                      <p className="font-semibold">
                        {nextDueDate ? format(nextDueDate, "dd/MM/yyyy") : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Quick CIB Edit */}
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
                      if (isEditingUnit) {
                        handleSaveCib();
                      } else {
                        setEditedCib("");
                        setIsEditingUnit(true);
                      }
                    }}
                  >
                    {isEditingUnit ? "Salvar" : "Editar"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                {isEditingUnit ? (
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
                  <p className="text-sm text-muted-foreground">
                    CIB: {"-"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Payment Health */}
            {lease && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium">Saúde do Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="flex items-center gap-2">
                    {asset.overallStatus === "healthy" && (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">Em dia</span>
                      </>
                    )}
                    {asset.overallStatus === "attention" && (
                      <>
                        <Clock className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm text-yellow-600 font-medium">Pendente</span>
                      </>
                    )}
                    {asset.overallStatus === "critical" && (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm text-red-600 font-medium">Em atraso</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Fiscal / DIMOB Tab */}
          <TabsContent value="fiscal" className="space-y-4 mt-4">
            <DimobStatusCard 
              unitId={asset.unitId} 
              onEditUnit={onEditUnit}
              onCreateLease={onCreateLease}
            />
          </TabsContent>

          {/* Billing Automation Tab */}
          <TabsContent value="billing" className="space-y-4 mt-4">
            {!lease ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Crie um contrato para configurar a régua de cobrança
                </p>
                <Button onClick={onCreateLease}>
                  <Zap className="h-4 w-4 mr-1.5" />
                  Novo Contrato
                </Button>
              </div>
            ) : (
              <>
                {/* Quick Send Actions */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium">Enviar Cobrança - {capitalizedMonth}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4 space-y-2">
                    {(() => {
                      const { whatsappPhone, emailLink, message } = generateBillingMessage(
                        lease,
                        billingStatus.overdue ? "overdue" : billingStatus.dueDay ? "due" : "reminder",
                        capitalizedMonth
                      );
                      return (
                        <div className="flex gap-2">
                          {whatsappPhone && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                const encodedMessage = encodeURIComponent(message);
                                navigate(`/whatsapp?phone=${formatPhoneForWhatsApp(whatsappPhone)}&text=${encodedMessage}`);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1.5 text-green-600" />
                              WhatsApp
                            </Button>
                          )}
                          {emailLink && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              asChild
                            >
                              <a href={emailLink}>
                                <Mail className="h-4 w-4 mr-1.5 text-blue-600" />
                                E-mail
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Billing Timeline */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium">Régua de Cobrança</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Ao ativar uma etapa, ela também passa a ser acompanhada em Afazeres conforme a data de vencimento do contrato.
                    </p>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <div className="space-y-3">
                      {/* 3 days before */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            billingStatus.reminder ? "bg-green-500" : "bg-muted"
                          )} />
                          <span className="text-sm">3 dias antes - Lembrete</span>
                        </div>
                        <Switch
                          checked={lease.billing_automation?.steps?.["-3"] ?? true}
                          onCheckedChange={(v) => handleAutomationToggle("-3", v)}
                        />
                      </div>

                      {/* Due day */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            billingStatus.dueDay ? "bg-yellow-500" : "bg-muted"
                          )} />
                          <span className="text-sm">Dia do vencimento - Cobrança</span>
                        </div>
                        <Switch
                          checked={lease.billing_automation?.steps?.["0"] ?? true}
                          onCheckedChange={(v) => handleAutomationToggle("0", v)}
                        />
                      </div>

                      {/* 1 day late */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            billingStatus.overdue ? "bg-red-500" : "bg-muted"
                          )} />
                          <span className="text-sm">1 dia após - Aviso de atraso</span>
                        </div>
                        <Switch
                          checked={lease.billing_automation?.steps?.["1"] ?? false}
                          onCheckedChange={(v) => handleAutomationToggle("1", v)}
                        />
                      </div>

                      {/* 3 days late */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            billingStatus.overdue ? "bg-red-500" : "bg-muted"
                          )} />
                          <span className="text-sm">3 dias após - Inadimplência</span>
                        </div>
                        <Switch
                          checked={lease.billing_automation?.steps?.["3"] ?? true}
                          onCheckedChange={(v) => handleAutomationToggle("3", v)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Billing Logs */}
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
                    {/* Manual registration form */}
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
                            onValueChange={(v) => setBillingLogForm({ ...billingLogForm, method: v as typeof billingLogForm.method })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="whatsapp">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                                  WhatsApp
                                </div>
                              </SelectItem>
                              <SelectItem value="phone">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-blue-600" />
                                  Ligação
                                </div>
                              </SelectItem>
                              <SelectItem value="email">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-violet-600" />
                                  E-mail
                                </div>
                              </SelectItem>
                              <SelectItem value="in_person">
                                <div className="flex items-center gap-2">
                                  <Users className="h-3.5 w-3.5 text-amber-600" />
                                  Presencial
                                </div>
                              </SelectItem>
                              <SelectItem value="other">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Outro
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
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
                                  notes: billingLogForm.notes.trim() || undefined,
                                };
                                const updatedLogs = [...(lease.billing_logs || []), newLog];
                                await updateLease.mutateAsync({
                                  id: lease.id,
                                  data: { billing_logs: updatedLogs },
                                });
                                toast({ title: "Contato registrado!" });
                                setShowBillingLogForm(false);
                                setBillingLogForm({ sent_by: "", method: "whatsapp", notes: "" });
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
                              setBillingLogForm({ sent_by: "", method: "whatsapp", notes: "" });
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {lease.billing_logs.length === 0 ? (
                      !showBillingLogForm && <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum envio registrado ainda
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {lease.billing_logs.slice().reverse().slice(0, 10).map((log, index) => (
                          <div key={index} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                            <div className="flex items-center gap-2">
                              {log.method === "whatsapp" && <MessageSquare className="h-3.5 w-3.5 text-green-600" />}
                              {log.method === "phone" && <Phone className="h-3.5 w-3.5 text-blue-600" />}
                              {log.method === "email" && <Mail className="h-3.5 w-3.5 text-violet-600" />}
                              {log.method === "in_person" && <Users className="h-3.5 w-3.5 text-amber-600" />}
                              {log.method === "other" && <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />}
                              <div className="flex flex-col">
                                <span className="text-xs">
                                  {log.type === "manual" ? "Contato manual" : log.type.replace(/_/g, " ")}
                                </span>
                                {log.sent_by && (
                                  <span className="text-[10px] text-muted-foreground">por {log.sent_by}</span>
                                )}
                                {log.notes && (
                                  <span className="text-[10px] text-muted-foreground italic truncate max-w-[150px]">{log.notes}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">
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
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4 mt-4">
            {!lease ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Crie um contrato para gerar relatórios
                </p>
              </div>
            ) : (
              <>
                {/* Owner Report Preview */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-emerald-500" />
                      Relatório do Proprietário
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aluguel Recebido</span>
                        <span className="font-medium">
                          {lease.rent_amount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxa Administração ({lease.admin_fee_percentage}%)</span>
                        <span className="font-medium text-destructive">
                          -{(lease.rent_amount * lease.admin_fee_percentage / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="font-medium">Repasse Líquido</span>
                        <span className="font-bold text-emerald-600">
                          {(lease.rent_amount * (1 - lease.admin_fee_percentage / 100)).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOwnerReport(true)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Gerar Relatório Completo
                    </Button>
                  </CardContent>
                </Card>

                {/* Tenant Statement */}
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
                    <Button
                      className="w-full glow-primary"
                      size="sm"
                      onClick={() => setShowTenantStatement(true)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Gerar Extrato PDF
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Report Dialogs */}
        {lease && (
          <>
            <TenantStatementDialog
              open={showTenantStatement}
              onOpenChange={setShowTenantStatement}
              lease={lease}
            />
            <OwnerReportDialog
              open={showOwnerReport}
              onOpenChange={setShowOwnerReport}
              lease={lease}
            />
          </>
        )}

        {/* Obligations Configuration Dialog */}
        {asset && (
          <ConfigureObligationsDialog
            open={showObligationsDialog}
            onOpenChange={setShowObligationsDialog}
            unitId={asset.unitId}
            unitName={asset.unitNumber}
          />
        )}

        {/* Contract PDF Generator Dialog */}
        {asset && (
          <ContractGeneratorDialog
            open={showContractDialog}
            onOpenChange={setShowContractDialog}
            unitId={asset.unitId}
            leaseId={lease?.id}
          />
        )}
      </SheetContent>
    </Sheet>

    {/* TerminateContractDialog is now handled by parent component to avoid portal conflicts */}

    {/* Edit Start Date Dialog */}
    <EditStartDateDialog
      open={showEditStartDateDialog}
      onOpenChange={setShowEditStartDateDialog}
      lease={lease ? {
        id: lease.id,
        start_date: lease.start_date,
        unit: lease.unit,
        tenant: lease.tenant,
      } : null}
      onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ["lease", "unit", asset?.unitId] });
        queryClient.invalidateQueries({ queryKey: ["leases"] });
      }}
    />
    </>
  );
}
