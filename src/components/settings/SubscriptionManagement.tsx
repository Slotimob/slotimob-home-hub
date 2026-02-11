import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  ExternalLink,
  Loader2,
  MessageSquare,
  Plus,
  Minus,
  Sparkles,
  Users,
  Building2,
  Zap,
} from 'lucide-react';
import { useSubscriptionDetails } from '@/hooks/useSubscriptionDetails';
import { toast } from 'sonner';

const planLabels: Record<string, string> = {
  free: 'Gratuito',
  essencial: 'Essencial',
  pro: 'Pro',
  business: 'Business',
};

const planColors: Record<string, string> = {
  free: 'secondary',
  essencial: 'secondary',
  pro: 'default',
  business: 'default',
};

export const SubscriptionManagement = () => {
  const { subscription, isLoading, refetch, openCustomerPortal, manageAddon, buyCredits } =
    useSubscriptionDetails();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

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
  const hasStripe = !!subscription?.stripe_subscription_id;

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

  const handleAddon = async (
    action: 'add' | 'update' | 'remove',
    addon_type: string,
    quantity?: number
  ) => {
    setLoadingAction(`${action}-${addon_type}`);
    try {
      await manageAddon({ action, addon_type, quantity });
      toast.success('Add-on atualizado com sucesso!');
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar add-on.';
      toast.error(message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBuyCredits = async (type: 'credits_whatsapp' | 'credits_ai') => {
    setLoadingAction(`buy-${type}`);
    try {
      await buyCredits(type);
    } catch {
      toast.error('Erro ao iniciar compra de créditos.');
    } finally {
      setLoadingAction(null);
    }
  };

  const extraUsers = subscription?.extra_users_count || 0;
  const extraUnits = subscription?.extra_unit_packs || 0;

  return (
    <div className="space-y-6">
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
                {subscription?.is_early_adopter && (
                  <Badge variant="outline" className="mr-2 text-xs border-amber-500 text-amber-600">
                    Early Adopter
                  </Badge>
                )}
                {subscription?.status === 'active'
                  ? 'Ativa'
                  : subscription?.status === 'trialing'
                  ? 'Trial'
                  : subscription?.status || 'Inativa'}
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
            </div>
            <Badge variant={planColors[plan] as 'default' | 'secondary'}>
              {planLabels[plan] || plan}
            </Badge>
          </div>

          {hasStripe && (
            <>
              <Separator />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handlePortal}
                disabled={loadingAction === 'portal'}
              >
                {loadingAction === 'portal' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Gerir Assinatura no Stripe
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add-ons - only for paid plans */}
      {hasStripe && plan !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add-ons</CardTitle>
            <CardDescription>Expanda os limites do seu plano</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Extra Users */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Usuários Adicionais</p>
                  <p className="text-xs text-muted-foreground">R$ 19,90/mês cada</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={extraUsers === 0 || !!loadingAction}
                  onClick={() =>
                    extraUsers <= 1
                      ? handleAddon('remove', 'extra_user')
                      : handleAddon('update', 'extra_user', extraUsers - 1)
                  }
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-semibold">{extraUsers}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!!loadingAction}
                  onClick={() => handleAddon(extraUsers === 0 ? 'add' : 'update', 'extra_user', extraUsers + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Extra Unit Packs */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Pack de Unidades (+50)</p>
                  <p className="text-xs text-muted-foreground">R$ 29,90/mês cada</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={extraUnits === 0 || !!loadingAction}
                  onClick={() =>
                    extraUnits <= 1
                      ? handleAddon('remove', 'extra_units')
                      : handleAddon('update', 'extra_units', extraUnits - 1)
                  }
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-semibold">{extraUnits}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!!loadingAction}
                  onClick={() => handleAddon(extraUnits === 0 ? 'add' : 'update', 'extra_units', extraUnits + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credits Purchase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Créditos de Consumo
          </CardTitle>
          <CardDescription>Compre créditos para WhatsApp e IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">Créditos WhatsApp</p>
                <p className="text-xs text-muted-foreground">R$ 49,00 por pacote</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleBuyCredits('credits_whatsapp')}
              disabled={loadingAction === 'buy-credits_whatsapp'}
            >
              {loadingAction === 'buy-credits_whatsapp' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Comprar'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium text-sm">Créditos IA</p>
                <p className="text-xs text-muted-foreground">R$ 39,00 por pacote</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleBuyCredits('credits_ai')}
              disabled={loadingAction === 'buy-credits_ai'}
            >
              {loadingAction === 'buy-credits_ai' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Comprar'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
