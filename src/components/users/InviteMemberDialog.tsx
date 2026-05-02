import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCanEditPermissions } from '@/hooks/useCanEditPermissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Mail } from 'lucide-react';
import { PermissionsMatrix } from './PermissionsMatrix';
import { ReauthPasswordDialog } from '@/components/auth/ReauthPasswordDialog';
import type { Permissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [roleLabel, setRoleLabel] = useState('Agente');
  const [permissions, setPermissions] = useState<Permissions>({});
  const [showReauth, setShowReauth] = useState(false);

  const { scope, grantableScope } = useCanEditPermissions();

  const invite = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('send-invite-email', {
        body: {
          email: email.trim().toLowerCase(),
          role_label: roleLabel,
          permissions,
        },
      });

      if (error) throw new Error(error.message || 'Erro ao enviar convite');
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Convite enviado com sucesso! O utilizador receberá um e-mail com o link de acesso.', { duration: 1000 });
      onOpenChange(false);
      setEmail('');
      setPermissions({});
      setRoleLabel('Agente');
    },
    onError: (err: Error) => toast.error(err.message, { duration: 1000 }),
  });

  const handleInviteClick = () => {
    setShowReauth(true);
  };

  const handleConfirmInvite = async () => {
    await invite.mutateAsync();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Um email será enviado com um link para o convidado criar sua conta e ingressar na equipe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email do convidado</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O convite expira em 48 horas. O convidado receberá um link para criar conta e será vinculado automaticamente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Cargo / Função</Label>
              <Input
                id="invite-role"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                placeholder="Ex: Corretor Sênior, Assistente..."
                style={{ fontSize: '16px' }}
              />
            </div>

            <PermissionsMatrix
              permissions={permissions}
              onChange={setPermissions}
              grantableScope={scope === 'delegate' ? grantableScope : undefined}
            />

            <Button
              className="w-full gap-2"
              onClick={handleInviteClick}
              disabled={!email.trim() || invite.isPending}
            >
              {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Enviar Convite por Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReauthPasswordDialog
        open={showReauth}
        onClose={() => setShowReauth(false)}
        onConfirm={handleConfirmInvite}
        description="Confirme sua senha para enviar o convite com as permissões definidas."
      />
    </>
  );
}
