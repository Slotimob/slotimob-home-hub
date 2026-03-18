import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';

interface AgentSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Agent selector for Business plan teams.
 * Renders nothing if user is solo (non-team).
 * Auto-defaults to current user's ID.
 */
export function AgentSelector({ value, onValueChange, label = 'Responsável', disabled }: AgentSelectorProps) {
  const { user } = useAuth();
  const { members, isTeam, isLoading } = useTeamMembers();

  // Don't render for solo users
  if (!isTeam || isLoading) return null;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-sm">
        <Users className="h-3.5 w-3.5" />
        {label}
      </Label>
      <Select value={value || user?.id || ''} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o responsável" />
        </SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.full_name}
              {member.id === user?.id ? ' (Você)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
