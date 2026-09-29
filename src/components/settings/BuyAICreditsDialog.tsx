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
import { useAICreditPacks } from '@/hooks/useAICreditPacks';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentMethodSelector, type PlatformBillingType } from '@/components/checkout/PaymentMethodSelector';
import { PlatformPaymentResult, normalizePlatformPaymentResult, type PlatformPaymentResultData } from '@/components/checkout/PlatformPaymentResult';

interface BuyAICreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuyAICreditsDialog = ({ open, onOpenChange }: BuyAICreditsDialogProps) => {
  const { credits } = useAICredits();
  const { data: packs, isLoading: isLoadingPacks } = useAICreditPacks();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [billingType, setBillingType] = useState<PlatformBillingType>('PIX');
  const [result, setResult] = useState<PlatformPaymentResultData | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) setResult(null);
    onOpenChange(next);
  };

  const handlePurchase = async (pack: { id: string }) => {
    setLoadingPack(pack.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          product_type: 'ai_credits',
          credit_pack_id: pack.id,
          billing_type: billingType,
        },
      });

      if (error) throw error;

      if (data?.error === 'cpf_cnpj_obrigatorio') {
        toast.error(data.message || 'Informe seu CPF ou CNPJ para gerar o pagamento.');
      } else if (data?.error) {
        toast.error(data.message || data.error);
      } else if (normalizePlatformPaymentResult(data)) {
        setResult(normalizePlatformPaymentResult(data));
      } else {
        toast.error('Erro ao processar compra. Tente novamente.');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      toast.error('Erro ao processar compra. Tente novamente.');
    } finally {
      setLoadingPack(null);
    }
  };

  const bestValueId = packs && packs.length > 0 ? packs[packs.length - 1].id : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          Compra pontual — não é uma assinatura. Os créditos não expiram e são adicionados ao saldo existente.
        </div>

        {credits && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Créditos disponíveis:</span>
            <Badge variant="secondary">
              <Zap className="h-3 w-3 mr-1" />
              {credits.total_available} créditos
            </Badge>
          </div>
        )}

        {result ? (
          <div className="space-y-4">
            <PlatformPaymentResult result={result} billingType={billingType} />
            <p className="text-sm text-muted-foreground">Os créditos entram no seu saldo assim que o pagamento for confirmado.</p>
            <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
              Voltar aos pacotes
            </Button>
          </div>
        ) : (
        <>
        <PaymentMethodSelector value={billingType} onChange={setBillingType} disabled={!!loadingPack} />
        {isLoadingPacks ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {packs?.map((pack) => {
              const isLoading = loadingPack === pack.id;
              const isBestValue = pack.id === bestValueId;
              const pricePerCredit = (Number(pack.price) / pack.credits_amount).toFixed(3);

              return (
                <Card
                  key={pack.id}
                  className={cn(
                    'relative cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
                    isBestValue && 'border-primary/50 ring-1 ring-primary/20'
                  )}
                >
                  {isBestValue && (
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
                      R$ {Number(pack.price).toFixed(2).replace('.', ',')}
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
        )}

        <p className="text-xs text-muted-foreground text-center">
          Pagamento via Asaas (PIX ou cartão de crédito). Créditos adicionados após confirmação.
        </p>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};
