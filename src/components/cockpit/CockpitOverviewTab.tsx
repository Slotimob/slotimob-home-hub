import { Card, CardContent } from '@/components/ui/card';
import { Users, CreditCard, Sparkles } from 'lucide-react';

interface Organization {
  user_id: string;
  subscription_status: string;
  trial_ends_at: string | null;
}

interface CockpitOverviewTabProps {
  organizations: Organization[];
}

export function CockpitOverviewTab({ organizations }: CockpitOverviewTabProps) {
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.subscription_status === 'active').length;
  const trialOrgs = organizations.filter(
    (o) => o.subscription_status === 'trialing' || (o.trial_ends_at && new Date(o.trial_ends_at) > new Date())
  ).length;

  return (
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
  );
}
