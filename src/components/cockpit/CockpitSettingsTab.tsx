import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Tag, BarChart3, Facebook } from 'lucide-react';
import { toast } from 'sonner';

interface SettingRow {
  key: string;
  value: string | null;
  description: string | null;
  category: string;
  updated_at: string;
}

const MARKETING_KEYS = [
  { key: 'gtm_id', label: 'Google Tag Manager ID', placeholder: 'GTM-XXXXXXX', icon: Tag },
  { key: 'pixel_id', label: 'Facebook Pixel ID', placeholder: '123456789012345', icon: Facebook },
  { key: 'ga_id', label: 'Google Analytics ID', placeholder: 'G-XXXXXXXXXX', icon: BarChart3 },
];

export function CockpitSettingsTab() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings-marketing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'marketing');
      if (error) throw error;
      return (data as SettingRow[]) || [];
    },
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s) => { map[s.key] = s.value || ''; });
      setValues(map);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      const promises = Object.entries(entries).map(([key, value]) =>
        supabase
          .from('system_settings')
          .upsert({ key, value, category: 'marketing', updated_at: new Date().toISOString() }, { onConflict: 'key' })
      );
      const results = await Promise.all(promises);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      toast.success('Configurações salvas! As tags serão aplicadas no próximo carregamento.');
      queryClient.invalidateQueries({ queryKey: ['system-settings-marketing'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-settings'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao salvar configurações.');
    },
  });

  const handleSave = () => mutation.mutate(values);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tags de Rastreamento</h2>
        <p className="text-sm text-muted-foreground">
          Configure as tags de marketing diretamente aqui. Valores salvos no banco têm prioridade sobre variáveis de ambiente.
        </p>
      </div>

      <div className="grid gap-4">
        {MARKETING_KEYS.map(({ key, label, placeholder, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </CardTitle>
              <CardDescription className="text-xs">
                {settings?.find((s) => s.key === key)?.description || ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={values[key] || ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={handleSave} disabled={mutation.isPending} className="gap-2">
        <Save className="h-4 w-4" />
        {mutation.isPending ? 'Salvando...' : 'Salvar e Aplicar'}
      </Button>
    </div>
  );
}
