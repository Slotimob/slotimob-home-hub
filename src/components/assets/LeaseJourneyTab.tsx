 import { useState, useRef } from "react";
 import { format, parseISO, differenceInDays } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
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
import { invalidateLeaseQueries } from "@/lib/query-invalidation";
import {
  getAdjustmentStatus,
  getAdjustmentStatusConfig,
  ADJUSTMENT_STATUS_LABELS,
} from "@/lib/lease-status";
import {
   ClipboardCheck,
   FileText,
   FileSignature,
   Settings,
   TrendingUp,
   DoorOpen,
   Check,
   Clock,
   Upload,
   Download,
   ExternalLink,
   Loader2,
   AlertCircle,
  Trash2,
   Download as DownloadIcon,
   RefreshCw,
  Key,
  FileCheck,
   Calendar,
   Pencil,
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { isLeaseDocumentKey, registerLeaseDocument, unregisterLeaseDocument } from "@/lib/lease-documents";
 import { toast } from "sonner";
 import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateLease } from "@/hooks/useLeases";
import { EditAdjustmentDateDialog } from "./EditAdjustmentDateDialog";
import { AdjustmentCalculatorDialog } from "./AdjustmentCalculatorDialog";
import { RentEvolutionTimeline } from "./RentEvolutionTimeline";

 interface LeaseData {
   id: string;
   unit_id: string;
   status: string;
   signature_status?: string | null;
   signed_contract_path?: string | null;
   start_date?: string;
   rent_amount?: number;
   next_adjustment_date?: string | null;
   metadata?: {
     entry_inspection_path?: string;
     entry_inspection_date?: string;
     exit_inspection_path?: string;
     exit_inspection_date?: string;
    closing_documents_path?: string;
    closing_documents_date?: string;
    key_return_path?: string;
    key_return_date?: string;
     obligations_configured?: boolean;
    obligations_inherited_at?: string;
    obligations_pending_review?: boolean;
     last_adjustment_year?: number;
   } | null;
   termination_date?: string | null;
 }
 
 interface LeaseJourneyTabProps {
   lease: LeaseData | null;
   unitId: string;
   onEditContract?: () => void;
   onConfigureObligations: () => void;
  onDownloadPdf?: () => void;
  onTerminate?: () => void;
   fullLeaseData?: {
     id: string;
     start_date: string;
     rent_amount: number;
     next_adjustment_date?: string | null;
     adjustment_index?: string | null;
     end_date?: string | null;
     is_indefinite_term?: boolean | null;
     due_day?: number | null;
     tenant_contact_id?: string | null;
     property_id?: string | null;
     fire_insurance?: any;
     iptu_charge?: any;
     unit?: { unit_number: string } | null;
     tenant?: { name: string } | null;
    initial_rent?: number;
   } | null;
  /** When false, all write actions (edit dates, upload/delete files, apply
   *  adjustment, configure obligations) are hidden and the tab becomes
   *  view-only. Defaults to true to preserve existing consumers. */
  canEdit?: boolean;
 }
 
 type StepStatus = "completed" | "pending" | "disabled";
 
 interface JourneyStep {
   id: string;
   title: string;
   description: string;
   icon: React.ElementType;
   status: StepStatus;
   filePath?: string | null;
   uploadKey?: string;
   action?: () => void;
   actionLabel?: string;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
  canDelete?: boolean;
 }
 
 export function LeaseJourneyTab({
   lease,
   unitId,
   onEditContract,
   onConfigureObligations,
  onDownloadPdf,
  onTerminate,
 fullLeaseData,
 canEdit = true,
 }: LeaseJourneyTabProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
   const queryClient = useQueryClient();
   const [uploadingStep, setUploadingStep] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [currentUploadKey, setCurrentUploadKey] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
   const [showEditAdjustmentDate, setShowEditAdjustmentDate] = useState(false);
  const [showAdjustmentCalculator, setShowAdjustmentCalculator] = useState(false);
   const [editingStartDate, setEditingStartDate] = useState(false);
   const [startDateValue, setStartDateValue] = useState("");
   const [savingStartDate, setSavingStartDate] = useState(false);
   const updateLease = useUpdateLease();
 
   const currentYear = new Date().getFullYear();
   const isTerminating = lease?.status === "terminated" || !!lease?.termination_date;
 
   // Build journey steps based on lease state
   const getJourneySteps = (): JourneyStep[] => {
     if (!lease) {
       return [
         {
           id: "no-contract",
           title: "Contrato Pendente",
           description: "Crie um contrato de locação para iniciar a jornada.",
           icon: FileText,
           status: "pending" as StepStatus,
         },
       ];
     }
 
     const metadata = lease.metadata || {};
 
     const steps: JourneyStep[] = [
       {
         id: "entry-inspection",
         title: "Vistoria de Entrada",
         description: metadata.entry_inspection_path
           ? `Realizada em ${metadata.entry_inspection_date ? format(new Date(metadata.entry_inspection_date), "dd/MM/yyyy", { locale: ptBR }) : "data não informada"}`
           : "Faça upload do laudo de vistoria de entrada",
         icon: ClipboardCheck,
         status: metadata.entry_inspection_path ? "completed" : "pending",
         filePath: metadata.entry_inspection_path,
         uploadKey: "entry_inspection",
        canDelete: !!metadata.entry_inspection_path,
       },
       {
         id: "contract-pdf",
         title: "Contrato de Locação",
         description: "Gere o PDF do contrato com todos os dados preenchidos",
         icon: FileText,
         status: "completed", // Always completed if lease exists
         action: onEditContract,
        actionLabel: "Editar",
        secondaryAction: onDownloadPdf,
        secondaryActionLabel: "Baixar PDF",
       },
       {
         id: "signature",
         title: "Assinatura das Partes",
         description: lease.signature_status === "signed"
           ? "Contrato assinado e arquivado"
           : "Faça upload do contrato assinado",
         icon: FileSignature,
         status: lease.signature_status === "signed" ? "completed" : "pending",
         filePath: lease.signed_contract_path,
         uploadKey: "signed_contract",
        canDelete: !!lease.signed_contract_path,
       },
       (() => {
         const pendingReview = metadata.obligations_pending_review === true;
         const inheritedAt = metadata.obligations_inherited_at
           ? format(new Date(metadata.obligations_inherited_at), "dd/MM/yyyy", { locale: ptBR })
           : null;
         return {
           id: "obligations",
           title: "Configuração de Obrigações",
           description: pendingReview
             ? `Herdada do contrato${inheritedAt ? ` em ${inheritedAt}` : ""} — pendente de revisão`
             : metadata.obligations_configured
               ? "IPTU, Condomínio e outras despesas configuradas"
               : "Configure as despesas recorrentes do imóvel",
           icon: Settings,
           status: (metadata.obligations_configured && !pendingReview
             ? "completed"
             : "pending") as StepStatus,
           action: onConfigureObligations,
           actionLabel: pendingReview ? "Revisar" : "Configurar",
         };
       })(),
        (() => {
          const adjStatus = getAdjustmentStatus(fullLeaseData?.next_adjustment_date);
          const appliedThisYear = metadata.last_adjustment_year === currentYear;
          // Concluído quando o reajuste não está vencido, ou já foi aplicado no ano corrente
          const isDone = appliedThisYear || adjStatus === "em_dia" || adjStatus === "proximo";
          return {
            id: "adjustment",
            title: "Reajuste Anual",
            description: fullLeaseData?.next_adjustment_date
              ? `${ADJUSTMENT_STATUS_LABELS[adjStatus]} • Próximo: ${format(parseISO(fullLeaseData.next_adjustment_date), "dd/MM/yyyy", { locale: ptBR })}`
              : appliedThisYear
                ? `Reajuste aplicado em ${currentYear}`
                : "Data não configurada — clique para definir",
            icon: TrendingUp,
            status: (isDone ? "completed" : "pending") as "completed" | "pending",
          };
        })(),
     ];
 
    // Add termination steps if contract is terminating
     if (isTerminating) {
       steps.push({
         id: "exit-inspection",
         title: "Vistoria de Saída",
         description: metadata.exit_inspection_path
           ? `Realizada em ${metadata.exit_inspection_date ? format(new Date(metadata.exit_inspection_date), "dd/MM/yyyy", { locale: ptBR }) : "data não informada"}`
           : "Faça upload do laudo de vistoria de saída",
         icon: DoorOpen,
         status: metadata.exit_inspection_path ? "completed" : "pending",
         filePath: metadata.exit_inspection_path,
         uploadKey: "exit_inspection",
        canDelete: !!metadata.exit_inspection_path,
      });

      steps.push({
        id: "closing-documents",
        title: "Documentos de Encerramento",
        description: metadata.closing_documents_path
          ? `Arquivado em ${metadata.closing_documents_date ? format(new Date(metadata.closing_documents_date), "dd/MM/yyyy", { locale: ptBR }) : "data não informada"}`
          : "Faça upload do termo de rescisão ou distrato",
        icon: FileCheck,
        status: metadata.closing_documents_path ? "completed" : "pending",
        filePath: metadata.closing_documents_path,
        uploadKey: "closing_documents",
        canDelete: !!metadata.closing_documents_path,
      });

      steps.push({
        id: "key-return",
        title: "Recebimento de Chaves",
        description: metadata.key_return_path
          ? `Registrado em ${metadata.key_return_date ? format(new Date(metadata.key_return_date), "dd/MM/yyyy", { locale: ptBR }) : "data não informada"}`
          : "Faça upload do termo de entrega de chaves",
        icon: Key,
        status: metadata.key_return_path ? "completed" : "pending",
        filePath: metadata.key_return_path,
        uploadKey: "key_return",
        canDelete: !!metadata.key_return_path,
       });
     }
 
     return steps;
   };
 
   const journeySteps = getJourneySteps();
 
   // Handle file upload
   const handleUpload = (uploadKey: string) => {
     setCurrentUploadKey(uploadKey);
     fileInputRef.current?.click();
   };
 
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file || !lease || !user || !currentUploadKey) return;
 
     setUploadingStep(currentUploadKey);
 
     try {
       const fileExt = file.name.split(".").pop();
       const fileName = `${lease.id}/${currentUploadKey}_${Date.now()}.${fileExt}`;
       const filePath = `${effectiveBrokerId}/${fileName}`;
 
       // Upload to storage
       const { error: uploadError } = await supabase.storage
         .from("documents")
         .upload(filePath, file, { upsert: true });
 
       if (uploadError) throw uploadError;
 
       // Update lease metadata or signed_contract_path
       if (currentUploadKey === "signed_contract") {
          const { error: dbError1 } = await supabase
            .from("leases")
            .update({
              signed_contract_path: filePath,
              signature_status: "signed",
            })
            .eq("id", lease.id);
          if (dbError1) throw dbError1;
       } else {
         const metadataUpdate = {
           ...lease.metadata,
           [`${currentUploadKey}_path`]: filePath,
           [`${currentUploadKey}_date`]: new Date().toISOString(),
         };
 
          const { error: dbError2 } = await supabase
            .from("leases")
            .update({ metadata: metadataUpdate })
            .eq("id", lease.id);
          if (dbError2) throw dbError2;
       }

       // Acréscimo: registra também na tabela unificada `documents`
       if (isLeaseDocumentKey(currentUploadKey)) {
         await registerLeaseDocument({
           key: currentUploadKey,
           brokerId: effectiveBrokerId,
           filePath,
           unitId: lease.unit_id,
           fileSize: file.size,
           mimeType: file.type,
           reference: (lease as any)?.tenant_contact?.name || (lease as any)?.unit?.unit_number || null,
         });
       }

        await invalidateLeaseQueries(queryClient);
        queryClient.invalidateQueries({ queryKey: ["documents-unified"] });
        queryClient.invalidateQueries({ queryKey: ["action-center-contracts"] });
        queryClient.invalidateQueries({ queryKey: ["action-center-payables"] });
        queryClient.invalidateQueries({ queryKey: ["action-center-receivables"] });
        toast.success("Arquivo enviado com sucesso!");
     } catch (error: any) {
       console.error("Upload error:", error);
       toast.error("Erro ao enviar arquivo", {
         description: error.message,
       });
     } finally {
       setUploadingStep(null);
       setCurrentUploadKey(null);
       if (fileInputRef.current) fileInputRef.current.value = "";
     }
   };
 
   // Handle file download/view
   const handleViewFile = async (filePath: string) => {
     try {
       const { data, error } = await supabase.storage
         .from("documents")
        .createSignedUrl(filePath, 3600, { download: true });
 
       if (error) throw error;
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = filePath.split('/').pop() || 'arquivo';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
     } catch (error: any) {
      toast.error("Erro ao baixar arquivo", {
         description: error.message,
       });
     }
   };
 
  // Handle refresh
  const handleRefresh = async () => {
    await invalidateLeaseQueries(queryClient);
    toast.success("Dados atualizados!");
  };

  // Handle file deletion
  const handleDeleteFile = async (uploadKey: string) => {
    if (!lease || !user) return;

    setDeletingFile(uploadKey);

    try {
      let filePath: string | null = null;

      if (uploadKey === "signed_contract") {
        filePath = lease.signed_contract_path || null;
      } else {
        const metadata = lease.metadata || {};
        filePath = metadata[`${uploadKey}_path` as keyof typeof metadata] as string || null;
      }

      // Delete from storage if exists
      if (filePath) {
        await supabase.storage.from("documents").remove([filePath]);
      }

      // Update lease
      if (uploadKey === "signed_contract") {
        await supabase
          .from("leases")
          .update({
            signed_contract_path: null,
            signature_status: "pending",
          })
          .eq("id", lease.id);
      } else {
        const currentMetadata = lease.metadata || {};
        const metadataUpdate = { ...currentMetadata };
        delete metadataUpdate[`${uploadKey}_path` as keyof typeof metadataUpdate];
        delete metadataUpdate[`${uploadKey}_date` as keyof typeof metadataUpdate];

        await supabase
          .from("leases")
          .update({ metadata: metadataUpdate })
          .eq("id", lease.id);
      }

      await unregisterLeaseDocument(effectiveBrokerId, filePath);

      await invalidateLeaseQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["documents-unified"] });
      queryClient.invalidateQueries({ queryKey: ["action-center-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["action-center-payables"] });
      queryClient.invalidateQueries({ queryKey: ["action-center-receivables"] });
      toast.success("Arquivo removido com sucesso!");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Erro ao remover arquivo", {
        description: error.message,
      });
    } finally {
      setDeletingFile(null);
      setConfirmDeleteKey(null);
    }
  };

   const getStatusIcon = (status: StepStatus) => {
     switch (status) {
       case "completed":
         return <Check className="h-4 w-4" />;
       case "pending":
         return <Clock className="h-4 w-4" />;
       default:
         return <AlertCircle className="h-4 w-4" />;
     }
   };
 
   const getStatusColor = (status: StepStatus) => {
     switch (status) {
       case "completed":
         return "bg-emerald-500 text-white border-emerald-500";
       case "pending":
         return "bg-amber-500/20 text-amber-600 border-amber-500";
       default:
         return "bg-muted text-muted-foreground border-muted";
     }
   };
 
   if (!lease) {
     return (
       <div className="flex flex-col items-center justify-center py-12 text-center">
         <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
         <h3 className="font-semibold mb-2">Nenhum Contrato Ativo</h3>
         <p className="text-sm text-muted-foreground mb-4 max-w-xs">
           Crie um contrato de locação para acompanhar toda a jornada do imóvel.
         </p>
       </div>
     );
   }
 
   return (
     <div className="space-y-4">
       {/* Hidden file input */}
       <input
         ref={fileInputRef}
         type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
         className="hidden"
         onChange={handleFileChange}
       />
 
      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!confirmDeleteKey} onOpenChange={(open) => !open && setConfirmDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Arquivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este arquivo? Você poderá fazer um novo upload depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteKey && handleDeleteFile(confirmDeleteKey)}
            >
              {deletingFile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* Journey Header */}
       <div className="flex items-center justify-between">
         <div>
           <h3 className="font-semibold">Jornada da Locação</h3>
           <p className="text-xs text-muted-foreground">
            Acompanhe cada etapa do ciclo de vida do contrato. Ao fazer upload de um arquivo PDF ou imagem, o status da etapa será automaticamente marcado como concluído.
           </p>
         </div>
         <Button
           variant="ghost"
           size="icon"
           className="h-8 w-8"
           onClick={handleRefresh}
         >
           <RefreshCw className="h-4 w-4" />
         </Button>
       </div>

        {/* Start Date + Adjustment Cards */}
        {fullLeaseData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Start Date Card */}
            <div className="rounded-lg border bg-card p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Início do Contrato</span>
                </div>
                {canEdit && (!editingStartDate ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      setStartDateValue(fullLeaseData.start_date);
                      setEditingStartDate(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setEditingStartDate(false)}
                      disabled={savingStartDate}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      disabled={savingStartDate}
                      onClick={async () => {
                        if (!startDateValue) return;
                        setSavingStartDate(true);
                        try {
                          await updateLease.mutateAsync({
                            id: fullLeaseData.id,
                            data: { start_date: startDateValue },
                          });
                          await invalidateLeaseQueries(queryClient);
                          toast.success("Data de início atualizada!");
                          setEditingStartDate(false);
                        } catch (err: any) {
                          toast.error("Erro ao salvar", { description: err.message });
                        } finally {
                          setSavingStartDate(false);
                        }
                      }}
                    >
                      {savingStartDate ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                ))}
              </div>
              {editingStartDate ? (
                <Input
                  type="date"
                  value={startDateValue}
                  onChange={(e) => setStartDateValue(e.target.value)}
                  className="h-7 text-xs"
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(fullLeaseData.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            {/* Adjustment Controls Card */}
            {(() => {
              const adjustmentDate = fullLeaseData.next_adjustment_date ? parseISO(fullLeaseData.next_adjustment_date) : null;
              const adjConfig = getAdjustmentStatusConfig(fullLeaseData.next_adjustment_date);
              const daysUntilAdjustment = adjConfig.daysUntil;
              const isOverdue = adjConfig.status === "vencido";
              const isComingSoon = adjConfig.status === "proximo";

              return (
                <div className={cn(
                  "rounded-lg border bg-card p-2.5 space-y-2",
                  isOverdue && "border-red-500/40"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">Controle de Reajuste</span>
                    </div>
                    <Badge variant={adjConfig.variant} className={cn("text-[10px] px-1.5 py-0 h-5", adjConfig.className)}>
                      {adjConfig.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Próximo Reajuste</p>
                      <p className="text-xs font-medium">
                        {fullLeaseData.next_adjustment_date
                          ? format(parseISO(fullLeaseData.next_adjustment_date), "dd/MM/yyyy")
                          : "Não definido"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Valor Atual</p>
                      <p className="text-xs font-medium">
                        {fullLeaseData.rent_amount.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                    {fullLeaseData.adjustment_index && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground">Índice</p>
                        <p className="text-xs font-medium">{fullLeaseData.adjustment_index}</p>
                      </div>
                    )}
                  </div>

                  {isOverdue && adjustmentDate && (
                    <div className="p-2 rounded-md bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-700">
                        Reajuste vencido em {format(adjustmentDate, "dd/MM/yyyy", { locale: ptBR })}. Aplique o reajuste para manter o contrato atualizado.
                      </p>
                    </div>
                  )}
                  {isComingSoon && !isOverdue && adjustmentDate && (
                    <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-700">
                        Reajuste em {daysUntilAdjustment} dias ({format(adjustmentDate, "dd/MM/yyyy")}).
                      </p>
                    </div>
                  )}

                  {canEdit && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-[10px]"
                        onClick={() => setShowEditAdjustmentDate(true)}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Alterar Data
                      </Button>
                      <Button
                        size="sm"
                        className={cn(
                          "flex-1 h-7 text-[10px]",
                          isOverdue && "bg-red-500 hover:bg-red-600 text-white"
                        )}
                        onClick={() => setShowAdjustmentCalculator(true)}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {isOverdue ? "Aplicar Reajuste (Vencido!)" : "Aplicar Reajuste"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

 
       {/* Rent Evolution Timeline */}
       {fullLeaseData && (
         <RentEvolutionTimeline
           leaseId={fullLeaseData.id}
           startDate={fullLeaseData.start_date}
           initialRent={fullLeaseData.initial_rent || fullLeaseData.rent_amount}
           currentRent={fullLeaseData.rent_amount}
         />
       )}

      {/* Terminated Notice */}
      {isTerminating && (
        <div className="rounded-lg border border-muted bg-muted/30 p-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Contrato Encerrado</span> — Complete as etapas finais abaixo para arquivamento.
          </p>
        </div>
      )}

       {/* Vertical Stepper */}
       <div className="relative">
         {journeySteps.map((step, index) => {
           const StepIcon = step.icon;
           const isLast = index === journeySteps.length - 1;
 
           return (
             <div key={step.id} className="relative flex gap-4 pb-6">
               {/* Vertical Line */}
               {!isLast && (
                 <div
                   className={cn(
                     "absolute left-[19px] top-10 h-[calc(100%-24px)] w-0.5",
                     step.status === "completed" ? "bg-emerald-500" : "bg-border"
                   )}
                 />
               )}
 
               {/* Step Indicator */}
               <div
                 className={cn(
                   "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 z-10",
                   getStatusColor(step.status)
                 )}
               >
                 {uploadingStep === step.uploadKey ? (
                   <Loader2 className="h-4 w-4 animate-spin" />
                 ) : (
                   <StepIcon className="h-4 w-4" />
                 )}
               </div>
 
               {/* Step Content */}
               <div className="flex-1 min-w-0 pt-1">
                 <div className="flex items-center gap-2 mb-1">
                   <h4 className="font-medium text-sm">{step.title}</h4>
                   <Badge
                     variant={step.status === "completed" ? "default" : "secondary"}
                     className={cn(
                       "text-[10px]",
                       step.status === "completed" && "bg-emerald-500"
                     )}
                   >
                     {step.status === "completed" ? "Concluído" : "Pendente"}
                   </Badge>
                 </div>
                 <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
 
                 {/* Actions */}
                 <div className="flex flex-wrap gap-2">
                   {step.uploadKey && (
                     <>
                       {canEdit && (
                         <Button
                           variant="outline"
                           size="sm"
                           className="h-7 text-xs"
                           onClick={() => handleUpload(step.uploadKey!)}
                          disabled={uploadingStep === step.uploadKey || deletingFile === step.uploadKey}
                         >
                           {uploadingStep === step.uploadKey ? (
                             <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                           ) : (
                             <Upload className="h-3 w-3 mr-1" />
                           )}
                          {step.filePath ? "Substituir" : "Upload"}
                         </Button>
                       )}
                       {step.filePath && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleViewFile(step.filePath!)}
                          >
                            <DownloadIcon className="h-3 w-3 mr-1" />
                            Baixar
                          </Button>
                          {canEdit && step.canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeleteKey(step.uploadKey!)}
                              disabled={deletingFile === step.uploadKey}
                            >
                              {deletingFile === step.uploadKey ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3 mr-1" />
                              )}
                              Remover
                            </Button>
                          )}
                        </>
                       )}
                     </>
                   )}
                   {canEdit && step.action && (
                     <Button
                       variant="outline"
                       size="sm"
                       className="h-7 text-xs"
                       onClick={step.action}
                     >
                       <ExternalLink className="h-3 w-3 mr-1" />
                       {step.actionLabel || "Ação"}
                     </Button>
                   )}
                  {step.secondaryAction && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={step.secondaryAction}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      {step.secondaryActionLabel || "Download"}
                    </Button>
                  )}
                 </div>
               </div>
             </div>
           );
         })}
       </div>

       {/* Dialogs */}
       {fullLeaseData && (
         <>
           <EditAdjustmentDateDialog
             open={showEditAdjustmentDate}
             onOpenChange={setShowEditAdjustmentDate}
             lease={{
               id: fullLeaseData.id,
               unit_id: lease?.unit_id || "",
               next_adjustment_date: fullLeaseData.next_adjustment_date || null,
               unit: fullLeaseData.unit,
               tenant_contact: fullLeaseData.tenant ? { name: fullLeaseData.tenant.name } : null,
             }}
             onSuccess={() => {
               queryClient.invalidateQueries({ queryKey: ["lease-by-unit"] });
               queryClient.invalidateQueries({ queryKey: ["leases"] });
             }}
           />
           <AdjustmentCalculatorDialog
             open={showAdjustmentCalculator}
             onOpenChange={setShowAdjustmentCalculator}
             lease={{
               id: fullLeaseData.id,
               unit_id: lease?.unit_id || "",
               rent_amount: fullLeaseData.rent_amount,
               adjustment_index: fullLeaseData.adjustment_index || null,
               next_adjustment_date: fullLeaseData.next_adjustment_date,
               start_date: fullLeaseData.start_date,
               end_date: fullLeaseData.end_date ?? null,
               is_indefinite_term: fullLeaseData.is_indefinite_term ?? null,
               due_day: fullLeaseData.due_day ?? null,
               tenant_contact_id: fullLeaseData.tenant_contact_id ?? null,
               property_id: fullLeaseData.property_id ?? null,
               fire_insurance: fullLeaseData.fire_insurance ?? null,
               iptu_charge: fullLeaseData.iptu_charge ?? null,
               tenant_contact: fullLeaseData.tenant,
               unit: fullLeaseData.unit,
             }}
             onSuccess={() => {
               queryClient.invalidateQueries({ queryKey: ["lease-by-unit"] });
               queryClient.invalidateQueries({ queryKey: ["leases"] });
               queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
             }}
           />
         </>
       )}
     </div>
   );
 }