import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Save, User, Loader2, Trash2 } from 'lucide-react';
import { PermissionsMatrix } from './PermissionsMatrix';
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
  profile?: { full_name: string | null; email: string | null };
}

interface TeamMemberCardProps {
  member: TeamMember;
  readOnly?: boolean;
}

export function TeamMemberCard({ member, readOnly = false }: TeamMemberCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>(member.permissions || {});
  const [roleLabel, setRoleLabel] = useState(member.role_label);
  const queryClient = useQueryClient();
  const { effectiveBrokerId } = useWorkspace();

  const updateMember = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('organization_members')
        .update({ permissions, role_label: roleLabel })
        .eq('id', member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Permissões atualizadas');
    },
    onError: () => toast.error('Erro ao atualizar permissões'),
  });

  const removeMember = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast.success('Membro removido com sucesso');
    },
    onError: () => toast.error('Erro ao remover membro'),
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
      toast.success('Status atualizado');
    },
  });

  const name = member.profile?.full_name?.trim() || 'Membro sem nome definido';
  const email = member.profile?.email?.trim() || 'Email não disponível';

  return (
    <Card>
      <CardHeader className={`pb-3 ${readOnly ? '' : 'cursor-pointer'}`} onClick={() => !readOnly && setExpanded(!expanded)}>
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
            {!readOnly && (
              <>
                <Switch
                  checked={member.is_active}
                  onCheckedChange={(v) => toggleActive.mutate(v)}
                  onClick={(e) => e.stopPropagation()}
                />
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-1.5">
            <Label htmlFor={`role-${member.id}`}>Cargo / Função</Label>
            <Input
              id={`role-${member.id}`}
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              placeholder="Ex: Corretor Sênior, Assistente..."
            />
          </div>

          <PermissionsMatrix permissions={permissions} onChange={setPermissions} />

          <div className="flex items-center justify-between">
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
                    Tem a certeza? O utilizador perderá o acesso ao seu Workspace imediatamente. Os imóveis e clientes que ele adicionou continuarão a pertencer-lhe.
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

            <Button
              size="sm"
              onClick={() => updateMember.mutate()}
              disabled={updateMember.isPending}
              className="gap-2"
            >
              {updateMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Permissões
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}