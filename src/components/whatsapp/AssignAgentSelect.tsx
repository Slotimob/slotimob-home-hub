import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AssignAgentSelectProps {
  conversationId: string;
  currentAssignedId: string | null;
  teamMembers: { id: string; name: string }[];
  onAssigned: (conversationId: string, newUserId: string) => void;
}

export function AssignAgentSelect({
  conversationId,
  currentAssignedId,
  teamMembers,
  onAssigned,
}: AssignAgentSelectProps) {
  const { toast } = useToast();

  const handleAssign = async (userId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({
        assigned_user_id: userId,
        assigned_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', conversationId);

    if (error) {
      toast({ title: 'Erro ao atribuir', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Conversa atribuída', description: 'O agente selecionado receberá este chat.' });
    onAssigned(conversationId, userId);
  };

  return (
    <Select value={currentAssignedId || ''} onValueChange={handleAssign}>
      <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs border-primary/30 bg-primary/5">
        <div className="flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5 text-primary" />
          <SelectValue placeholder="Atribuir agente" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {teamMembers.map((m) => (
          <SelectItem key={m.id} value={m.id} className="text-xs">
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
