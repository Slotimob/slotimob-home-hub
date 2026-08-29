import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSubscriptionDetails } from '@/hooks/useSubscriptionDetails';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useAICredits } from '@/hooks/useAICredits';

import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Rocket, Clock, Crown } from 'lucide-react';
import { BuyAICreditsDialog } from './BuyAICreditsDialog';
import { useAddonCheckout } from '@/hooks/useAddonCheckout';

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
  const { isTrialActive, trialDaysRemaining } = useTrialStatus();
  const { credits: aiCredits, isLoading: isLoadingCredits } = useAICredits();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [addonUserQty, setAddonUserQty] = useState(1);
  const [addonUnitQty, setAddonUnitQty] = useState(1);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
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




  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const { data } = await supabase.functions.invoke('cancel-subscription');
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success('Assinatura cancelada. Acesso ativo até o fim do período atual.');
      setShowCancelDialog(false);
      await refetch();
    } catch {
      toast.error('Erro ao cancelar assinatura. Tente novamente.');
    } finally {
      setIsCancelling(false);
    }
  };




  const extraUsers = subscription?.extra_users_count || 0;
  const extraUnits = subscription?.extra_unit_packs || 0;

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {isTrialActive && (
        <Card className="border-primary/50">
          <CardContent className="flex items-start gap-4 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-foreground">
                Você está aproveitando 7 dias de Plano PRO Grátis
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}</span>
              </div>
              <Button
                className="mt-2 gap-2"
                onClick={() => navigate('/checkout?plan=pro&cycle=annual&mode=immediate')}
              >
                <Crown className="h-4 w-4" />
                Efetivar Assinatura PRO
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                {subscription?.status === 'active'
                  ? 'Ativa'
                  : subscription?.status === 'trialing'
                  ? 'Trial'
                  : subscription?.status || 'Sem assinatura ativa'}
              </p>
              {subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renova em:{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                </p>
              )}
              {subscription?.cancel_at_period_end && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Cancelamento agendado
                </Badge>
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
            {hasAsaas && isPaid && !subscription?.cancel_at_period_end && (
              <Button
                variant="outline"
                className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="h-4 w-4" />
                Cancelar Assinatura
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

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Cancelar Assinatura
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Tem certeza que deseja cancelar sua assinatura?
              </span>
              {subscription?.current_period_end && (
                <span className="block">
                  Você continuará com acesso completo até{' '}
                  <strong className="text-foreground">
                    {new Date(subscription.current_period_end).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </strong>.
                </span>
              )}
              <span className="block text-destructive/80">
                Após essa data, sua conta será rebaixada automaticamente para o plano Start (gratuito).
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Manter minha Assinatura
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleCancelSubscription();
              }}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cancelando...</>
              ) : (
                'Confirmar Cancelamento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BuyAICreditsDialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog} />
    </div>
  );
};
