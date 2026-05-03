import { AppLayout } from '@/components/AppLayout';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsersRound, UserPlus } from 'lucide-react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useUserRole } from '@/hooks/useUserRole';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { TeamManagement } from '@/components/users/TeamManagement';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';

const Users = () => {
  const { plan } = useSubscriptionLimits();
  const { isAgent } = useUserRole();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Essencial plan: hidden from sidebar but redirect just in case
  if (plan === 'essencial') return <Navigate to="/dashboard" replace />;

  // Business plan: full team management with permissions (both owners and members)
  if (plan === 'business') {
    return (
      <AppLayout title="Usuários" titleExtra={<HelpTooltip featureKey="settings.team" />}>
        <TeamManagement />
      </AppLayout>
    );
  }

  // Agents on non-business plans redirect to dashboard
  if (isAgent) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout title="Usuários" titleExtra={<HelpTooltip featureKey="settings.team" />}>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <UsersRound className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Gestão de Usuários</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground max-w-md mx-auto">
            A gestão de equipe está disponível no plano Business. 
            Convide agentes, defina permissões e gerencie o acesso da sua equipe.
          </p>
          <Button onClick={() => setShowUpgrade(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Convidar Usuário
          </Button>
          <UpgradeModal
            open={showUpgrade}
            onOpenChange={setShowUpgrade}
            feature="team_management"
            targetPlan="business"
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Users;
