import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useCanEditPermissions } from '@/hooks/useCanEditPermissions';
import { validatePermissionChange } from '@/lib/permissions-validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Save, User, Loader2, Trash2 } from 'lucide-react';
import { PermissionsMatrix } from './PermissionsMatrix';
import { ReauthPasswordDialog } from '@/components/auth/ReauthPasswordDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Permissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  user_id: string;
  role_label: string;
  permissions: Permissions;
  is_active: boolean;
  invited_at: string;
  accepted_at: string | null;
  organization_owner_id?: string;
  profile?: { full_name: string | null; email: string | null };
}

interface TeamMemberCardProps {
  member: TeamMember;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>(member.permissions || {});
  const [roleLabel, setRoleLabel] = useState(member.role_label);
  const [showReauth, setShowReauth] = useState(false);
  const queryClient = useQueryClient();
  const { effectiveBrokerId } = useWorkspace();

  const { canEdit, scope, grantableScope, canEditMember } = useCanEditPermissions();

  const memberIsOwner = member.user_id === member.organization_owner_id;
  const canEditThisMember = canEditMember({
    id: member.user_id,
    permissions: member.permissions,
    isOwner: memberIsOwner,
  });

  const isReadOnly = !canEditThisMember;

  const updateMember = useMutation({
    mutationFn: async () => {
      // Client-side validation for delegates
      if (scope === 'delegate') {
        const result = validatePermissionChange({
          oldPermissions: member.permissions,
          newPermissions: permissions,
          grantableScope,
        });
        if (!result.valid) {
          throw new Error('Você não pode conceder permissões que não possui.');
        }
      }

      const { error } = await supabase
        .from('organization_members')
        .update({ permissions, role_label: roleLabel })
        .eq('id', member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Permissões atualizadas', { duration: 1000 });
    },
    onError: (err: Error) => {
      const msg = err.message?.includes('42501') || err.message?.includes('autorização')
        ? 'Sem autorização para conceder uma ou mais permissões alteradas.'
        : 'Erro ao atualizar permissões';
      toast.error(msg, { duration: 1000 });
    },
  });

  const removeMember = useMutation({
    mutationFn: async () => {
      if (!effectiveBrokerId) throw new Error('Workspace não identificado');

      const tablesToTransfer = ['properties', 'contacts', 'leads', 'deals', 'units', 'financial_transactions'] as const;
      for (const table of tablesToTransfer) {
        const { error } = await supabase
          .from(table)
          .update({ broker_id: effectiveBrokerId } as any)
          .eq('broker_id', member.user_id);
        if (error) console.warn(`Transfer warning (${table}):`, error.message);
      }

      await supabase
        .from('subscriptions')
        .update({ plan_id: 'free', status: 'active', trial_ends_at: null })
        .eq('user_id', member.user_id);

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Membro removido e dados transferidos com sucesso', { duration: 1000 });
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao remover membro', { duration: 1000 }),
  });

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ is_active: active })
        .eq('id', member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Status atualizado', { duration: 1000 });
    },
  });

  const handleSaveClick = () => {
    setShowReauth(true);
  };

  const handleConfirmSave = async () => {
    await updateMember.mutateAsync();
  };

  const name = member.profile?.full_name?.trim() || 'Membro sem nome definido';
  const email = member.profile?.email?.trim() || 'Email não disponível';

  return (
    <>
      <Card>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">{name}</CardTitle>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{roleLabel}</Badge>
              {!isReadOnly && (
                <Switch
                  checked={member.is_active}
                  onCheckedChange={(v) => toggleActive.mutate(v)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CardHeader>
        {expanded && (
          <CardContent className="space-y-4 pt-0">
            {!isReadOnly && (
              <div className="space-y-1.5">
                <Label htmlFor={`role-${member.id}`}>Cargo / Função</Label>
                <Input
                  id={`role-${member.id}`}
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="Ex: Corretor Sênior, Assistente..."
                />
              </div>
            )}

            <PermissionsMatrix
              permissions={permissions}
              onChange={setPermissions}
              readOnly={isReadOnly}
              grantableScope={scope === 'delegate' ? grantableScope : undefined}
            />

            {!isReadOnly && (
              <div className="flex items-center justify-between">
                {scope === 'owner' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Remover Membro
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover membro da equipa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem a certeza? O utilizador perderá o acesso ao seu Workspace imediatamente. Todos os imóveis, contactos e negócios que ele adicionou serão transferidos definitivamente para a sua conta (Dono da Imobiliária).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeMember.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {removeMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sim, remover'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {scope !== 'owner' && <div />}

                <Button
                  size="sm"
                  onClick={handleSaveClick}
                  disabled={updateMember.isPending}
                  className="gap-2"
                >
                  {updateMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Permissões
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <ReauthPasswordDialog
        open={showReauth}
        onClose={() => setShowReauth(false)}
        onConfirm={handleConfirmSave}
      />
    </>
  );
}
