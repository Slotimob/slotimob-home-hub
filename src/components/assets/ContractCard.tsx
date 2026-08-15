import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  User,
  Calendar,
  TrendingUp,
  Calculator,
  AlertTriangle,
  MoreVertical,
  Edit3,
  Plus,
  FileSignature,
  Receipt,
  XCircle,
  Upload,
  Check,
  Clock,
  CalendarDays,
} from "lucide-react";
import { Info } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeaseWithDetails {
  id: string;
  unit_id: string;
  rent_amount: number;
  adjustment_index: string | null;
  next_adjustment_date: string | null;
  start_date: string;
  end_date: string | null;
  contract_status: string | null;
  status: string;
  tenant_contact_id: string;
  signature_status?: string | null;
  signed_contract_path?: string | null;
  termination_date?: string | null;
  termination_reason?: string | null;
  tenant_contact?: {
    id: string;
    name: string;
  } | null;
  unit?: {
    id: string;
    unit_number: string;
    address: string | null;
  } | null;
}


import {
  getLeaseStatusConfig,
  getSignatureStatus,
  getAdjustmentStatusConfig,
  isLeasePendingSetup,
  type AdjustmentStatus,
} from "@/lib/lease-status";

interface ContractCardProps {
  lease: LeaseWithDetails & { adjustmentStatus: AdjustmentStatus };
  onAdjustmentClick: (lease: LeaseWithDetails, isUrgent: boolean) => void;
  onEditClick?: (lease: LeaseWithDetails) => void;
  onQuickTransactionClick?: (lease: LeaseWithDetails) => void;
  onGenerateContractClick?: (unitId: string, leaseId?: string) => void;
  onViewFinancialsClick?: (lease: LeaseWithDetails) => void;
  onTerminateClick?: (lease: LeaseWithDetails) => void;
  onUploadContractClick?: (lease: LeaseWithDetails) => void;
  onToggleSignatureClick?: (lease: LeaseWithDetails) => void;
  onEditAdjustmentDateClick?: (lease: LeaseWithDetails) => void;
  // UNIFIED UX: Click card to open management sheet
  onCardClick?: (lease: LeaseWithDetails) => void;
}

const INDEX_LABELS: Record<string, string> = {
  IGPM: "IGP-M",
  IPCA: "IPCA",
  INPC: "INPC",
  Fixo: "Fixo",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function ContractCard({ 
  lease, 
  onAdjustmentClick,
  onEditClick,
  onQuickTransactionClick,
  onGenerateContractClick,
  onViewFinancialsClick,
  onTerminateClick,
  onUploadContractClick,
  onToggleSignatureClick,
  onEditAdjustmentDateClick,
  onCardClick,
}: ContractCardProps) {
  // Status do contrato tem precedência: um contrato pendente de configuração
  // não deve ser mascarado pelo contract_status legado.
  const isPendingSetup = isLeasePendingSetup(lease.status);
  const status = isPendingSetup ? lease.status : (lease.contract_status || lease.status);
  const statusConfig = getLeaseStatusConfig(status);
  const signatureConfig = getSignatureStatus((lease as any).signature_status);
  const adjConfig = getAdjustmentStatusConfig(lease.next_adjustment_date);
  const { adjustmentStatus } = lease;
  const needsAction = adjConfig.needsAction;
  const daysUntilAdjustment = adjConfig.daysUntil;

  const hasActions = onEditClick || onQuickTransactionClick || onGenerateContractClick || onViewFinancialsClick;

  // UNIFIED UX: Handle card click to open management sheet
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons, dropdown, or action elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('[data-radix-collection-item]')) {
      return;
    }
    if (onCardClick) {
      onCardClick(lease);
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${needsAction ? "border-destructive/50 bg-destructive/5 hover:border-destructive" : ""}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Unit + Status + Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">
                {lease.unit?.unit_number || "—"}
              </p>
              {lease.unit?.address && (
                <p className="text-xs text-muted-foreground truncate">
                  {lease.unit.address}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge
              variant={statusConfig.variant}
              className={cn(
                "text-[10px] whitespace-nowrap",
                isPendingSetup && "border-amber-500 text-amber-700 bg-amber-500/10"
              )}
            >
              {statusConfig.label}
            </Badge>
            {/* Signature Status Badge */}
            {lease.status === "active" && (
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  lease.signature_status === "signed"
                    ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30"
                    : "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                }`}
              >
                {lease.signature_status === "signed" ? (
                  <Check className="h-2.5 w-2.5" />
                ) : (
                  <Clock className="h-2.5 w-2.5" />
                )}
              </Badge>
            )}
            {hasActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onEditClick && (
                    <DropdownMenuItem onClick={() => onEditClick(lease)}>
                      <Info className="h-4 w-4 mr-2" />
                      Detalhes do Contrato
                    </DropdownMenuItem>
                  )}
                  {onQuickTransactionClick && (
                    <DropdownMenuItem onClick={() => onQuickTransactionClick(lease)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Lançamento Rápido
                    </DropdownMenuItem>
                  )}
                  {onGenerateContractClick && (
                    <DropdownMenuItem onClick={() => onGenerateContractClick(lease.unit_id, lease.id)}>
                      <FileSignature className="h-4 w-4 mr-2" />
                      Gerar Documento
                    </DropdownMenuItem>
                  )}
                  {onEditAdjustmentDateClick && (
                    <DropdownMenuItem onClick={() => onEditAdjustmentDateClick(lease)}>
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Editar Data Reajuste
                    </DropdownMenuItem>
                  )}
                  {(onEditClick || onQuickTransactionClick || onGenerateContractClick) && onViewFinancialsClick && (
                    <DropdownMenuSeparator />
                  )}
                  {onUploadContractClick && (
                    <DropdownMenuItem onClick={() => onUploadContractClick(lease)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Contrato Assinado
                    </DropdownMenuItem>
                  )}
                  {onToggleSignatureClick && (
                    <DropdownMenuItem onClick={() => onToggleSignatureClick(lease)}>
                      {lease.signature_status === "signed" ? (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Marcar como Pendente
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Marcar como Assinado
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onViewFinancialsClick && (
                    <DropdownMenuItem onClick={() => onViewFinancialsClick(lease)}>
                      <Receipt className="h-4 w-4 mr-2" />
                      Ver Financeiro
                    </DropdownMenuItem>
                  )}
                  {onTerminateClick && lease.status === "active" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onTerminateClick(lease)}
                        className="text-destructive focus:text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Encerrar Contrato
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Tenant */}
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm truncate">
            {lease.tenant_contact?.name || "—"}
          </span>
        </div>

        {/* Financial Info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Valor Atual</p>
            <p className="font-semibold">{formatCurrency(lease.rent_amount)}</p>
          </div>
          <Badge variant="outline" className="text-[10px] whitespace-nowrap">
            {INDEX_LABELS[lease.adjustment_index || "IGPM"]}
          </Badge>
        </div>

        {/* Next Adjustment */}
        {lease.next_adjustment_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {format(parseISO(lease.next_adjustment_date), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <Badge variant={adjConfig.variant} className={cn("text-[10px]", adjConfig.className)}>
              {adjustmentStatus === "vencido" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
              {adjConfig.label}
            </Badge>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {needsAction ? (
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => onAdjustmentClick(lease, true)}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Aplicar Reajuste
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => onAdjustmentClick(lease, false)}
            >
              <Calculator className="h-3.5 w-3.5" />
              Calcular Reajuste
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}