import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { useGlowSettings } from '@/hooks/useGlowSettings';
import { Skeleton } from '@/components/ui/skeleton';

export function GlowSettings() {
  const { glowIntensity, updateGlowIntensity, loading } = useGlowSettings();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getIntensityLabel = (value: number) => {
    if (value === 0) return 'Desativado';
    if (value <= 25) return 'Sutil';
    if (value <= 50) return 'Médio';
    if (value <= 75) return 'Intenso';
    return 'Máximo';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Efeito Glow
        </CardTitle>
        <CardDescription>
          Ajuste a intensidade do efeito de brilho nos cards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="glow-intensity" className="text-base">
              Intensidade do Glow
            </Label>
            <span className="text-sm text-muted-foreground font-medium">
              {getIntensityLabel(glowIntensity)} ({glowIntensity}%)
            </span>
          </div>
          <Slider
            id="glow-intensity"
            min={0}
            max={100}
            step={5}
            value={[glowIntensity]}
            onValueChange={([value]) => updateGlowIntensity(value)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Desativado</span>
            <span>Máximo</span>
          </div>
        </div>

        {/* Preview */}
        <div className="pt-4 border-t">
          <Label className="text-sm text-muted-foreground mb-3 block">Pré-visualização</Label>
          <div className="flex gap-3 flex-wrap">
            <div className="card-glow-hover rounded-lg border bg-card p-3 text-xs font-medium">
              Padrão
            </div>
            <div className="card-glow-hover glow-green rounded-lg border bg-card p-3 text-xs font-medium">
              Disponível
            </div>
            <div className="card-glow-hover glow-blue rounded-lg border bg-card p-3 text-xs font-medium">
              Alugado
            </div>
            <div className="card-glow-hover glow-yellow rounded-lg border bg-card p-3 text-xs font-medium">
              Reservado
            </div>
            <div className="card-glow-hover glow-red rounded-lg border bg-card p-3 text-xs font-medium">
              Vendido
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
