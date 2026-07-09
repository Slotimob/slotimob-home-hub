import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActionCenterPending,
  PendingReceivable,
  PendingPayable,
  PendingContract,
  PendingProposalFollowup,
} from "@/hooks/useActionCenterPending";
import { AdjustmentCalculatorDialog } from "./AdjustmentCalculatorDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatPhoneForWhatsApp } from "@/lib/utils";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  FileSignature,
  FileText,
  MessageCircle,
  RefreshCw,
  Send,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

export function TasksTab() {
  const navigate = useNavigate();
  const { receivables, payables, contracts, proposalFollowups, totalCount, isLoading } = useActionCenterPending();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("management_tasks", "edit");

  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<PendingContract | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [markingFollowupId, setMarkingFollowupId] = useState<string | null>(null);

  // Separate overdue receivables from upcoming
  const overdueReceivables = receivables.filter((r) => r.is_overdue);
  const upcomingReceivables = receivables.filter((r) => !r.is_overdue);

  // Separate contracts by issue type
  const pendingSignatureContracts = contracts.filter((c) => c.issue_type === "pending_signature");
  const expiringContracts = contracts.filter(
    (c) => c.issue_type === "adjustment_due" || c.issue_type === "adjustment_overdue"
  );

  // Handle WhatsApp click for collection
  const handleWhatsAppCollection = (item: PendingReceivable) => {
    if (!item.contact_phone) {
      toast({
        title: "Telefone não encontrado",
        description: "Este contato não possui telefone cadastrado.",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = formatPhoneForWhatsApp(item.contact_phone);
    const firstName = item.contact_name ? item.contact_name.split(" ")[0] : "";
    const formattedAmount = item.amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    const formattedDate = format(new Date(item.due_date), "dd/MM/yyyy", { locale: ptBR });
    const unitInfo = item.unit_number ? ` referente ao imóvel *${item.unit_number}*` : "";

    const message = `Olá${firstName ? `, ${firstName}` : ""}! 👋

Notamos que o pagamento de *${formattedAmount}*${unitInfo}, com vencimento em *${formattedDate}*, ainda não foi identificado em nosso sistema.

📋 *Detalhes:*
• Descrição: ${item.description}
• Valor: ${formattedAmount}
• Vencimento: ${formattedDate}

Caso já tenha efetuado o pagamento, por favor nos envie o comprovante para baixa em nosso sistema.

Se precisar de ajuda ou tiver alguma dúvida, estamos à disposição!

Atenciosamente,
Equipe de Administração`;

    const encodedMessage = encodeURIComponent(message);
    navigate(`/whatsapp?phone=${formattedPhone}&text=${encodedMessage}`);
  };

  // Mark payable as paid
  const handleMarkAsPaid = async (item: PendingPayable) => {
    setMarkingPaidId(item.id);
    try {
      const { error } = await supabase
        .from("financial_transactions")
        .update({
          status: "paid",
          paid_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Marcado como pago!",
        description: `${item.description} foi registrado como pago.`,
      });

      // Invalidate all related queries to ensure UI sync
      queryClient.invalidateQueries({ queryKey: ["action-center-payables"] });
      queryClient.invalidateQueries({ queryKey: ["action-center-receivables"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setMarkingPaidId(null);
    }
  };

  // Open adjustment calculator
  const handleOpenAdjustment = (contract: PendingContract) => {
    setSelectedLease(contract);
    setAdjustmentDialogOpen(true);
  };

  // Handle proposal follow-up via WhatsApp
  const handleProposalFollowup = (item: PendingProposalFollowup) => {
    const firstName = item.lead_name.split(" ")[0];
    const propertyInfo = item.unit_number
      ? ` sobre o imóvel *${item.unit_number}*`
      : item.property_name
      ? ` sobre o *${item.property_name}*`
      : "";

    const message = `Olá ${firstName}! 👋

Aqui é da equipe *SlotiMob*. Tudo bem?

Conseguiu dar uma olhada na proposta que te enviei${propertyInfo}? 📋

Estou à disposição para tirar qualquer dúvida ou ajustar condições. Seria ótimo conversar quando puder!

Abraço! 🤝`;

    const encodedMessage = encodeURIComponent(message);
    navigate(`/whatsapp?text=${encodedMessage}`);
  };

  // Mark proposal follow-up as done
  const handleMarkFollowupDone = async (item: PendingProposalFollowup) => {
    setMarkingFollowupId(item.id);
    try {
      const { error } = await supabase
        .from("proposals")
        .update({ status: "viewed", updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Follow-up concluído!",
        description: `Proposta para ${item.lead_name} marcada como concluída.`,
      });

      queryClient.invalidateQueries({ queryKey: ["action-center-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setMarkingFollowupId(null);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["action-center-receivables"] });
    queryClient.invalidateQueries({ queryKey: ["action-center-payables"] });
    queryClient.invalidateQueries({ queryKey: ["action-center-contracts"] });
    queryClient.invalidateQueries({ queryKey: ["action-center-proposals"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (totalCount === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4 mb-4">
              <CheckSquare className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Tudo em dia! 🎉</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Não há pendências financeiras ou contratuais no momento.
              Continue assim!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestão de Pendências</h2>
          <p className="text-sm text-muted-foreground">
            {totalCount} pendência{totalCount !== 1 ? "s" : ""} requer{totalCount === 1 ? "" : "em"} atenção
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Atualizar
        </Button>
      </div>

      {/* Unified Sections */}
      <div className="space-y-6">
        {/* Section 1: Financeiro Atrasado (Overdue < today) */}
        <Card className={cn(overdueReceivables.length > 0 && "border-red-200 dark:border-red-900/50")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Financeiro Atrasado
              {overdueReceivables.length > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  {overdueReceivables.length}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Vencimentos anteriores a hoje</p>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {overdueReceivables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum financeiro em atraso
              </p>
            ) : (
              overdueReceivables.map((item) => (
                <ReceivableItem
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  onWhatsAppClick={() => handleWhatsAppCollection(item)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Section 2: Contratos a Vencer (Expiration < 30 days) */}
        <Card className={cn(expiringContracts.length > 0 && "border-amber-200 dark:border-amber-900/50")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Contratos a Vencer
              {expiringContracts.length > 0 && (
                <Badge className="ml-auto text-xs bg-amber-500 hover:bg-amber-600">
                  {expiringContracts.length}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Reajustes pendentes nos próximos 30 dias</p>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {expiringContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum contrato a vencer
              </p>
            ) : (
              expiringContracts.map((item) => (
                <ContractItem
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  onAdjustClick={() => handleOpenAdjustment(item)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Section 3: Pendências de Assinatura (Contracts without signed PDF) */}
        <Card className={cn(pendingSignatureContracts.length > 0 && "border-blue-200 dark:border-blue-900/50")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-blue-500" />
              Pendências de Assinatura
              {pendingSignatureContracts.length > 0 && (
                <Badge className="ml-auto text-xs bg-blue-500 hover:bg-blue-600">
                  {pendingSignatureContracts.length}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Contratos aguardando PDF assinado</p>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {pendingSignatureContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma assinatura pendente
              </p>
            ) : (
              pendingSignatureContracts.map((item) => (
                <ContractItem
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  onAdjustClick={() => handleOpenAdjustment(item)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Section 4: Follow-up de Propostas */}
        {proposalFollowups.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4 text-orange-500" />
                Follow-up de Propostas
                <Badge className="ml-auto text-xs bg-orange-500 hover:bg-orange-600">
                  {proposalFollowups.length}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Propostas enviadas há mais de 48h sem retorno</p>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {proposalFollowups.map((item) => (
                <ProposalFollowupItem
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  isMarking={markingFollowupId === item.id}
                  onFollowup={() => handleProposalFollowup(item)}
                  onMarkDone={() => handleMarkFollowupDone(item)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Section 5: Contas do Imóvel (Payables) */}
        {payables.length > 0 && (
          <Card className="border-purple-200 dark:border-purple-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-500" />
                Contas do Imóvel
                <Badge className="ml-auto text-xs bg-purple-500 hover:bg-purple-600">
                  {payables.length}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">IPTU, condomínio e despesas pendentes</p>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {payables.map((item) => (
                <PayableItem
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  isMarking={markingPaidId === item.id}
                  onMarkPaid={() => handleMarkAsPaid(item)}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Adjustment Calculator Dialog */}
      {selectedLease && (
        <AdjustmentCalculatorDialog
          open={adjustmentDialogOpen}
          onOpenChange={setAdjustmentDialogOpen}
          lease={{
            id: selectedLease.id,
            unit_id: selectedLease.unit_id,
            rent_amount: selectedLease.rent_amount,
            adjustment_index: selectedLease.adjustment_index,
            next_adjustment_date: selectedLease.next_adjustment_date,
            start_date: "", // Not needed for adjustment
            tenant_contact: { name: selectedLease.tenant_name },
            unit: { unit_number: selectedLease.unit_number },
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["action-center-contracts"] });
            queryClient.invalidateQueries({ queryKey: ["leases"] });
          }}
        />
      )}
    </div>
  );
}

// Sub-component: Receivable Item
function ReceivableItem({
  item,
  canEdit,
  onWhatsAppClick,
}: {
  item: PendingReceivable;
  canEdit: boolean;
  onWhatsAppClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {item.is_overdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
          <p className="text-sm font-medium truncate">{item.description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {item.unit_number && <span>{item.unit_number}</span>}
          {item.contact_name && (
            <>
              <span>•</span>
              <span className="truncate">{item.contact_name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold text-red-600">
            {item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <Badge
            variant={item.is_overdue ? "destructive" : "secondary"}
            className="text-[10px] px-1.5"
          >
            {item.is_overdue
              ? `${item.days_overdue}d atraso`
              : format(new Date(item.due_date), "dd/MM", { locale: ptBR })}
          </Badge>
        </div>
      </div>
      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-8 w-8 p-0"
          onClick={onWhatsAppClick}
          title="Cobrar via WhatsApp"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" />
        </Button>
      )}
    </div>
  );
}

// Sub-component: Payable Item
function PayableItem({
  item,
  isMarking,
  onMarkPaid,
}: {
  item: PendingPayable;
  isMarking: boolean;
  onMarkPaid: () => void;
}) {
  const obligationLabel = item.obligation_type
    ? item.obligation_type.charAt(0).toUpperCase() + item.obligation_type.slice(1)
    : "Despesa";

  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {item.is_overdue && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          <p className="text-sm font-medium truncate">{item.description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {item.unit_number && <span>{item.unit_number}</span>}
          <span>•</span>
          <span>{obligationLabel}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold text-amber-600">
            {item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <Badge
            variant={item.is_overdue ? "destructive" : "secondary"}
            className="text-[10px] px-1.5"
          >
            {item.is_overdue
              ? `${item.days_overdue}d atraso`
              : format(new Date(item.due_date), "dd/MM", { locale: ptBR })}
          </Badge>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 h-8 gap-1"
        onClick={onMarkPaid}
        disabled={isMarking}
      >
        {isMarking ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        )}
        <span className="text-xs">Pago</span>
      </Button>
    </div>
  );
}

// Sub-component: Contract Item
function ContractItem({
  item,
  onAdjustClick,
}: {
  item: PendingContract;
  onAdjustClick: () => void;
}) {
  const isSignature = item.issue_type === "pending_signature";
  const isOverdue = item.issue_type === "adjustment_overdue";

  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isSignature ? (
            <FileSignature className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          ) : isOverdue ? (
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          ) : (
            <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          )}
          <p className="text-sm font-medium truncate">{item.unit_number}</p>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {item.tenant_name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold">
            {item.rent_amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
          <Badge
            variant={isSignature ? "secondary" : isOverdue ? "destructive" : "outline"}
            className="text-[10px] px-1.5"
          >
            {isSignature
              ? "Aguardando assinatura"
              : isOverdue
              ? "Reajuste atrasado"
              : `Reajuste em ${formatDistanceToNow(new Date(item.next_adjustment_date!), { locale: ptBR })}`}
          </Badge>
        </div>
      </div>
      {!isSignature && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-8 gap-1"
          onClick={onAdjustClick}
        >
          <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs">Reajustar</span>
        </Button>
      )}
    </div>
  );
}

// Sub-component: Proposal Follow-up Item
function ProposalFollowupItem({
  item,
  isMarking,
  onFollowup,
  onMarkDone,
}: {
  item: PendingProposalFollowup;
  isMarking: boolean;
  onFollowup: () => void;
  onMarkDone: () => void;
}) {
  const daysAgo = Math.floor(item.hours_since_sent / 24);
  const locationLabel = item.unit_number || item.property_name || "";

  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          <p className="text-sm font-medium truncate">{item.lead_name}</p>
        </div>
        {locationLabel && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{locationLabel}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px] px-1.5">
            Enviada há {daysAgo}d ({item.hours_since_sent}h)
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={onFollowup}
          title="Fazer follow-up via WhatsApp"
        >
          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs hidden sm:inline">Follow-up</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onMarkDone}
          disabled={isMarking}
          title="Marcar como concluído"
        >
          {isMarking ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          )}
        </Button>
      </div>
    </div>
  );
}
