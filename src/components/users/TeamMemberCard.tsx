import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronUp, Save, User, Loader2 } from 'lucide-react';
import { PermissionsMatrix } from './PermissionsMatrix';
import { RoleTemplateSelector } from './RoleTemplateSelector';
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

  const handleApplyTemplate = (tplPermissions: Permissions, label: string) => {
    setPermissions(tplPermissions);
    setRoleLabel(label);
  };

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
          <RoleTemplateSelector onApply={handleApplyTemplate} />

          <PermissionsMatrix permissions={permissions} onChange={setPermissions} />

          <div className="flex justify-end">
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
