import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';
import { HELP_FEATURES, type FeatureKey } from '@/lib/help-features';

interface Props {
  onCreateContent?: (featureKey: string) => void;
}

export function TrainingCoverageCard({ onCreateContent }: Props) {
  const totalKeys = Object.keys(HELP_FEATURES).length;

  const { data: coveredKeys } = useQuery({
    queryKey: ['training-coverage'],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_content')
        .select('feature_key')
        .eq('is_published', true)
        .not('feature_key', 'is', null);
      return (data || []).map(d => d.feature_key as string);
    },
    staleTime: 60_000,
  });

  const covered = coveredKeys?.length ?? 0;
  const uncovered = Object.entries(HELP_FEATURES).filter(
    ([key]) => !coveredKeys?.includes(key)
  ) as [FeatureKey, string][];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Cobertura de Treinamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary">{totalKeys}</Badge>
            <span className="text-muted-foreground">Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{covered} cobertas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span>{uncovered.length} pendentes</span>
          </div>
        </div>

        {uncovered.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {uncovered.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                <span>
                  <code className="font-mono text-muted-foreground">{key}</code>{' '}
                  <span className="text-foreground">{label}</span>
                </span>
                {onCreateContent && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onCreateContent(key)}>
                    Criar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
