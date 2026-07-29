import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, UsersRound, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAccessReview } from '@/hooks/useAccessReview';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import type { OrganizationMemberWithProfile } from '@/hooks/useOrganizationMembers';

interface AccessReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (value: string | null): string => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleDateString('pt-BR');
};

/** Conta os módulos em que o membro possui ao menos uma ação concedida. */
const countGrantedModules = (member: OrganizationMemberWithProfile): number => {
  const permissions = member.permissions as unknown as Record<string, unknown>;
  return Object.values(permissions ?? {}).filter((value) => {
    if (typeof value === 'boolean') return value;
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).some((action) => action === true);
    }
    return false;
  }).length;
};

export function AccessReviewDialog({ open, onOpenChange }: AccessReviewDialogProps) {
  const navigate = useNavigate();
  const { cycle, completeReview, isCompleting } = useAccessReview();
  const { activeMembers, isLoading } = useOrganizationMembers();
  const [notes, setNotes] = useState('');

  const handleConfirm = async () => {
    try {
      await completeReview(notes.trim() ? notes : null);
      toast.success('Revisão de acessos concluída.', { duration: 1000 });
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir a revisão.';
      toast.error(message, { duration: 1000 });
    }
  };

  const goToUsers = () => {
    onOpenChange(false);
    navigate('/users');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Revisão trimestral de acessos
            {cycle && <Badge variant="secondary">{cycle.period_label}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Confirme se os membros abaixo ainda precisam dos acessos que possuem hoje.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[45vh] overflow-y-auto pr-1 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando membros...
            </div>
          ) : activeMembers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
              <UsersRound className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Nenhum membro ativo nesta conta</p>
              <p className="text-xs text-muted-foreground">
                Você não possui membros de equipe com acesso no momento. Ainda assim, confirme a
                revisão para manter o histórico de conformidade em dia.
              </p>
            </div>
          ) : (
            activeMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium truncate">{member.profile.full_name}</span>
                    {member.role_label && (
                      <Badge variant="outline" className="text-[10px]">
                        {member.role_label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.profile.email ?? 'E-mail não disponível'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {countGrantedModules(member)} módulos com acesso · Entrou em{' '}
                    {formatDate(member.accepted_at ?? member.invited_at)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 gap-1" onClick={goToUsers}>
                  Ajustar permissões
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="access-review-notes" className="text-sm">
            Observações (opcional)
          </Label>
          <Textarea
            id="access-review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: acessos revisados, nenhuma alteração necessária."
            rows={3}
            style={{ fontSize: '16px' }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Ao confirmar, registramos a data, o responsável e a foto das permissões atuais para fins de
          auditoria.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCompleting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={isCompleting || !cycle}>
            {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar revisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
