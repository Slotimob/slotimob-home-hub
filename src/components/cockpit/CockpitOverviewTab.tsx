import { Card, CardContent } from '@/components/ui/card';
import { Users, CreditCard, Sparkles, DollarSign, TrendingUp } from 'lucide-react';

interface Organization {
  user_id: string;
  plan_id: string;
  subscription_status: string;
  trial_ends_at: string | null;
  is_early_adopter: boolean;
}

interface CockpitOverviewTabProps {
  organizations: Organization[];
}

// Monthly prices for MRR estimation
const PLAN_PRICES: Record<string, number> = {
  essencial: 39.90,
  pro: 147,
  business: 297,
};

const EARLY_ADOPTER_PRICES: Record<string, number> = {
  essencial: 19.90,
  pro: 79,
  business: 179,
};

export function CockpitOverviewTab({ organizations }: CockpitOverviewTabProps) {
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.subscription_status === 'active').length;
  const trialOrgs = organizations.filter(
    (o) => o.subscription_status === 'trialing' || (o.trial_ends_at && new Date(o.trial_ends_at) > new Date())
  ).length;

  // Estimate MRR from active subscriptions
  const estimatedMRR = organizations
    .filter((o) => o.subscription_status === 'active')
    .reduce((sum, o) => {
      const price = o.is_early_adopter
        ? (EARLY_ADOPTER_PRICES[o.plan_id] || 0)
        : (PLAN_PRICES[o.plan_id] || 0);
      return sum + price;
    }, 0);

  const conversionRate = totalOrgs > 0
    ? Math.round((activeOrgs / totalOrgs) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Growth metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Organizações</p>
                <p className="text-2xl font-bold">{totalOrgs}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                <p className="text-2xl font-bold">{activeOrgs}</p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Trial</p>
                <p className="text-2xl font-bold">{trialOrgs}</p>
              </div>
              <Sparkles className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MRR Estimado</p>
                <p className="text-2xl font-bold">
                  R$ {estimatedMRR.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Baseado em {activeOrgs} assinatura{activeOrgs !== 1 ? 's' : ''} ativa{activeOrgs !== 1 ? 's' : ''}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Trial → Ativa ({activeOrgs} de {totalOrgs})
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
