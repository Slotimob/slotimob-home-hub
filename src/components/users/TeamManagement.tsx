import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useUserRole } from '@/hooks/useUserRole';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, UserPlus, UsersRound, ShieldCheck, Building2, Crown } from 'lucide-react';
import { TeamMemberCard } from './TeamMemberCard';
import { InviteMemberDialog } from './InviteMemberDialog';
import type { Permissions } from '@/hooks/usePermissions';

export function TeamManagement() {
  const { user } = useAuth();
  const { isOwner } = useUserRole();
  const { isMember } = useWorkspace();
  const [showInvite, setShowInvite] = useState(false);
  const { features, checkLimit } = useSubscriptionLimits();

  const { data: members, isLoading } = useQuery({
    queryKey: ['organization-members', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // If owner, fetch members of their org
      // If agent, fetch members of the org they belong to
      let ownerFilter = user.id;

      if (!isOwner) {
        // Agent: find the org they belong to
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (membership) ownerFilter = membership.organization_owner_id;
      }

      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_owner_id', ownerFilter)
        .order('created_at', { ascending: false });
      if (error) throw error;

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

  // Fetch org owner profile using effectiveBrokerId from useWorkspace
  const { effectiveBrokerId } = useWorkspace();
  const { data: ownerProfile } = useQuery({
    queryKey: ['organization-owner-profile', effectiveBrokerId],
    queryFn: async () => {
      if (!effectiveBrokerId) return null;
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

  // Members see a simplified read-only view
  if (isMember) {
    return (
      <div className="space-y-6">
        {/* Owner card */}
        {ownerProfile && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Proprietário do Workspace</CardTitle>
                  <CardDescription>A conta principal que gere esta organização</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{ownerProfile.full_name || 'Gestor'}</p>
                  {ownerProfile.email && (
                    <p className="text-sm text-muted-foreground">{ownerProfile.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simple team list (read-only, no actions) */}
        {members && members.length > 0 && (
          <>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <UsersRound className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Membros da Equipa</h2>
                <p className="text-sm text-muted-foreground">{members.length} membro(s)</p>
              </div>
            </div>
            <div className="space-y-3">
              {members.map((member: any) => (
                <TeamMemberCard key={member.id} member={member} readOnly />
              ))}
            </div>
          </>
        )}
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
