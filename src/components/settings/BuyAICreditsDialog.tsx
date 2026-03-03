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
import { Loader2, Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAICredits } from '@/hooks/useAICredits';

interface BuyAICreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CREDIT_PACKS = [
  {
    id: 'pack-500',
    name: '500 Tokens',
    credits: 500,
    priceId: 'price_1T6gbTAUMiQcSICyei8sQCXE',
    price: 19.90,
  },
  {
    id: 'pack-1000',
    name: '1.000 Tokens',
    credits: 1000,
    priceId: 'price_1T6gbrAUMiQcSICylWWUd3H5',
    price: 39.00,
    bestValue: false,
  },
  {
    id: 'pack-2500',
    name: '2.500 Tokens',
    credits: 2500,
    priceId: 'price_1T6gcBAUMiQcSICyBGJwdX3B',
    price: 79.90,
    bestValue: true,
  },
];

export const BuyAICreditsDialog = ({ open, onOpenChange }: BuyAICreditsDialogProps) => {
  const { credits } = useAICredits();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const handlePurchase = async (pack: typeof CREDIT_PACKS[0]) => {
    setLoadingPack(pack.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: 'credit',
          priceId: pack.priceId,
          quantity: 1,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Comprar Créditos de IA
          </DialogTitle>
          <DialogDescription>
            Créditos extras para usar no Chat IA. Não expiram enquanto sua conta estiver ativa.
          </DialogDescription>
        </DialogHeader>

        {credits && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Créditos disponíveis:</span>
            <Badge variant="secondary">
              <Zap className="h-3 w-3 mr-1" />
              {credits.total_available} créditos
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CREDIT_PACKS.map((pack) => {
            const isLoading = loadingPack === pack.id;
            const pricePerCredit = (pack.price / pack.credits).toFixed(3);

            return (
              <Card
                key={pack.id}
                className={cn(
                  'relative cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
                  pack.bestValue && 'border-primary/50 ring-1 ring-primary/20'
                )}
              >
                {pack.bestValue && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                    Melhor Valor
                  </Badge>
                )}
                <CardContent className="flex flex-col items-center text-center p-4 pt-5 gap-2">
                  <Sparkles className="h-8 w-8 text-primary/70" />
                  <span className="font-bold text-lg">{pack.name}</span>
                  <p className="text-xs text-muted-foreground">
                    R$ {pricePerCredit}/crédito
                  </p>
                  <span className="font-bold text-xl text-foreground">
                    R$ {pack.price.toFixed(2).replace('.', ',')}
                  </span>
                  <Button
                    className="w-full mt-1"
                    size="sm"
                    onClick={() => handlePurchase(pack)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Processando...
                      </>
                    ) : (
                      'Comprar'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Pagamento único via Stripe. Créditos são adicionados imediatamente após a confirmação.
        </p>
      </DialogContent>
    </Dialog>
  );
};
