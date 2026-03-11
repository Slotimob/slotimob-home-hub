import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSuperAdminAccess } from '@/hooks/useSuperAdminAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { useWorkspace } from '@/hooks/useWorkspace';
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
import { Camera, FileText, Loader2, Scale, Shield, Linkedin, Instagram, PenLine } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { NotificationSettings } from '@/components/NotificationSettings';

import { AppLayout } from '@/components/AppLayout';
import { SubscriptionManagement } from '@/components/settings/SubscriptionManagement';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';

const Settings = () => {
  const { user, loading } = useAuth();
  const { isAdmin } = useAdminAccess();
  const { isSuperAdmin } = useSuperAdminAccess();
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
  
  const [bioMini, setBioMini] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [uploadingCreci, setUploadingCreci] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingAuthor, setSavingAuthor] = useState(false);

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
        setBioMini(data.bio_mini || '');
        setLinkedinUrl(data.linkedin_url || '');
        setInstagramUrl(data.instagram_url || '');
        setAuthorRole(data.author_role || '');
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
    // Apply immediately to DOM and persist in localStorage
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('slotimob-theme', newTheme);
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

  const updateAuthorProfile = async () => {
    setSavingAuthor(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio_mini: bioMini || null,
          linkedin_url: linkedinUrl || null,
          instagram_url: instagramUrl || null,
          author_role: authorRole || null,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Perfil de autor salvo!',
        description: 'Seus dados serão exibidos nos artigos do blog.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingAuthor(false);
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

        {/* Author Profile (E-E-A-T) - Super Admin only */}
        {isSuperAdmin && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              Perfil de Autor
            </CardTitle>
            <CardDescription>
              Dados exibidos nos artigos do blog para credibilidade (E-E-A-T)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="author-role">Cargo / Especialidade</Label>
              <Input
                id="author-role"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="Ex: CEO & Fundador, Especialista em Gestão Imobiliária"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio-mini">Mini Bio</Label>
              <Textarea
                id="bio-mini"
                value={bioMini}
                onChange={(e) => setBioMini(e.target.value)}
                placeholder="Breve descrição profissional (2-3 frases)..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin-url" className="flex items-center gap-1.5">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </Label>
              <Input
                id="linkedin-url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/seu-perfil"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram-url" className="flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5" /> Instagram
              </Label>
              <Input
                id="instagram-url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/seu-perfil"
              />
            </div>

            <Button onClick={updateAuthorProfile} disabled={savingAuthor}>
              {savingAuthor ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Perfil de Autor'
              )}
            </Button>
          </CardContent>
        </Card>}

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança da Conta
            </CardTitle>
            <CardDescription>
              {user?.app_metadata?.provider === 'google'
                ? 'Sua conta está vinculada ao Google. Você pode criar uma senha para também acessar via email.'
                : 'Altere sua senha de acesso de forma segura'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.app_metadata?.provider === 'google' && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Conta Google vinculada</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
                <Badge variant="secondary" className="text-xs">Ativo</Badge>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {user?.app_metadata?.provider === 'google'
                  ? 'Ao criar uma senha, você poderá fazer login tanto pelo Google quanto por email e senha. Enviaremos um link seguro para o seu email.'
                  : <>Por questões de segurança, enviaremos um email de confirmação para <strong>{email}</strong> antes de permitir a alteração da senha.</>
                }
              </p>
            </div>
            <Button onClick={requestPasswordChange} disabled={sendingPasswordReset}>
              {sendingPasswordReset ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando email...
                </>
              ) : (
                user?.app_metadata?.provider === 'google'
                  ? 'Criar senha de acesso'
                  : 'Alterar Senha'
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
              <Select value={theme} onValueChange={updateTheme}>
                <SelectTrigger id="theme-select">
                  <SelectValue placeholder="Selecione um tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light-green">Claro — Verde</SelectItem>
                  <SelectItem value="light-blue">Claro — Azul</SelectItem>
                  <SelectItem value="light-purple">Claro — Roxo</SelectItem>
                  <SelectItem value="dark-green">Escuro — Verde</SelectItem>
                  <SelectItem value="dark-purple">Escuro — Roxo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <NotificationSettings />

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

        {/* Delete Account - Danger Zone */}
        <DeleteAccountSection />
      </div>
    </AppLayout>
  );
};

export default Settings;
