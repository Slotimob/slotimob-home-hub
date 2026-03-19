import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface WhatsAppBillingButtonProps {
  transactionId: string;
  contactName?: string;
  status: string;
  whatsappSentAt?: string | null;
  onSend: (transactionId: string) => void;
  isPending?: boolean;
}

export function WhatsAppBillingButton({
  transactionId,
  contactName,
  status,
  whatsappSentAt,
  onSend,
  isPending = false,
}: WhatsAppBillingButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Don't show for paid transactions
  if (status === "paid") return null;

  const hasSent = !!whatsappSentAt;
  const sentDate = whatsappSentAt
    ? format(new Date(whatsappSentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onSend(transactionId);
  };

  const button = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 transition-all",
        hasSent
          ? "text-emerald-500 hover:bg-emerald-500/10"
          : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
      )}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <WhatsAppIcon className="h-3.5 w-3.5" />
      )}
    </Button>
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {hasSent
              ? `Última cobrança enviada em: ${sentDate}`
              : "Enviar cobrança via WhatsApp"}
          </p>
        </TooltipContent>
      </Tooltip>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar cobrança via WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              {contactName
                ? `Deseja enviar a mensagem de cobrança para ${contactName}?`
                : "Deseja enviar a mensagem de cobrança para o contato vinculado?"}
              {hasSent && (
                <span className="block mt-2 text-xs text-muted-foreground">
                  ⚠️ Uma cobrança já foi enviada em {sentDate}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <WhatsAppIcon className="h-4 w-4 mr-2" />
              Enviar Cobrança
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
