import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, User } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';

interface TeamFilterProps {
  value: string; // 'all' | 'mine' | specific user id
  onValueChange: (value: string) => void;
}

/**
 * Filter for Masters and CRM admins to switch between
 * "Ver equipe" (all) and "Ver apenas minhas" (mine) or a specific member.
 * Hidden for regular members (they only see their own via RLS).
 */
export function TeamFilter({ value, onValueChange }: TeamFilterProps) {
  const { user } = useAuth();
  const { members, isTeam, isLoading } = useTeamMembers();
  const { isOwner, hasPermission } = usePermissions();

  // Only show for team workspaces where user is owner or has crm_admin
  const canViewAll = isOwner || hasPermission('crm_admin', 'view');

  if (!isTeam || isLoading || !canViewAll) return null;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          {value === 'all' ? (
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <SelectValue placeholder="Ver equipe" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Ver equipe
          </span>
        </SelectItem>
        <SelectItem value="mine">
          <span className="flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            Apenas minhas
          </span>
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.full_name}
            {member.id === user?.id ? ' (Você)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
