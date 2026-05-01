import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ACTION_TYPE_LABELS,
  ACTION_TYPE_ORDER,
  DEFAULT_THRESHOLDS,
  type BulkActionType,
} from '@/utils/approvalConstants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ThresholdRow {
  id?: string;
  action_type: BulkActionType;
  threshold: number;
  enabled: boolean;
  approval_validity_hours: number;
  dirty?: boolean;
}

export function ApprovalSettingsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ThresholdRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const { data: thresholds, isLoading } = useQuery({
    queryKey: ['approval-thresholds', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('approval_thresholds')
        .select('*')
        .eq('organization_owner_id', user!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!thresholds) return;
    const map = new Map<string, any>();
    thresholds.forEach((t: any) => map.set(t.action_type, t));

    setRows(
      ACTION_TYPE_ORDER.map((at) => {
        const existing = map.get(at);
        return {
          id: existing?.id,
          action_type: at,
          threshold: existing?.threshold ?? DEFAULT_THRESHOLDS[at],
          enabled: existing?.enabled ?? true,
          approval_validity_hours: existing?.approval_validity_hours ?? 24,
        };
      })
    );
  }, [thresholds]);

  const updateRow = useCallback((actionType: BulkActionType, patch: Partial<ThresholdRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.action_type === actionType ? { ...r, ...patch, dirty: true } : r))
    );
  }, []);

  const saveRow = async (row: ThresholdRow) => {
    try {
      setSaving(row.action_type);
      const payload = {
        organization_owner_id: user!.id,
        action_type: row.action_type,
        threshold: row.threshold,
        enabled: row.enabled,
        approval_validity_hours: row.approval_validity_hours,
      };

      if (row.id) {
        const { error } = await (supabase as any)
          .from('approval_thresholds')
          .update(payload)
          .eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('approval_thresholds')
          .upsert(payload, { onConflict: 'organization_owner_id,action_type' });
        if (error) throw error;
      }

      toast.success('Salvo', { duration: 1000 });
      setRows((prev) =>
        prev.map((r) => (r.action_type === row.action_type ? { ...r, dirty: false } : r))
      );
      queryClient.invalidateQueries({ queryKey: ['approval-thresholds'] });
    } catch (error: any) {
      toast.error(error.message, { duration: 1000 });
    } finally {
      setSaving(null);
    }
  };

  const restoreDefaults = async () => {
    try {
      for (const at of ACTION_TYPE_ORDER) {
        await (supabase as any)
          .from('approval_thresholds')
          .upsert(
            {
              organization_owner_id: user!.id,
              action_type: at,
              threshold: DEFAULT_THRESHOLDS[at],
              enabled: true,
              approval_validity_hours: 24,
            },
            { onConflict: 'organization_owner_id,action_type' }
          );
      }
      toast.success('Valores restaurados', { duration: 1000 });
      queryClient.invalidateQueries({ queryKey: ['approval-thresholds'] });
    } catch (error: any) {
      toast.error(error.message, { duration: 1000 });
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Limites de Ações em Massa</CardTitle>
          <CardDescription>
            Defina quantos itens podem ser afetados em uma ação em massa sem precisar de aprovação.
            Acima desse limite, o usuário precisa enviar uma solicitação.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={restoreDefaults} className="gap-1.5 shrink-0">
          <RotateCcw className="h-4 w-4" />
          Restaurar defaults
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rows.map((row) => (
            <div
              key={row.action_type}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Switch
                  checked={row.enabled}
                  onCheckedChange={(v) => updateRow(row.action_type, { enabled: v })}
                />
                <Label className="text-sm font-medium min-w-0 truncate">
                  {ACTION_TYPE_LABELS[row.action_type]}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Limite</span>
                  <Input
                    type="number"
                    min={1}
                    value={row.threshold}
                    onChange={(e) =>
                      updateRow(row.action_type, {
                        threshold: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-20 h-8 text-sm"
                    disabled={!row.enabled}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Validade (h)</span>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={row.approval_validity_hours}
                    onChange={(e) =>
                      updateRow(row.action_type, {
                        approval_validity_hours: Math.min(
                          168,
                          Math.max(1, parseInt(e.target.value) || 24)
                        ),
                      })
                    }
                    className="w-20 h-8 text-sm"
                    disabled={!row.enabled}
                  />
                </div>

                <Button
                  size="sm"
                  variant={row.dirty ? 'default' : 'ghost'}
                  onClick={() => saveRow(row)}
                  disabled={!row.dirty || saving === row.action_type}
                  className="h-8 self-end"
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
