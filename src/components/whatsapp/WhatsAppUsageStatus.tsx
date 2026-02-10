import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, AlertTriangle, CreditCard, Zap } from 'lucide-react';
import { useWhatsAppUsage } from '@/hooks/useWhatsAppUsage';
import { cn } from '@/lib/utils';

interface WhatsAppUsageStatusProps {
  onBuyCredits?: () => void;
  compact?: boolean;
}

export const WhatsAppUsageStatus = ({ onBuyCredits, compact = false }: WhatsAppUsageStatusProps) => {
  const { usage, usagePercent, isNearLimit, isAtLimit, isLoading } = useWhatsAppUsage();

  if (isLoading || !usage) return null;

  const statusColor = isAtLimit 
    ? 'text-destructive' 
    : isNearLimit 
    ? 'text-amber-500' 
    : 'text-emerald-500';

  const progressColor = isAtLimit
    ? 'bg-destructive'
    : isNearLimit
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <MessageSquare className={cn('h-5 w-5', statusColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Conversas: {usage.service_conversations} / {usage.meta_free_tier}</span>
            {isNearLimit && !isAtLimit && (
              <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {Math.round(usagePercent)}%
              </Badge>
            )}
            {isAtLimit && (
              <Badge variant="destructive" className="text-xs">Limite atingido</Badge>
            )}
          </div>
          <Progress value={Math.min(usagePercent, 100)} className="h-1.5 mt-1" />
        </div>
        {usage.credits_remaining > 0 && (
          <Badge variant="secondary" className="text-xs shrink-0">
            <Zap className="h-3 w-3 mr-1" />
            {usage.credits_remaining} créditos
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(isAtLimit && 'border-destructive/50', isNearLimit && !isAtLimit && 'border-amber-500/50')}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className={cn('h-5 w-5', statusColor)} />
          Status de Uso — WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversations usage */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Conversas de Serviço</span>
            <span className={cn('font-semibold', statusColor)}>
              {usage.service_conversations} / {usage.meta_free_tier}
            </span>
          </div>
          <div className="relative">
            <Progress value={Math.min(usagePercent, 100)} className="h-3" />
            {usage.franchise_limit > 0 && (
              <div 
                className="absolute top-0 h-full border-r-2 border-dashed border-blue-500"
                style={{ left: `${(usage.franchise_limit / usage.meta_free_tier) * 100}%` }}
                title={`Franquia inclusa: ${usage.franchise_limit}`}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0</span>
            {usage.franchise_limit > 0 && (
              <span className="text-blue-500">Franquia: {usage.franchise_limit}</span>
            )}
            <span>Free Tier: {usage.meta_free_tier}</span>
          </div>
        </div>

        {/* Alerts */}
        {isAtLimit && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Limite atingido!</p>
              <p className="text-xs mt-1">
                Você atingiu 1.000 conversas de serviço. Compre créditos para continuar enviando mensagens.
                Mensagens recebidas continuam funcionando.
              </p>
            </div>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Atenção: {Math.round(usagePercent)}% da franquia utilizada</p>
              <p className="text-xs mt-1">
                Considere adquirir créditos extras para evitar interrupções.
              </p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{usage.total_sent}</div>
            <div className="text-xs text-muted-foreground">Enviadas</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{usage.total_received}</div>
            <div className="text-xs text-muted-foreground">Recebidas</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold">{usage.credits_remaining}</div>
            <div className="text-xs text-muted-foreground">Créditos</div>
          </div>
        </div>

        {/* Buy credits button */}
        {onBuyCredits && (
          <Button 
            variant={isAtLimit ? 'default' : 'outline'} 
            className="w-full"
            onClick={onBuyCredits}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Comprar Créditos Extras
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
