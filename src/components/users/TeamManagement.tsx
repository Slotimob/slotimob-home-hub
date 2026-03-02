import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UserPlus, UsersRound, ShieldCheck } from 'lucide-react';
import { TeamMemberCard } from './TeamMemberCard';
import { InviteMemberDialog } from './InviteMemberDialog';
import type { Permissions } from '@/hooks/usePermissions';

interface MemberRow {
  id: string;
  user_id: string;
  role_label: string;
  permissions: Permissions;
  is_active: boolean;
  invited_at: string;
  accepted_at: string | null;
}

export function TeamManagement() {
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const { features, checkLimit } = useSubscriptionLimits();

  const { data: members, isLoading } = useQuery({
    queryKey: ['organization-members', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch profiles for each member
      const userIds = (data || []).map((m: any) => m.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return (data || []).map((m: any) => ({
        ...m,
        permissions: (m.permissions || {}) as Permissions,
        profile: profileMap.get(m.user_id) || null,
      }));
    },
    enabled: !!user?.id,
  });

  const activeCount = members?.filter((m: any) => m.is_active).length ?? 0;
  const usersLimit = features?.users_limit ?? 1;
  const limitInfo = checkLimit('users_limit', activeCount);
  const isAtLimit = usersLimit !== -1 && !limitInfo.allowed;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Gestão de Equipe</h2>
            <p className="text-sm text-muted-foreground">
              Configure permissões granulares para cada membro da sua equipe
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowInvite(true)} className="gap-2" disabled={isAtLimit}>
            <UserPlus className="h-4 w-4" />
            Convidar Membro
          </Button>
          {usersLimit !== -1 && (
            <span className="text-sm text-muted-foreground">
              {activeCount}/{usersLimit} membros
            </span>
          )}
        </div>
      </div>

      {/* Members list */}
      {(!members || members.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UsersRound className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <CardTitle className="text-lg mb-1">Nenhum membro na equipe</CardTitle>
            <CardDescription>
              Convide membros e defina permissões personalizadas por módulo.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member: any) => (
            <TeamMemberCard key={member.id} member={member} />
          ))}
        </div>
      )}

      <InviteMemberDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}
