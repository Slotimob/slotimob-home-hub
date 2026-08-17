import { TrendingUp, AlertTriangle, Eye, Landmark, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import { cn } from '@/lib/utils';

interface PortfolioWidgetProps {
  refreshKey?: number;
}

export function PortfolioWidget({ refreshKey }: PortfolioWidgetProps) {
  const navigate = useNavigate();
  const { metrics, isLoading, refetch } = usePortfolioMetrics();

  // Refetch when refreshKey changes
  if (refreshKey) {
    // This is a simple trigger mechanism
  }

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
      }).format(value).replace(' mi', 'mi').replace(' mil', 'k');
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatFullCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Determine vacancy alert level
  const isVacancyAlert = metrics.vacancyRate > 10;
  const vacancyColor = isVacancyAlert 
    ? 'text-amber-600 dark:text-amber-500' 
    : 'text-blue-600 dark:text-blue-500';
  const vacancyBgColor = isVacancyAlert 
    ? 'bg-amber-500/10' 
    : 'bg-blue-500/10';
  const VacancyIcon = isVacancyAlert ? AlertTriangle : Eye;

  // Handle navigation to vacant units
  const handleViewVacant = () => {
    // Navigate to units page with filter for vacant managed assets
    navigate('/units?filter=vacant');
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 lg:p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        {/* Card 1: Total Portfolio Value */}
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Patrimônio Total
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        type="button"
                        className="p-0.5 rounded-full hover:bg-muted transition-colors"
                        aria-label="Saiba mais sobre Patrimônio Total"
                      >
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-sm" align="start">
                      <div className="space-y-2">
                        <h4 className="font-semibold">O que é?</h4>
                        <p className="text-muted-foreground">
                          Soma do valor de mercado de todos os seus imóveis com status "Disponível", "Alugado" ou "Reservado".
                        </p>
                        <h4 className="font-semibold">Nota</h4>
                        <p className="text-muted-foreground">
                          Este é um valor de <strong>estoque</strong> (snapshot atual) — não é afetado pelo filtro de datas.
                        </p>
                        <h4 className="font-semibold">Pré-requisito</h4>
                        <p className="text-muted-foreground">
                          Preencha o campo "Valor de Mercado" no cadastro de cada imóvel.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-500 cursor-help break-words">
                      {formatCurrency(metrics.totalPortfolioValue)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-mono">{formatFullCurrency(metrics.totalPortfolioValue)}</p>
                  </TooltipContent>
                </Tooltip>
                
                <p className="text-xs text-muted-foreground">
                  Valor estimado de venda de {metrics.totalAssetsCount} {metrics.totalAssetsCount === 1 ? 'ativo' : 'ativos'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Rental Yield */}
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Yield de Aluguel
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        type="button"
                        className="p-0.5 rounded-full hover:bg-muted transition-colors"
                        aria-label="Saiba mais sobre Yield de Aluguel"
                      >
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-sm" align="center">
                      <div className="space-y-2">
                        <h4 className="font-semibold">O que é?</h4>
                        <p className="text-muted-foreground">
                          Rentabilidade anual dos seus imóveis sob gestão, calculada pela receita de aluguel realizado vs. valor de mercado.
                        </p>
                        <h4 className="font-semibold">Fórmula</h4>
                        <p className="text-muted-foreground font-mono text-xs bg-muted p-2 rounded">
                          (Aluguel Mensal × 12 / Valor de Mercado) × 100
                        </p>
                        <h4 className="font-semibold">Pré-requisitos</h4>
                        <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Marque o imóvel como "Sob Gestão"</li>
                          <li>Defina a intenção como "Locação" ou "Ambos"</li>
                          <li>Status deve ser "Alugado" (vagos não entram no cálculo)</li>
                          <li>Preencha "Valor do Aluguel" e "Valor de Mercado"</li>
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-500">
                    {metrics.annualRentalYield.toFixed(1)}%
                  </p>
                  <span className="text-sm text-muted-foreground">
                    a.a.
                  </span>
                </div>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground cursor-help break-words">
                      {metrics.monthlyRentalYield.toFixed(2)}% a.m. • {metrics.managedAssetsCount} {metrics.managedAssetsCount === 1 ? 'ativo gerido' : 'ativos geridos'}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <p><strong>Fórmula:</strong> (Aluguel Anual / Valor de Mercado) × 100</p>
                      <p><strong>Aluguel Anual:</strong> {formatFullCurrency(metrics.totalAnnualRent)}</p>
                      <p><strong>Valor dos Ativos:</strong> {formatFullCurrency(metrics.managedAssetsValue)}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Vacancy Rate */}
        <Card className={cn(isVacancyAlert && "border-amber-500/30")}>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={cn("p-2 rounded-lg", vacancyBgColor)}>
                    <VacancyIcon className={cn("h-4 w-4", vacancyColor)} />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Taxa de Vacância
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        type="button"
                        className="p-0.5 rounded-full hover:bg-muted transition-colors"
                        aria-label="Saiba mais sobre Taxa de Vacância"
                      >
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-sm" align="end">
                      <div className="space-y-2">
                        <h4 className="font-semibold">O que é?</h4>
                        <p className="text-muted-foreground">
                          Percentual de imóveis sob gestão para locação que estão disponíveis (desocupados).
                        </p>
                        <h4 className="font-semibold">Fórmula</h4>
                        <p className="text-muted-foreground font-mono text-xs bg-muted p-2 rounded">
                          (Imóveis Disponíveis / Total Geridos para Locação) × 100
                        </p>
                        <h4 className="font-semibold">Pré-requisitos</h4>
                        <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Marque o imóvel como "Sob Gestão"</li>
                          <li>Defina a intenção como "Locação" ou "Ambos"</li>
                          <li>Status "Disponível" indica vaga (não depende mais do campo "Ocupado")</li>
                        </ul>
                        <p className="text-amber-600 text-xs mt-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Acima de 10% gera alerta visual
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <p className={cn("text-xl md:text-2xl font-bold", vacancyColor)}>
                    {metrics.vacancyRate.toFixed(1)}%
                  </p>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground break-words">
                    {metrics.vacantUnitsCount} {metrics.vacantUnitsCount === 1 ? 'vago' : 'vagos'} de {metrics.totalManagedForVacancy}
                  </p>
                  
                  {metrics.vacantUnitsCount > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      className={cn("h-auto p-0 text-xs", vacancyColor)}
                      onClick={handleViewVacant}
                    >
                      Ver vagos →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
