import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Check, TrendingUp, TrendingDown, CheckCircle2, Repeat, Calendar, Circle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { WhatsAppBillingButton } from "./WhatsAppBillingButton";
import { ASSET_EXPENSE_CATEGORIES, type AssetExpenseCategory } from "@/lib/asset-expense-categories";

interface TransactionCardProps {
  transaction: any;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
  onEdit?: (transaction: any) => void;
  onDelete?: (id: string) => void;
  onMarkAsPaid?: (id: string) => void;
  onReconcile?: (transaction: any) => void;
  onSendBillingReminder?: (transaction: any) => void;
  isReconciling?: boolean;
  isSendingBilling?: boolean;
  isEligibleForBilling?: boolean;
}

export function TransactionCard({
  transaction,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onMarkAsPaid,
  onReconcile,
  onSendBillingReminder,
  isReconciling = false,
  isSendingBilling = false,
  isEligibleForBilling = false,
}: TransactionCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDateCompact = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd/MM/yy", { locale: ptBR });
  };

  const getStatusBadge = () => {
    // Priority: is_reconciled first
    if (transaction.is_reconciled) {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800 gap-0.5 text-[10px] px-1.5 py-0">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Conciliado
        </Badge>
      );
    }

    // Status-based badges with semantic colors
    const variants: Record<string, { label: string; className: string }> = {
      paid: { label: "Pago", className: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800" },
      pending: { label: "Pendente", className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800" },
      overdue: { label: "Vencido", className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800" },
      cancelled: { label: "Cancelado", className: "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-800" },
    };
    const config = variants[transaction.status] || variants.pending;
    return <Badge className={`${config.className} text-[10px] px-1.5 py-0`}>{config.label}</Badge>;
  };

  const handleCardClick = () => {
    onEdit?.(transaction);
  };

  const handleReconcileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReconcile?.(transaction);
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 space-y-2 cursor-pointer transition-colors hover:bg-muted/50",
        isSelected && "ring-2 ring-primary border-primary",
        transaction.is_reconciled && "bg-blue-500/5 border-blue-200 dark:border-blue-800"
      )}
      onClick={handleCardClick}
    >
      {/* Header with checkbox, type icon and amount */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {onSelect && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 -mt-1"
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                aria-label={`Selecionar ${transaction.description}`}
              />
            </div>
          )}
          <div
            className={cn(
              "p-1.5 rounded-full",
              transaction.type === "income"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-500"
            )}
          >
            {transaction.type === "income" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium line-clamp-1">{transaction.description}</p>
              {transaction.group_id && (
                <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </div>
            {/* Dates Row */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
              <span className="flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {formatDateCompact(transaction.transaction_date)}
              </span>
              {transaction.due_date && (
                <span className="text-amber-600 dark:text-amber-400">
                  Venc: {formatDateCompact(transaction.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* WhatsApp Billing Option */}
              {onSendBillingReminder && isEligibleForBilling && transaction.contact_id && (
                <>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendBillingReminder(transaction);
                    }} 
                    className="text-xs text-emerald-600"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 mr-2">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Enviar Cobrança WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onReconcile && !transaction.is_reconciled && (
                <>
                  <DropdownMenuItem onClick={handleReconcileClick} className="text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-blue-500" />
                    Conciliar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onReconcile && transaction.is_reconciled && (
                <>
                  <DropdownMenuItem onClick={handleReconcileClick} className="text-xs">
                    <Circle className="h-3.5 w-3.5 mr-2" />
                    Remover Conciliação
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onMarkAsPaid && transaction.status === "pending" && !transaction.is_reconciled && (
                <DropdownMenuItem onClick={() => onMarkAsPaid(transaction.id)} className="text-xs">
                  <Check className="h-3.5 w-3.5 mr-2" />
                  Marcar como Pago
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(transaction)} className="text-xs">
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive text-xs"
                    onClick={() => onDelete(transaction.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Category and Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {transaction.category ? (
            <span className="text-[10px] text-muted-foreground">
              {transaction.category.name}
            </span>
          ) : (
            <span className="text-muted-foreground text-[10px]">Sem categoria</span>
          )}
          {transaction.asset_expense_category && ASSET_EXPENSE_CATEGORIES[transaction.asset_expense_category as AssetExpenseCategory] && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 gap-1 font-normal"
              style={{
                borderColor: ASSET_EXPENSE_CATEGORIES[transaction.asset_expense_category as AssetExpenseCategory].color + '40',
                color: ASSET_EXPENSE_CATEGORIES[transaction.asset_expense_category as AssetExpenseCategory].color,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: ASSET_EXPENSE_CATEGORIES[transaction.asset_expense_category as AssetExpenseCategory].color }}
              />
              {ASSET_EXPENSE_CATEGORIES[transaction.asset_expense_category as AssetExpenseCategory].label}
            </Badge>
          )}
          {getStatusBadge()}
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1">
          {/* WhatsApp Billing Button */}
          {onSendBillingReminder && isEligibleForBilling && transaction.contact_id && (
            <WhatsAppBillingButton
              onClick={() => onSendBillingReminder(transaction)}
              isLoading={isSendingBilling}
            />
          )}
          
          {/* Quick Reconcile Button */}
          {onReconcile && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-full transition-all",
                transaction.is_reconciled 
                  ? "bg-blue-500 text-white hover:bg-blue-600" 
                  : "hover:bg-muted border border-dashed border-muted-foreground/30"
              )}
              onClick={handleReconcileClick}
              disabled={isReconciling}
            >
              {isReconciling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : transaction.is_reconciled ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground/50" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-between pt-1.5 border-t">
        <span className="text-xs text-muted-foreground">Valor</span>
        <span
          className={cn(
            "text-base font-semibold",
            transaction.type === "income" ? "text-emerald-500" : "text-red-500"
          )}
        >
          {transaction.type === "income" ? "+" : "-"}
          {formatCurrency(Number(transaction.amount))}
        </span>
      </div>

      {/* Unit info if available */}
      {transaction.unit && (
        <div className="text-[10px] text-muted-foreground">
          {transaction.unit.is_standalone
            ? transaction.unit.unit_number
            : `${transaction.unit.property?.name} - ${transaction.unit.unit_number}`}
        </div>
      )}
    </div>
  );
}
