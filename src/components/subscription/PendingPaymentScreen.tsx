import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, LogOut, MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SlotiLogo } from '@/components/SlotiLogo';
import { buildWhatsAppLink } from '@/lib/constants';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CancelSubscriptionDialog } from '@/components/settings/CancelSubscriptionDialog';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const PendingPaymentScreen = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data } = useQuery({
    queryKey: ['pending-payment-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_id, billing_cycle')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!sub) return null;

      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('name, price_original, price_annual')
        .eq('id', sub.plan_id)
        .maybeSingle();

      return {
        planId: sub.plan_id,
        billingCycle: sub.billing_cycle,
        planName: plan?.name ?? sub.plan_id,
        price: sub.billing_cycle === 'annual' ? plan?.price_annual : plan?.price_original,
      };
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      await queryClient.invalidateQueries();
      toast.success('Status atualizado. Se o pagamento foi confirmado, o acesso será liberado.', { duration: 1000 });
    } catch {
      toast.error('Não foi possível verificar agora. Tente novamente em instantes.', { duration: 1000 });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center space-y-3">
          <SlotiLogo size="md" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Aguardando confirmação do pagamento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Seu acesso será liberado automaticamente assim que a operadora confirmar o pagamento.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-lg border border-border bg-muted/50 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Plano escolhido</p>
              <p className="font-semibold text-foreground capitalize">{data?.planName ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {data?.billingCycle === 'annual' ? 'Valor anual' : 'Valor mensal'}
              </p>
              <p className="font-semibold text-foreground">
                {typeof data?.price === 'number' ? formatBRL(Number(data.price)) : '—'}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Pagou por boleto? A compensação leva até 3 dias úteis e o acesso é liberado automaticamente.
          </p>

          <div className="space-y-2">
            <Button className="w-full" onClick={handleCheck} disabled={isChecking}>
              {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Já paguei, verificar agora
            </Button>

            {data?.planId && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  navigate(
                    `/checkout?plan=${data.planId}&cycle=${data.billingCycle === 'monthly' ? 'monthly' : 'annual'}&mode=immediate`
                  )
                }
              >
                Ver a cobrança de novo
              </Button>
            )}

            <Button variant="ghost" className="w-full" asChild>
              <a
                href={buildWhatsAppLink('Olá! Meu pagamento está pendente e preciso de ajuda.')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Falar com o suporte
              </a>
            </Button>

            <Button
              variant="ghost"
              className="w-full text-destructive"
              onClick={() => setShowCancelDialog(true)}
            >
              Desistir desta assinatura
            </Button>

            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        planLabel={data?.planName ?? 'seu plano'}
        accessUntil={null}
        isPendingPayment
        onCanceled={() => queryClient.invalidateQueries()}
      />
    </div>
  );
};

export default PendingPaymentScreen;
