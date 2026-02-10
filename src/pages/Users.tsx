import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsersRound, Construction, UserPlus } from 'lucide-react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useUserRole } from '@/hooks/useUserRole';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';

const Users = () => {
  const { plan } = useSubscriptionLimits();
  const { isAgent } = useUserRole();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Agents cannot access this page
  if (isAgent) return <Navigate to="/dashboard" replace />;

  // Essencial plan: hidden from sidebar but redirect just in case
  if (plan === 'essencial') return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout title="Usuários">
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
          {plan === 'pro' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Construction className="h-5 w-5" />
                <span>Em breve</span>
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Aqui você poderá gerenciar os usuários da sua equipe, definir permissões 
                e controlar o acesso às funcionalidades do sistema.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Users;
