import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CreditCard,
  ExternalLink,
  Loader2,
  Plus,
  Minus,
  Sparkles,
  Users,
  Building2,
  Zap,
  Receipt,
  XCircle,
} from 'lucide-react';
import { useSubscriptionDetails } from '@/hooks/useSubscriptionDetails';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { describeTrialEnd } from '@/lib/trial';
import { useAICredits } from '@/hooks/useAICredits';

import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Rocket, Clock, Crown } from 'lucide-react';
import { BuyAICreditsDialog } from './BuyAICreditsDialog';
import { useAddonCheckout } from '@/hooks/useAddonCheckout';
import { CancelSubscriptionDialog } from './CancelSubscriptionDialog';

const planLabels: Record<string, string> = {
  start: 'Start',
  free: 'Gratuito',
  essencial: 'Essencial',
  pro: 'Pro',
  business: 'Business',
};

const planColors: Record<string, string> = {
  start: 'secondary',
  free: 'secondary',
  essencial: 'secondary',
  pro: 'default',
  business: 'default',
};

export const SubscriptionManagement = () => {
  const { subscription, isLoading, refetch, openCustomerPortal } =
    useSubscriptionDetails();
  const { isTrialActive, trialDaysRemaining, trialEndsAt } = useTrialStatus();
  const { credits: aiCredits, isLoading: isLoadingCredits } = useAICredits();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [addonUserQty, setAddonUserQty] = useState(1);
  const [addonUnitQty, setAddonUnitQty] = useState(1);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const navigate = useNavigate();
  const { buyAddon, loadingAddonId } = useAddonCheckout();


  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const plan = subscription?.plan_id || 'free';
  const hasAsaas = subscription?.billing_provider === 'asaas' && !!subscription?.asaas_subscription_id;
  const hasStripe = subscription?.billing_provider === 'stripe' && !!subscription?.stripe_subscription_id;
  const isPaid = ['essencial', 'pro', 'business'].includes(plan);

  const handlePortal = async () => {
    setLoadingAction('portal');
    try {
      await openCustomerPortal();
    } catch {
      toast.error('Erro ao abrir portal de faturamento.');
    } finally {
      setLoadingAction(null);
    }
  };




  const extraUsers = subscription?.extra_users_count || 0;
  const extraUnits = subscription?.extra_unit_packs || 0;

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {isTrialActive && (() => {
        const info = describeTrialEnd(trialEndsAt);
        return (
        <Card className="border-primary/50">
          <CardContent className="flex items-start gap-4 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-foreground">
                Teste grátis do Pro {info ? info.headline : `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}`}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{info ? info.countdown : `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}`}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Depois, sua conta continua no plano Start (gratuito).
              </p>
              <Button
                className="mt-2 gap-2"
                onClick={() => navigate('/checkout?plan=pro&cycle=annual&mode=immediate')}
              >
                <Crown className="h-4 w-4" />
                Assinar o Pro
              </Button>
            </div>
          </CardContent>
        </Card>
        );
      })()}

      {/* Upgrade CTA for Start plan (non-trial) */}
      {plan === 'start' && !isTrialActive && (
        <Card className="border-primary/30">
          <CardContent className="flex items-center justify-between py-5">
            <div>
              <p className="font-medium text-foreground">Desbloqueie todos os recursos</p>
              <p className="text-sm text-muted-foreground">
                Faça upgrade para o plano PRO e tenha acesso a IA, WhatsApp e mais.
              </p>
            </div>
            <Button onClick={() => navigate('/checkout?plan=pro&cycle=annual&mode=immediate')} className="gap-2">
              <Crown className="h-4 w-4" />
              Upgrade para PRO
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plano e Assinatura
          </CardTitle>
          <CardDescription>Gerencie seu plano, add-ons e créditos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{planLabels[plan] || plan}</p>
              <p className="text-sm text-muted-foreground">
                {subscription?.cancel_at_period_end
                  ? `Cancelada · acesso até ${subscription.current_period_end ? format(new Date(subscription.current_period_end), 'dd/MM/yyyy') : 'o fim do período pago'}`
                  : subscription?.status === 'active'
                  ? `Ativa${subscription?.billing_cycle === 'annual' ? ' · cobrança anual' : subscription?.billing_cycle === 'monthly' ? ' · cobrança mensal' : ''}`
                  : subscription?.status === 'trialing'
                  ? 'Teste grátis'
                  : subscription?.status === 'pending_payment'
                  ? 'Aguardando pagamento'
                  : subscription?.status === 'past_due'
                  ? 'Pagamento em atraso'
                  : 'Sem assinatura ativa'}
              </p>
              {subscription?.current_period_end && !subscription?.cancel_at_period_end && (
                <p className="text-xs text-muted-foreground mt-1">
                  Próxima cobrança em:{' '}
                  {format(new Date(subscription.current_period_end), 'dd/MM/yyyy')}
                </p>
              )}
              {plan === 'free' && !isTrialActive && (
                <p className="text-xs text-muted-foreground mt-1">
                  Você está no plano Free. Faça upgrade para desbloquear todos os recursos.
                </p>
              )}
            </div>
            <Badge variant={planColors[plan] as 'default' | 'secondary'}>
              {planLabels[plan] || plan}
            </Badge>
          </div>

          {subscription?.cancel_at_period_end && (
            <Alert>
              <AlertTitle>Sua assinatura foi cancelada.</AlertTitle>
              <AlertDescription className="space-y-3">
                <span className="block">
                  Você mantém o {planLabels[plan] || plan} até{' '}
                  {subscription.current_period_end
                    ? format(new Date(subscription.current_period_end), 'dd/MM/yyyy')
                    : 'o fim do período pago'}
                  , e nenhuma nova cobrança será feita.
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/checkout?plan=${plan}&cycle=${subscription?.billing_cycle === 'monthly' ? 'monthly' : 'annual'}&mode=immediate`
                    )
                  }
                >
                  Reativar assinatura
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Separator />
          <div className="flex flex-col sm:flex-row gap-2">
            {hasStripe && (
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handlePortal}
                disabled={loadingAction === 'portal'}
              >
                {loadingAction === 'portal' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Portal do Cliente (Stripe)
              </Button>
            )}
            {subscription?.billing_provider === 'asaas'
              && !subscription?.cancel_at_period_end
              && (!!subscription?.asaas_subscription_id
                || ['pending_payment', 'past_due'].includes(subscription?.status ?? '')) && (
              <Button
                variant="outline"
                className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="h-4 w-4" />
                Cancelar assinatura
              </Button>
            )}
            {!isPaid && !isTrialActive && (
              <Button
                className="flex-1 gap-2"
                onClick={() => navigate('/checkout?plan=pro&cycle=annual&mode=immediate')}
              >
                <Crown className="h-4 w-4" />
                Fazer Upgrade
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add-ons - only for paid plans */}
      {(hasAsaas || hasStripe) && plan !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add-ons</CardTitle>
            <CardDescription>Expanda os limites do seu plano. Itens serão adicionados à sua assinatura com cobrança prorata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current add-ons summary */}
            {(extraUsers > 0 || extraUnits > 0) && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <p className="font-medium text-foreground">Ativos na assinatura:</p>
                {extraUsers > 0 && <p className="text-muted-foreground">• {extraUsers} usuário(s) adicional(is)</p>}
                {extraUnits > 0 && <p className="text-muted-foreground">• {extraUnits} pack(s) de unidades (+{extraUnits * 50} unidades)</p>}
              </div>
            )}

            {/* Extra Users */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-3">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">+1 Usuário Adicional</p>
                  <p className="text-xs text-muted-foreground">R$ 49,90/mês cada</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={addonUserQty <= 1}
                  onClick={() => setAddonUserQty(q => Math.max(1, q - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-semibold">{addonUserQty}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAddonUserQty(q => q + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  disabled={!!loadingAction || !!loadingAddonId}
                  onClick={() => buyAddon('extra-user', addonUserQty)}
                >
                  {loadingAddonId === 'extra-user' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Adicionar'
                  )}
                </Button>

              </div>
            </div>

            {/* Extra Unit Packs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Pack de Unidades (+50)</p>
                  <p className="text-xs text-muted-foreground">R$ 39,90/mês cada</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={addonUnitQty <= 1}
                  onClick={() => setAddonUnitQty(q => Math.max(1, q - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-semibold">{addonUnitQty}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setAddonUnitQty(q => q + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  disabled={!!loadingAction || !!loadingAddonId}
                  onClick={() => buyAddon('extra-units-50', addonUnitQty)}
                >
                  {loadingAddonId === 'extra-units-50' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Adicionar'
                  )}
                </Button>

              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Créditos de IA — card unificado */}
      {plan !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Créditos de IA
            </CardTitle>
            <CardDescription>
              Compra pontual — não é uma assinatura recorrente. Créditos não expiram enquanto sua conta estiver ativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingCredits ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ) : (() => {
              const used = aiCredits?.used ?? 0;
              const total = aiCredits?.limit ?? (plan === 'business' ? 750 : 250);
              const bonus = aiCredits?.bonus_credits ?? 0;
              const pct = total > 0 ? Math.round((used / total) * 100) : 0;
              const colorClass = pct > 90 ? 'text-red-500' : pct >= 70 ? 'text-amber-500' : 'text-emerald-500';
              const barClass = pct > 90 ? '[&>div]:bg-red-500' : pct >= 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500';
              return (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Créditos mensais utilizados</span>
                    <span className={cn('font-semibold', colorClass)}>{used} / {total}</span>
                  </div>
                  <Progress value={pct} className={cn('h-2', barClass)} />
                  {bonus > 0 && (
                    <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Créditos bônus pontuais
                      </span>
                      <span className="font-semibold text-emerald-500">+{bonus} disponíveis</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Os créditos mensais ({total}/mês) renovam automaticamente no início de cada ciclo de faturamento.
                    Créditos bônus comprados não expiram e são consumidos após os créditos mensais.
                  </p>
                </>
              );
            })()}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowCreditsDialog(true)}
            >
              <Sparkles className="h-4 w-4" />
              Comprar Créditos Pontuais
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add-ons for paid users without stripe_subscription_id - redirect to checkout */}
      {isPaid && !hasStripe && !hasAsaas && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Adicionais (Add-ons)
            </CardTitle>
            <CardDescription>Para adicionar itens à sua assinatura, efetive primeiro seu plano.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full gap-2"
              onClick={() => navigate('/checkout?plan=pro&cycle=annual&mode=immediate')}
            >
              <Crown className="h-4 w-4" />
              Efetivar Assinatura
            </Button>
          </CardContent>
        </Card>
      )}

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        planLabel={planLabels[plan] || plan}
        accessUntil={subscription?.current_period_end ?? null}
        isPendingPayment={subscription?.status === 'pending_payment' || subscription?.status === 'past_due'}
        onCanceled={() => refetch()}
      />

      <BuyAICreditsDialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog} />
    </div>
  );
};
