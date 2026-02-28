import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppUsageStatusProps {
  activeConnections: number;
  instancesLimit: number;
  onBuyExtra?: () => void;
  compact?: boolean;
}

export const WhatsAppUsageStatus = ({ activeConnections, instancesLimit, onBuyExtra, compact = false }: WhatsAppUsageStatusProps) => {
  const isAtLimit = instancesLimit > 0 && activeConnections >= instancesLimit;
  const isNearLimit = instancesLimit > 0 && activeConnections >= instancesLimit - 1 && !isAtLimit;

  const statusColor = isAtLimit 
    ? 'text-destructive' 
    : isNearLimit 
    ? 'text-amber-500' 
    : 'text-emerald-500';

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <Wifi className={cn('h-5 w-5', statusColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Conexões: {activeConnections} / {instancesLimit === -1 ? '∞' : instancesLimit}</span>
            {isAtLimit && (
              <Badge variant="destructive" className="text-xs">Limite atingido</Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(isAtLimit && 'border-destructive/50', isNearLimit && 'border-amber-500/50')}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wifi className={cn('h-5 w-5', statusColor)} />
          Conexões WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instance counter */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Conexões Utilizadas</span>
          <span className={cn('text-2xl font-bold', statusColor)}>
            {activeConnections} <span className="text-base font-normal text-muted-foreground">de {instancesLimit === -1 ? '∞' : instancesLimit}</span>
          </span>
        </div>

        {/* Grid indicators */}
        {instancesLimit > 0 && instancesLimit <= 10 && (
          <div className="flex gap-2">
            {Array.from({ length: instancesLimit }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-3 flex-1 rounded-full transition-colors',
                  i < activeConnections ? 'bg-emerald-500' : 'bg-muted'
                )}
              />
            ))}
          </div>
        )}

        {/* Alerts */}
        {isAtLimit && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Limite de conexões atingido</p>
              <p className="text-xs mt-1">
                Faça upgrade do seu plano ou adquira conexões extras para conectar mais aparelhos.
              </p>
            </div>
          </div>
        )}

        {instancesLimit === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-muted-foreground text-sm">
            <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">WhatsApp não disponível</p>
              <p className="text-xs mt-1">
                Faça upgrade para o plano Pro para conectar seu WhatsApp.
              </p>
            </div>
          </div>
        )}

        {/* Buy extra button */}
        {onBuyExtra && instancesLimit > 0 && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onBuyExtra}
          >
            <Plus className="h-4 w-4 mr-2" />
            Comprar Conexão Adicional
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
