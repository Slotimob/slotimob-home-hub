import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Zap } from 'lucide-react';
import { useWhatsAppUsage } from '@/hooks/useWhatsAppUsage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuyCreditsDialog = ({ open, onOpenChange }: BuyCreditsDialogProps) => {
  const { creditPacks, usage } = useWhatsAppUsage();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const handlePurchase = async (packId: string) => {
    setLoadingPack(packId);
    try {
      // For now, open Stripe payment link or create a checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          plan_id: 'credits', 
          credit_pack_id: packId,
          billing_cycle: 'one_time',
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Purchase error:', err);
      toast.error('Erro ao processar compra. Tente novamente.');
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Comprar Créditos de Mensagem
          </DialogTitle>
          <DialogDescription>
            Créditos são consumidos quando você envia mensagens além do Free Tier da Meta (1.000 conversas/mês).
          </DialogDescription>
        </DialogHeader>

        {usage && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Créditos atuais:</span>
            <Badge variant="secondary">
              <Zap className="h-3 w-3 mr-1" />
              {usage.credits_remaining} créditos
            </Badge>
          </div>
        )}

        <div className="space-y-3">
          {creditPacks.map((pack) => {
            const isLoading = loadingPack === pack.id;
            const pricePerCredit = (pack.price / pack.credits).toFixed(4);
            const isBestValue = pack.id === 'pack-2500';

            return (
              <Card 
                key={pack.id} 
                className={cn(
                  'cursor-pointer transition-colors hover:border-blue-500/50',
                  isBestValue && 'border-blue-500/50'
                )}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pack.name}</span>
                      {isBestValue && (
                        <Badge className="bg-blue-500 text-white text-xs">Melhor Valor</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      R$ {pricePerCredit} por crédito
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">
                      R$ {pack.price.toFixed(2).replace('.', ',')}
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => handlePurchase(pack.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Créditos não expiram enquanto sua assinatura estiver ativa.
        </p>
      </DialogContent>
    </Dialog>
  );
};
