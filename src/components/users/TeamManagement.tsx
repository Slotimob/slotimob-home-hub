import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useUserRole } from '@/hooks/useUserRole';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UsersRound, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TeamMemberCard } from './TeamMemberCard';
import { InviteMemberDialog } from './InviteMemberDialog';
import type { Permissions } from '@/hooks/usePermissions';

export function TeamManagement() {
  const { user } = useAuth();
  const { isOwner } = useUserRole();
  const { effectiveBrokerId, isMember } = useWorkspace();
  const [showInvite, setShowInvite] = useState(false);
  const { features, checkLimit } = useSubscriptionLimits();

  const { data: members, isLoading } = useQuery({
    queryKey: ['organization-members', user?.id],
    queryFn: async () => {
      if (!user?.id || !isOwner) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = (data || []).map((m: any) => m.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      return (data || []).map((m: any) => {
        const profile = profileMap.get(m.user_id);
        const resolvedEmail = profile?.email?.trim() || null;
        const resolvedName = profile?.full_name?.trim() || resolvedEmail || 'Membro sem nome definido';

        return {
          ...m,
          permissions: (m.permissions || {}) as Permissions,
          profile: {
            full_name: resolvedName,
            email: resolvedEmail,
          },
        };
      });
    },
    enabled: !!user?.id && isOwner,
  });

  const { data: ownerProfile, isLoading: isOwnerProfileLoading } = useQuery({
    queryKey: ['organization-owner-profile', effectiveBrokerId],
    queryFn: async () => {
      if (!effectiveBrokerId || !isMember) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', effectiveBrokerId)
        .maybeSingle();
      return profile;
    },
    enabled: !!effectiveBrokerId && isMember,
  });

  // Seat math: owner counts as 1 + active/pending members
  const memberCount = members?.length ?? 0;
  const occupiedSeats = 1 + memberCount; // 1 = the owner
  const usersLimit = features?.users_limit ?? 1;
  const limitInfo = checkLimit('users_limit', occupiedSeats);
  const isAtLimit = usersLimit !== -1 && !limitInfo.allowed;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isMember) {
    const ownerName = ownerProfile?.full_name?.trim() || ownerProfile?.email?.trim() || (isOwnerProfileLoading ? 'A carregar...' : 'Proprietário do Workspace');
    const ownerEmail = ownerProfile?.email?.trim() || (isOwnerProfileLoading ? 'A carregar...' : 'Email não disponível');
    const ownerInitials = ownerName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0))
      .join('')
      .toUpperCase();

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Gestão de Equipe</h2>
            <p className="text-sm text-muted-foreground">Visualização do proprietário do workspace</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proprietário do Workspace</CardTitle>
            <CardDescription>A conta principal que gere esta organização</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar className="h-11 w-11">
                <AvatarFallback>{ownerInitials || 'PW'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{ownerName}</p>
                <p className="text-sm text-muted-foreground">{ownerEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
              {occupiedSeats}/{usersLimit} vagas
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
            <TeamMemberCard key={member.id} member={member} readOnly={false} />
          ))}
        </div>
      )}

      <InviteMemberDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}
