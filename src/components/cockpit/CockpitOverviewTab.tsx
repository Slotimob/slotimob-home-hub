import { Card, CardContent } from '@/components/ui/card';
import { Users, CreditCard, Sparkles, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { TrainingCoverageCard } from './TrainingCoverageCard';

interface Organization {
  user_id: string;
  plan_id: string;
  subscription_status: string;
  trial_ends_at: string | null;
  is_early_adopter: boolean;
  is_staff?: boolean;
  extra_users_count?: number;
  extra_unit_packs?: number;
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

const EXTRA_USER_PRICE = 19.90;
const EXTRA_UNIT_PACK_PRICE = 29.90;

export function CockpitOverviewTab({ organizations }: CockpitOverviewTabProps) {
  // Contas da própria equipe (super_admin, admin, moderator, support) não são clientes
  // pagantes reais e não devem entrar em nenhuma métrica financeira ou de crescimento.
  const customerOrgs = organizations.filter((o) => !o.is_staff);

  const totalOrgs = customerOrgs.length;
  const activeOrgs = customerOrgs.filter((o) => o.subscription_status === 'active').length;
  const trialOrgs = customerOrgs.filter(
    (o) => o.subscription_status === 'trialing' || (o.trial_ends_at && new Date(o.trial_ends_at) > new Date())
  ).length;
  const pastDueOrgs = customerOrgs.filter((o) => o.subscription_status === 'past_due').length;

  // Estimate MRR from active subscriptions, incluindo receita de add-ons
  const estimatedMRR = customerOrgs
    .filter((o) => o.subscription_status === 'active')
    .reduce((sum, o) => {
      const basePrice = o.is_early_adopter
        ? (EARLY_ADOPTER_PRICES[o.plan_id] || 0)
        : (PLAN_PRICES[o.plan_id] || 0);
      const addonsPrice =
        (o.extra_users_count || 0) * EXTRA_USER_PRICE +
        (o.extra_unit_packs || 0) * EXTRA_UNIT_PACK_PRICE;
      return sum + basePrice + addonsPrice;
    }, 0);

  const activationRate = totalOrgs > 0
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MRR Estimado</p>
                <p className="text-2xl font-bold">
                  R$ {estimatedMRR.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeOrgs} assinatura{activeOrgs !== 1 ? 's' : ''} ativa{activeOrgs !== 1 ? 's' : ''}, com add-ons
                </p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Ativação</p>
                <p className="text-2xl font-bold">{activationRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ativas de todas as orgs ({activeOrgs} de {totalOrgs})
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className={pastDueOrgs > 0 ? 'border-destructive/40' : undefined}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inadimplentes</p>
                <p className={`text-2xl font-bold ${pastDueOrgs > 0 ? 'text-destructive' : ''}`}>{pastDueOrgs}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pagamento em atraso
                </p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${pastDueOrgs > 0 ? 'text-destructive/60' : 'text-muted-foreground/30'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training coverage */}
      <TrainingCoverageCard />
    </div>
  );
}
