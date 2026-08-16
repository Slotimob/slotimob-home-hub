import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Send, Shield, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TermsVersion {
  id: string;
  version: string;
  title: string;
  summary: string | null;
  is_active: boolean;
  published_at: string | null;
  created_at: string;
}

const TermsAdmin = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: isLoadingAdmin } = useAdminAccess();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [versions, setVersions] = useState<TermsVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newVersion, setNewVersion] = useState({
    version: '',
    title: '',
    summary: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadVersions();
    }
  }, [user]);

  const loadVersions = async () => {
    try {
      setLoadingVersions(true);
      const { data, error } = await supabase
        .from('terms_versions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar versões',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!newVersion.version || !newVersion.title) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a versão e o título.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const { error } = await supabase
        .from('terms_versions')
        .insert({
          version: newVersion.version,
          title: newVersion.title,
          summary: newVersion.summary || null,
        });

      if (error) throw error;

      toast({
        title: 'Versão criada',
        description: 'A nova versão dos termos foi criada.',
      });

      setNewVersion({ version: '', title: '', summary: '' });
      setCreateDialogOpen(false);
      loadVersions();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar versão',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handlePublishVersion = async (versionData: TermsVersion) => {
    try {
      setPublishing(true);

      // Deactivate all versions
      await supabase
        .from('terms_versions')
        .update({ is_active: false })
        .neq('id', 'none');

      // Activate the selected version
      const { error } = await supabase
        .from('terms_versions')
        .update({ 
          is_active: true,
          published_at: new Date().toISOString()
        })
        .eq('id', versionData.id);

      if (error) throw error;

      toast({
        title: 'Versão publicada',
        description: `A versão ${versionData.version} foi ativada. Os usuários precisarão aceitar os novos termos.`,
      });

      loadVersions();
    } catch (error: any) {
      toast({
        title: 'Erro ao publicar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleNotifyUsers = async (versionData: TermsVersion) => {
    try {
      setNotifying(true);

      const { data, error } = await supabase.functions.invoke('notify-terms-update', {
        body: {
          version: versionData.version,
          title: versionData.title,
          summary: versionData.summary,
        },
      });

      if (error) throw error;

      toast({
        title: 'Notificações enviadas',
        description: data.message || `${data.notified} usuários foram notificados.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao notificar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setNotifying(false);
    }
  };

  if (loading || loadingVersions || isLoadingAdmin) {
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
    <AppLayout
      title="Administração de Termos"
      headerActions={
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
    >
      <div className="container mx-auto max-w-4xl">

        <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Versões dos Termos
                  </CardTitle>
                  <CardDescription>
                    Gerencie as versões da Política de Privacidade e Termos de Uso
                  </CardDescription>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nova Versão
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Versão</DialogTitle>
                      <DialogDescription>
                        Adicione uma nova versão dos termos de uso
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="version">Versão *</Label>
                        <Input
                          id="version"
                          placeholder="Ex: 1.1, 2.0"
                          value={newVersion.version}
                          onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title">Título *</Label>
                        <Input
                          id="title"
                          placeholder="Ex: Atualização de Política de Dados"
                          value={newVersion.title}
                          onChange={(e) => setNewVersion({ ...newVersion, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="summary">Resumo das alterações</Label>
                        <Textarea
                          id="summary"
                          placeholder="Descreva as principais mudanças nesta versão..."
                          value={newVersion.summary}
                          onChange={(e) => setNewVersion({ ...newVersion, summary: e.target.value })}
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateVersion} disabled={creating}>
                        {creating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          'Criar Versão'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
          </Card>

          {/* Versions List */}
          <div className="space-y-4">
            {versions.map((version) => (
              <Card key={version.id} className={version.is_active ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{version.title}</CardTitle>
                        {version.is_active && (
                          <Badge className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativa
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Versão {version.version} • Criada em{' '}
                        {format(new Date(version.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        {version.published_at && (
                          <>
                            {' '}• Publicada em{' '}
                            {format(new Date(version.published_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {!version.is_active && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={publishing}>
                              Publicar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Publicar versão {version.version}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso tornará esta versão ativa e todos os usuários precisarão aceitar os novos termos na próxima vez que acessarem o sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handlePublishVersion(version)}>
                                Publicar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {version.is_active && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="gap-2" disabled={notifying}>
                              {notifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Notificar Usuários
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Enviar notificação por email?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Um email será enviado para todos os usuários cadastrados informando sobre a atualização dos termos de uso.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleNotifyUsers(version)}>
                                Enviar Notificações
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {version.summary && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{version.summary}</p>
                  </CardContent>
                )}
              </Card>
            ))}

            {versions.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma versão cadastrada</p>
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    Criar primeira versão
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

export default TermsAdmin;
