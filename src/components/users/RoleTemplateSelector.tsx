import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2 } from 'lucide-react';
import type { Permissions } from '@/hooks/usePermissions';

interface RoleTemplate {
  id: string;
  name: string;
  description: string | null;
  permissions: Permissions;
  is_system: boolean;
}

interface RoleTemplateSelectorProps {
  onApply: (permissions: Permissions, label: string) => void;
}

export function RoleTemplateSelector({ onApply }: RoleTemplateSelectorProps) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['role-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as unknown as RoleTemplate[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando templates...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium flex items-center gap-1.5">
        <Wand2 className="h-4 w-4" /> Aplicar Template
      </p>
      <div className="flex flex-wrap gap-2">
        {(templates || []).map((t) => (
          <Button
            key={t.id}
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onApply(t.permissions, t.name)}
          >
            {t.name}
            {t.is_system && <Badge variant="secondary" className="text-[10px] px-1">Sistema</Badge>}
          </Button>
        ))}
      </div>
    </div>
  );
}
