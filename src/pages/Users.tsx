import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersRound, Construction } from 'lucide-react';

const Users = () => {
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
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Construction className="h-5 w-5" />
            <span>Em breve</span>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Aqui você poderá gerenciar os usuários da sua equipe, definir permissões 
            e controlar o acesso às funcionalidades do sistema.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Users;
