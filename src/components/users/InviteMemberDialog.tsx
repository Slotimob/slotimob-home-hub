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
import { Loader2, UserPlus } from 'lucide-react';
import { PermissionsMatrix } from './PermissionsMatrix';
import { RoleTemplateSelector } from './RoleTemplateSelector';
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

      // Look up user by email
      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!profile) throw new Error('Usuário não encontrado. Ele precisa ter uma conta na SlotiMob.');

      const { error } = await supabase.from('organization_members').insert({
        organization_owner_id: user.id,
        user_id: profile.id,
        role_label: roleLabel,
        permissions,
        is_active: true,
        accepted_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === '23505') throw new Error('Este usuário já faz parte da sua equipe.');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Membro adicionado com sucesso');
      onOpenChange(false);
      setEmail('');
      setPermissions({});
      setRoleLabel('Agente');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleApplyTemplate = (tplPermissions: Permissions, label: string) => {
    setPermissions(tplPermissions);
    setRoleLabel(label);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
          <DialogDescription>
            Adicione um membro à sua equipe e configure suas permissões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email do usuário</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <RoleTemplateSelector onApply={handleApplyTemplate} />

          <PermissionsMatrix permissions={permissions} onChange={setPermissions} />

          <Button
            className="w-full gap-2"
            onClick={() => invite.mutate()}
            disabled={!email.trim() || invite.isPending}
          >
            {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Adicionar Membro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
