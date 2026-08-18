import { useEffect, useState } from 'react';
import { Building2, Home, Layers } from 'lucide-react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface AssetsData {
  totalAssets: number;
  unitsInProperties: number;
  standaloneUnits: number;
  rented: number;
  reserved: number;
  available: number;
  sold: number;
}

const STATUS_BREAKDOWN: Array<{
  key: 'rented' | 'reserved' | 'available' | 'sold';
  label: string;
  dot: string;
}> = [
  { key: 'available', label: 'Disponíveis', dot: 'bg-emerald-500' },
  { key: 'rented', label: 'Alugados', dot: 'bg-blue-500' },
  { key: 'reserved', label: 'Reservados', dot: 'bg-amber-500' },
  { key: 'sold', label: 'Vendidos', dot: 'bg-purple-500' },
];

interface AssetsWidgetProps {
  isLoading?: boolean;
}

export function AssetsWidget({ isLoading: externalLoading }: AssetsWidgetProps) {
  const [data, setData] = useState<AssetsData>({
    totalAssets: 0,
    unitsInProperties: 0,
    standaloneUnits: 0,
    rented: 0,
    reserved: 0,
    available: 0,
    sold: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAssetsData();
  }, []);

  const loadAssetsData = async () => {
    try {
      setIsLoading(true);
      
      // Ativos = unidades de empreendimentos + imóveis avulsos.
      // Empreendimentos (properties) são agrupadores e NÃO entram na contagem.
      const unitsRes = await supabase
        .from('units')
        .select('id, is_standalone, status, is_occupied');

      const units = unitsRes.data || [];
      const countByStatus = (status: string) => units.filter(u => u.status === status).length;

      setData({
        totalAssets: units.length,
        unitsInProperties: units.filter(u => !u.is_standalone).length,
        standaloneUnits: units.filter(u => u.is_standalone).length,
        rented: countByStatus('rented'),
        reserved: countByStatus('reserved'),
        available: countByStatus('available'),
        sold: countByStatus('sold'),
      });
    } catch (error) {
      console.error('Error loading assets data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loading = externalLoading || isLoading;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2 px-3 lg:px-6">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 lg:h-8 w-12 lg:w-16" />
                <Skeleton className="h-3 lg:h-4 w-16 lg:w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Total de Ativos',
      shortLabel: 'Ativos',
      value: data.totalAssets,
      icon: Layers,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Unidades',
      shortLabel: 'Unidades',
      value: data.unitsInProperties,
      icon: Building2,
      color: 'text-green-600 dark:text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Imóveis Avulsos',
      shortLabel: 'Avulsos',
      value: data.standaloneUnits,
      icon: Home,
      color: 'text-orange-600 dark:text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="h-full">
        <CardHeader className="pb-2 px-3 lg:px-6 pt-3 lg:pt-6">
          <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-1.5">
            Contagem de Ativos <HelpTooltip featureKey="assets.portfolio_count" />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
          {/* Single row layout - responsive with flex wrap */}
          <div className="flex flex-wrap gap-4 lg:gap-6">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Tooltip key={metric.label}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 min-w-0 cursor-default flex-1 min-w-[100px]">
                      <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${metric.bgColor}`}>
                        <Icon className={`h-4 w-4 lg:h-5 lg:w-5 ${metric.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg lg:text-xl font-bold leading-tight">
                          {metric.value}
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {metric.shortLabel}
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{metric.label}: {metric.value}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Detalhamento por status - lista vertical */}
          <div className="mt-3 lg:mt-4 pt-3 border-t space-y-1.5">
            {STATUS_BREAKDOWN.map(({ key, label, dot }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md px-2 py-1.5 border-l-2 bg-muted/30"
                style={{ borderLeftColor: `var(--${key}-color, currentColor)` }}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className="text-sm font-semibold">{data[key]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}