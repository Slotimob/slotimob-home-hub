import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, ShieldAlert, Users, UserPlus, Trash2, Shield, Search } from 'lucide-react';
import { SlotiLogo } from '@/components/SlotiLogo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  user_id: string;
  role: 'admin' | 'agent' | 'moderator' | 'user' | 'super_admin' | 'support';
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

const UsersAdmin = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: isLoadingAdmin } = useAdminAccess();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userRoles, setUserRoles] = useState<UserWithRole[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newRole, setNewRole] = useState({
    userId: '',
    role: 'user' as 'admin' | 'moderator' | 'user',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Load all profiles to get user info
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (profilesError) throw profilesError;

      setProfiles(profilesData || []);

      // Combine roles with profile data
      const rolesWithProfiles = (rolesData || []).map(role => {
        const profile = profilesData?.find(p => p.id === role.user_id);
        return {
          ...role,
          profile: profile ? { full_name: profile.full_name, email: profile.email } : undefined,
        };
      });

      setUserRoles(rolesWithProfiles);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRole.userId || !newRole.role) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione um usuário e uma role.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAdding(true);
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: newRole.userId,
          role: newRole.role,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este usuário já possui esta role.');
        }
        throw error;
      }

      toast({
        title: 'Role adicionada',
        description: 'A role foi atribuída ao usuário com sucesso.',
      });

      setNewRole({ userId: '', role: 'user' });
      setAddDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar role',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Role removida',
        description: 'A role foi removida do usuário.',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover role',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'moderator':
        return 'Moderador';
      default:
        return 'Usuário';
    }
  };

  // Filter profiles that don't have the selected role yet
  const availableProfiles = profiles.filter(profile => {
    const hasRole = userRoles.some(
      ur => ur.user_id === profile.id && ur.role === newRole.role
    );
    return !hasRole;
  });

  const filteredProfiles = availableProfiles.filter(profile =>
    profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || loadingData || isLoadingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <ShieldAlert className="h-16 w-16 mx-auto text-destructive mb-4" />
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página. 
              Esta área é restrita a administradores do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/settings')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-accent/10">
      {/* Header */}
      <header className="border-b bg-card pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SlotiLogo size="md" />
          <h1 className="text-xl font-bold">Gerenciamento de Usuários</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Roles de Usuários
                  </CardTitle>
                  <CardDescription>
                    Gerencie as permissões e roles dos usuários do sistema
                  </CardDescription>
                </div>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Adicionar Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Role</DialogTitle>
                      <DialogDescription>
                        Atribua uma role a um usuário do sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Role *</Label>
                        <Select
                          value={newRole.role}
                          onValueChange={(value: 'admin' | 'moderator' | 'user') => 
                            setNewRole({ ...newRole, role: value, userId: '' })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="moderator">Moderador</SelectItem>
                            <SelectItem value="user">Usuário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Usuário *</Label>
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar usuário..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Select
                          value={newRole.userId}
                          onValueChange={(value) => setNewRole({ ...newRole, userId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um usuário" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProfiles.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                Nenhum usuário disponível
                              </div>
                            ) : (
                              filteredProfiles.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  {profile.full_name} ({profile.email})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddRole} disabled={adding}>
                        {adding ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adicionando...
                          </>
                        ) : (
                          'Adicionar Role'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
          </Card>

          {/* Users List */}
          <div className="space-y-4">
            {userRoles.map((userRole) => (
              <Card key={userRole.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">
                          {userRole.profile?.full_name || 'Usuário não encontrado'}
                        </CardTitle>
                        <Badge variant={getRoleBadgeVariant(userRole.role)}>
                          {getRoleLabel(userRole.role)}
                        </Badge>
                      </div>
                      <CardDescription>
                        {userRole.profile?.email || userRole.user_id}
                        <span className="mx-2">•</span>
                        Adicionado em{' '}
                        {format(new Date(userRole.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={userRole.user_id === user?.id && userRole.role === 'admin'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover role?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover a role de {getRoleLabel(userRole.role)} do usuário{' '}
                            <strong>{userRole.profile?.full_name}</strong>? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleRemoveRole(userRole.id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
              </Card>
            ))}

            {userRoles.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma role atribuída</p>
                  <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                    Adicionar primeira role
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UsersAdmin;
