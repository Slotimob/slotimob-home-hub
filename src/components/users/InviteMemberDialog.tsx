import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
      toast.success('Convite enviado com sucesso! O utilizador receberá um e-mail com o link de acesso.');
      onOpenChange(false);
      setEmail('');
      setPermissions({});
      setRoleLabel('Agente');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
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
            />
          </div>

          <PermissionsMatrix permissions={permissions} onChange={setPermissions} />

          <Button
            className="w-full gap-2"
            onClick={() => invite.mutate()}
            disabled={!email.trim() || invite.isPending}
          >
            {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Enviar Convite por Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
