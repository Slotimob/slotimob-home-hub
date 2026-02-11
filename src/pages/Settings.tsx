import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Camera, FileText, Loader2, Scale, Shield } from 'lucide-react';
import { NotificationSettings } from '@/components/NotificationSettings';
import { GlowSettings } from '@/components/GlowSettings';
import { AppLayout } from '@/components/AppLayout';
import { SubscriptionManagement } from '@/components/settings/SubscriptionManagement';

const Settings = () => {
  const { user, loading } = useAuth();
  const { isAdmin } = useAdminAccess();
  const { isAgent } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [theme, setTheme] = useState('light-purple');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [creciUrl, setCreciUrl] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('essencial');
  
  const [uploading, setUploading] = useState(false);
  const [uploadingCreci, setUploadingCreci] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      setEmail(user.email || '');
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar_url || '');
        setCreciUrl(data.creci_document_url || '');
        setTheme(data.theme_preference || 'light-purple');
        setSubscriptionPlan(data.subscription_plan || 'essencial');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar perfil',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateTheme = async (newTheme: string) => {
    setTheme(newTheme);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user?.id);

      if (error) throw error;
      
      toast({
        title: 'Tema salvo!',
        description: 'Suas preferências foram atualizadas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar tema',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateFullName = async () => {
    if (!fullName.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome não pode estar vazio.',
        variant: 'destructive',
      });
      return;
    }

    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Nome atualizado!',
        description: 'Seu nome foi salvo com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar nome',
        description: 'Não foi possível salvar seu nome. Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingName(false);
    }
  };

  const updatePhone = async () => {
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Telefone atualizado!',
        description: 'Seu número de contato foi salvo.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar telefone',
        description: 'Não foi possível salvar seu telefone. Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingPhone(false);
    }
  };

  const MAX_AVATAR_SIZE_MB = 5;
  const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        toast({
          title: 'Nenhum arquivo selecionado',
          description: 'Por favor, selecione uma imagem para usar como foto de perfil.',
          variant: 'destructive',
        });
        return;
      }

      const file = event.target.files[0];

      // Validate file size
      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        toast({
          title: 'Arquivo muito grande',
          description: `O tamanho máximo permitido é ${MAX_AVATAR_SIZE_MB}MB. Escolha uma imagem menor.`,
          variant: 'destructive',
        });
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Formato inválido',
          description: 'Por favor, selecione uma imagem JPG, PNG ou WEBP.',
          variant: 'destructive',
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting query param to force immediate refresh
      const newAvatarUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Update local state immediately
      setAvatarUrl(newAvatarUrl);
      
      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi salva com sucesso.',
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      
      let errorMessage = 'Não foi possível atualizar sua foto. Tente novamente.';
      
      if (error.message?.includes('payload too large')) {
        errorMessage = `O arquivo é muito grande. O tamanho máximo é ${MAX_AVATAR_SIZE_MB}MB.`;
      } else if (error.message?.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }
      
      toast({
        title: 'Erro ao fazer upload',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset the input so the same file can be selected again
      event.target.value = '';
    }
  };

  const requestPasswordChange = async () => {
    if (!email) {
      toast({
        title: 'Erro',
        description: 'Email não encontrado. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }

    setSendingPasswordReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Email enviado!',
        description: `Enviamos um link para ${email} para alteração de senha.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar email',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const MAX_CRECI_SIZE_MB = 10;
  const MAX_CRECI_SIZE_BYTES = MAX_CRECI_SIZE_MB * 1024 * 1024;

  const uploadCreciDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingCreci(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        toast({
          title: 'Nenhum arquivo selecionado',
          description: 'Por favor, selecione uma imagem ou PDF do seu CRECI.',
          variant: 'destructive',
        });
        return;
      }

      const file = event.target.files[0];

      // Validate file size
      if (file.size > MAX_CRECI_SIZE_BYTES) {
        toast({
          title: 'Arquivo muito grande',
          description: `O tamanho máximo permitido é ${MAX_CRECI_SIZE_MB}MB. Escolha um arquivo menor.`,
          variant: 'destructive',
        });
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Formato inválido',
          description: 'Por favor, selecione uma imagem (JPG, PNG, WEBP) ou PDF.',
          variant: 'destructive',
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/creci.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ creci_document_url: fileName })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setCreciUrl(fileName);
      toast({
        title: 'CRECI enviado!',
        description: 'Seu documento foi salvo com sucesso.',
      });
    } catch (error: any) {
      console.error('CRECI upload error:', error);
      
      let errorMessage = 'Não foi possível enviar o documento. Tente novamente.';
      
      if (error.message?.includes('payload too large')) {
        errorMessage = `O arquivo é muito grande. O tamanho máximo é ${MAX_CRECI_SIZE_MB}MB.`;
      } else if (error.message?.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }
      
      toast({
        title: 'Erro ao fazer upload',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploadingCreci(false);
      event.target.value = '';
    }
  };

  const getSignedCreciUrl = async (filePath: string): Promise<string | null> => {
    try {
      // Generate a fresh signed URL on each request (1 hour validity)
      // This ensures we always get a valid, non-expired URL
      const { data, error } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(filePath, 3600);
      
      if (error) {
        console.error('Error generating signed URL:', error);
        return null;
      }
      
      return data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  };

  const [loadingCreciView, setLoadingCreciView] = useState(false);

  const handleViewCreci = async () => {
    if (!creciUrl) return;
    
    setLoadingCreciView(true);
    try {
      const signedUrl = await getSignedCreciUrl(creciUrl);
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast({
          title: 'Erro ao acessar documento',
          description: 'O link do documento expirou ou não está disponível. Tente fazer o upload novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoadingCreciView(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout title="Configurações">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Gerencie suas informações pessoais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl">
                  {profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={uploading} asChild>
                      <span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        <span className="ml-2">Alterar foto</span>
                      </span>
                    </Button>
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadAvatar}
                  disabled={uploading}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  JPG, PNG ou WEBP (máx. 5MB)
                </p>
              </div>
            </div>

            <Separator />

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full-name">Nome Completo</Label>
              <div className="flex gap-2">
                <Input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Como você gostaria de ser identificado"
                />
                <Button onClick={updateFullName} disabled={savingName}>
                  {savingName ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Entre em contato com o suporte para alterar seu email
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
                <Button onClick={updatePhone} disabled={savingPhone}>
                  {savingPhone ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>
              Altere sua senha de acesso de forma segura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Por questões de segurança, enviaremos um email de confirmação para <strong>{email}</strong> antes de permitir a alteração da senha.
              </p>
            </div>
            <Button onClick={requestPasswordChange} disabled={sendingPasswordReset}>
              {sendingPasswordReset ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando email...
                </>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>Credenciais profissionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>CRECI</Label>
              <div className="flex items-center gap-2">
              {creciUrl && (
                  <button
                    onClick={handleViewCreci}
                    disabled={loadingCreciView}
                    className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {loadingCreciView ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {loadingCreciView ? 'Abrindo...' : 'Ver documento'}
                  </button>
                )}
                <Label htmlFor="creci-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={uploadingCreci} asChild>
                    <span>
                      {uploadingCreci ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        creciUrl ? 'Atualizar' : 'Enviar CRECI'
                      )}
                    </span>
                  </Button>
                </Label>
                <Input
                  id="creci-upload"
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={uploadCreciDocument}
                  disabled={uploadingCreci}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Envie uma foto ou PDF do seu CRECI (máx. 10MB)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
            <CardDescription>Personalize sua experiência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-select">Tema</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Escolha o tema visual da aplicação
              </p>
              <Select value={theme} onValueChange={updateTheme}>
                <SelectTrigger id="theme-select">
                  <SelectValue placeholder="Selecione um tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light-green">Branco e Verde</SelectItem>
                  <SelectItem value="light-blue">Branco e Azul</SelectItem>
                  <SelectItem value="light-purple">Branco e Roxo</SelectItem>
                  <SelectItem value="dark-green">Modo Escuro com Verde</SelectItem>
                  <SelectItem value="dark-purple">Modo Escuro com Roxo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <NotificationSettings />

        {/* Glow Settings */}
        <GlowSettings />

        {/* Subscription Section - Owner only */}
        {!isAgent && <SubscriptionManagement />}

        {/* Legal Section */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos Legais</CardTitle>
            <CardDescription>Políticas e termos do aplicativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate('/legal')}
            >
              <Scale className="h-4 w-4" />
              Política de Privacidade e Termos de Uso
            </Button>
            
            {profile?.terms_accepted_at && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="text-sm font-medium text-foreground">Aceite dos Termos</p>
                <p className="text-xs text-muted-foreground">
                  Você aceitou os termos em:{' '}
                  <span className="font-medium text-foreground">
                    {new Date(profile.terms_accepted_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
                {profile?.terms_version && (
                  <p className="text-xs text-muted-foreground">
                    Versão: <span className="font-medium">{profile.terms_version}</span>
                  </p>
                )}
              </div>
            )}
            
            {isAdmin && (
              <>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground mb-2">Área Administrativa</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-2"
                    onClick={() => navigate('/admin/terms')}
                  >
                    <Shield className="h-3 w-3" />
                    Gerenciar Versões dos Termos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-2"
                    onClick={() => navigate('/admin/users')}
                  >
                    <Shield className="h-3 w-3" />
                    Gerenciar Usuários
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
