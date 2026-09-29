import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RegisterRentPaymentDialog } from "@/components/finance/RegisterRentPaymentDialog";
import { ConfirmLeaseProjectionDialog, type LeaseForProjection } from "@/components/assets/ConfirmLeaseProjectionDialog";
import { useNextPendingRent } from "@/hooks/useNextPendingRent";
import { invalidateLeaseQueries } from "@/lib/query-invalidation";

interface Props {
  lease: any;
  className?: string;
  labelClassName?: string;
  disabled?: boolean;
}

/** "Registrar recebimento": baixa o aluguel pendente mais antigo do contrato. */
export function RegisterRentReceiptButton({ lease, className, labelClassName, disabled }: Props) {
  const queryClient = useQueryClient();
  const { data: next, isLoading } = useNextPendingRent(lease?.id);
  const [open, setOpen] = useState(false);
  const [projectionOpen, setProjectionOpen] = useState(false);

  const competency = next
    ? (() => {
        const c = next.competency_period || next.due_date?.slice(0, 7);
        if (!c) return "";
        const l = format(parseISO(`${c.slice(0, 7)}-01`), "MMM/yyyy", { locale: ptBR });
        return l.charAt(0).toUpperCase() + l.slice(1);
      })()
    : "";
  const tip = next?.due_date ? `Aluguel ${competency} · vence ${format(parseISO(next.due_date), "dd/MM")}` : null;

  const handleClick = () => {
    if (next) return setOpen(true);
    toast("Nenhum aluguel pendente neste contrato", {
      action: { label: "Gerar lançamentos", onClick: () => setProjectionOpen(true) },
    });
  };

  const handleDone = async () => {
    await Promise.all([
      invalidateLeaseQueries(queryClient),
      ...["lease-next-pending-rent", "rent-balance-lines", "lease-financial-projection", "rental-metrics", "dashboard", "reports", "owner-report", "tenant-statement", "lease-journey"].map((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      ),
    ]);
  };

  const button = (
    <Button variant="outline" size="sm" className={className} onClick={handleClick} disabled={disabled || !lease || isLoading}>
      <Receipt className="h-4 w-4 mr-1.5" />
      <span className={labelClassName}>Registrar recebimento</span>
    </Button>
  );

  return (
    <>
      {tip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{tip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}
      <RegisterRentPaymentDialog open={open} onOpenChange={setOpen} transaction={next ?? null} onDone={handleDone} />
      {lease && (
        <ConfirmLeaseProjectionDialog
          open={projectionOpen}
          onOpenChange={setProjectionOpen}
          lease={lease as unknown as LeaseForProjection}
        />
      )}
    </>
  );
}
