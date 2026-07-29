import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { useAccessReview } from '@/hooks/useAccessReview';
import { useWorkspace } from '@/hooks/useWorkspace';
import { AccessReviewDialog } from './AccessReviewDialog';

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

export function AccessReviewBanner() {
  const { isMember } = useWorkspace();
  const { cycle, hasPendingReview, isOverdue } = useAccessReview();
  const [open, setOpen] = useState(false);

  if (isMember || !hasPendingReview || !cycle) return null;

  return (
    <>
      <Alert variant={isOverdue ? 'destructive' : 'default'} className="py-3">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle className="text-sm font-medium">
          Revisão trimestral de acessos pendente
        </AlertTitle>
        <AlertDescription className="mt-1 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            {isOverdue
              ? `Esta revisão venceu em ${formatDate(cycle.due_date)}. Conclua para manter a conformidade da sua conta.`
              : `Confirme se os membros da sua equipe ainda precisam dos acessos que possuem. Prazo: ${formatDate(cycle.due_date)}.`}
          </span>
          <Button
            size="sm"
            variant={isOverdue ? 'destructive' : 'outline'}
            className="shrink-0"
            onClick={() => setOpen(true)}
          >
            Revisar agora
          </Button>
        </AlertDescription>
      </Alert>

      <AccessReviewDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
