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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { validatePassword, PASSWORD_REQUIREMENTS_MESSAGE } from '@/lib/passwordSchema';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Camera, FileText, Loader2, Linkedin, Instagram, PenLine,
  ChevronDown, Building2, Receipt, Shield, Bell, CreditCard,
  Scale, Download, AlertTriangle, User, Eye, EyeOff,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { NotificationSettings } from '@/components/NotificationSettings';

import { AppLayout } from '@/components/AppLayout';
import { SubscriptionManagement } from '@/components/settings/SubscriptionManagement';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';
import { AsaasFinancialSeal, AsaasTransparencyNote } from '@/components/asaas/AsaasFinancialSeal';

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

interface AsaasConfig {
  name?: string;
  cpf_cnpj?: string;
  person_type?: 'FISICA' | 'MEI' | 'JURIDICA';
  mobile_phone?: string;
  postal_code?: string;
  address?: string;
  address_number?: string;
  province?: string;
  city?: string;
  state?: string;
}

const SettingsSection = ({
  title,
  description,
  icon: Icon,
  defaultOpen = false,
  children,
  className = 'border rounded-lg overflow-hidden',
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 border-t space-y-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const Settings = () => {
  const { user, loading } = useAuth();
  const { isAdmin } = useAdminAccess();
  const { isSuperAdmin } = useSuperAdminAccess();
  const { isAgent } = useUserRole();
  const { isMember } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<any>(null);
  const [theme, setTheme] = useState('light-purple');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [creciUrl, setCreciUrl] = useState('');

  const [bioMini, setBioMini] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [authorRole, setAuthorRole] = useState('');

  const [asaasConfig, setAsaasConfig] = useState<AsaasConfig>({});
  const [savingAsaas, setSavingAsaas] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [asaasAccountStatus, setAsaasAccountStatus] = useState<'active' | 'pending' | null>(null);
  const [asaasAccountId, setAsaasAccountId] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadingCreci, setUploadingCreci] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingAuthor, setSavingAuthor] = useState(false);
  const [loadingCreciView, setLoadingCreciView] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
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
        setBioMini(data.bio_mini || '');
        setLinkedinUrl(data.linkedin_url || '');
        setInstagramUrl(data.instagram_url || '');
        setAuthorRole(data.author_role || '');
        setAsaasConfig(((data as any).asaas_config as AsaasConfig) || {});
      }

      // Verificar status da subconta Asaas
      const { data: asaasAcc } = await supabase
        .from('asaas_accounts')
        .select('asaas_account_id, status')
        .eq('broker_id', user?.id)
        .maybeSingle();
      if (asaasAcc) {
        setAsaasAccountStatus(asaasAcc.status as 'active' | 'pending');
        setAsaasAccountId(asaasAcc.asaas_account_id);
      }
    } catch (error: any) {
      toast({ title: 'Erro ao carregar perfil', description: error.message, variant: 'destructive' });
    }
  };

  const updateTheme = async (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('slotimob-theme', newTheme);
    try {
      const { error } = await supabase.from('profiles').update({ theme_preference: newTheme }).eq('id', user?.id);
      if (error) throw error;
      toast({ title: 'Tema salvo!', description: 'Suas preferências foram atualizadas.' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar tema', description: error.message, variant: 'destructive' });
    }
  };

  const updateFullName = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Erro', description: 'O nome não pode estar vazio.', variant: 'destructive' });
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user?.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['organization-owner-profile'] });
      toast({ title: 'Nome atualizado!', description: 'Seu nome foi salvo com sucesso.' });
    } catch {
      toast({ title: 'Erro ao atualizar nome', description: 'Não foi possível salvar seu nome.', variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const updatePhone = async () => {
    setSavingPhone(true);
    try {
      const { error } = await supabase.from('profiles').update({ phone }).eq('id', user?.id);
      if (error) throw error;
      toast({ title: 'Telefone atualizado!', description: 'Seu número de contato foi salvo.' });
    } catch {
      toast({ title: 'Erro ao atualizar telefone', description: 'Não foi possível salvar seu telefone.', variant: 'destructive' });
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
      toast({ title: 'Perfil de autor salvo!', description: 'Seus dados serão exibidos nos artigos do blog.' });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSavingAuthor(false);
    }
  };

  const handleCepBlur = async () => {
    const cep = (asaasConfig.postal_code || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data?.erro) return;
      setAsaasConfig((prev) => ({
        ...prev,
        address: data.logradouro || prev.address,
        province: data.bairro || prev.province,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch {
      // silent
    } finally {
      setFetchingCep(false);
    }
  };

  const saveAsaasConfig = async () => {
    if (!asaasConfig.name || !asaasConfig.cpf_cnpj) {
      toast({ title: 'Preencha nome e CPF/CNPJ', variant: 'destructive' });
      return;
    }
    setSavingAsaas(true);
    try {
      // Mapear person_type → companyType do Asaas
      const companyTypeMap: Record<string, string> = {
        FISICA: 'INDIVIDUAL',
        MEI: 'MEI',
        JURIDICA: 'LIMITED',
      };

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-asaas-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            name: asaasConfig.name,
            email: user?.email,
            cpfCnpj: asaasConfig.cpf_cnpj,
            mobilePhone: asaasConfig.mobile_phone,
            companyType: companyTypeMap[asaasConfig.person_type || ''] || 'INDIVIDUAL',
            address: asaasConfig.address,
            addressNumber: asaasConfig.address_number,
            province: asaasConfig.province,
            postalCode: asaasConfig.postal_code,
            city: asaasConfig.city,
            state: asaasConfig.state,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Erro ao configurar conta Asaas');

      setAsaasAccountStatus('active');
      setAsaasAccountId(json.asaas_account_id);
      setProfile((p: any) => ({ ...p, asaas_config: asaasConfig }));

      toast({
        title: json.already_exists ? 'Conta Asaas já configurada' : 'Conta Asaas criada!',
        description: json.already_exists
          ? 'Sua subconta já estava ativa no Asaas.'
          : 'Sua subconta foi criada. Você já pode emitir boletos.',
      });
    } catch (error: any) {
      toast({ title: 'Erro ao configurar Asaas', description: error.message, variant: 'destructive' });
    } finally {
      setSavingAsaas(false);
    }
  };

  const MAX_AVATAR_SIZE_MB = 5;
  const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        toast({ title: 'Nenhum arquivo selecionado', description: 'Selecione uma imagem.', variant: 'destructive' });
        return;
      }
      const file = event.target.files[0];
      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        toast({ title: 'Arquivo muito grande', description: `Máx ${MAX_AVATAR_SIZE_MB}MB.`, variant: 'destructive' });
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({ title: 'Formato inválido', description: 'JPG, PNG ou WEBP.', variant: 'destructive' });
        return;
      }
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: newAvatarUrl }).eq('id', user?.id);
      if (updateError) throw updateError;
      setAvatarUrl(newAvatarUrl);
      toast({ title: 'Foto atualizada!', description: 'Sua foto foi salva.' });
    } catch (error: any) {
      toast({ title: 'Erro ao fazer upload', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const requestPasswordChange = async () => {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast({ title: 'Senha fraca', description: passwordError, variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Senhas não conferem', description: 'A confirmação precisa ser igual à nova senha.', variant: 'destructive' });
      return;
    }
    setSendingPasswordReset(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Senha alterada!', description: 'Sua nova senha já está ativa.' });
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      toast({ title: 'Erro ao alterar senha', description: error.message, variant: 'destructive' });
    } finally {
      setSendingPasswordReset(false);
    }
  };


  const MAX_CRECI_SIZE_MB = 10;
  const MAX_CRECI_SIZE_BYTES = MAX_CRECI_SIZE_MB * 1024 * 1024;

  const uploadCreciDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingCreci(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      if (file.size > MAX_CRECI_SIZE_BYTES) {
        toast({ title: 'Arquivo muito grande', description: `Máx ${MAX_CRECI_SIZE_MB}MB.`, variant: 'destructive' });
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({ title: 'Formato inválido', description: 'Imagem ou PDF.', variant: 'destructive' });
        return;
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/creci.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('user-documents').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from('profiles').update({ creci_document_url: fileName }).eq('id', user?.id);
      if (updateError) throw updateError;
      setCreciUrl(fileName);
      toast({ title: 'CRECI enviado!', description: 'Documento salvo.' });
    } catch (error: any) {
      toast({ title: 'Erro ao fazer upload', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setUploadingCreci(false);
      event.target.value = '';
    }
  };

  const handleViewCreci = async () => {
    if (!creciUrl) return;
    setLoadingCreciView(true);
    try {
      const { data, error } = await supabase.storage.from('user-documents').createSignedUrl(creciUrl, 3600);
      if (error || !data?.signedUrl) {
        toast({ title: 'Erro ao acessar documento', description: 'Link expirado.', variant: 'destructive' });
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
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
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Workspace banner for members */}
        {isMember && (
          <Alert className="border-primary/20 bg-primary/5">
            <Building2 className="h-5 w-5 text-primary" />
            <AlertTitle className="text-base">Workspace</AlertTitle>
            <AlertDescription>
              Estás no Workspace gerido pelo proprietário da conta. As tuas configurações pessoais (nome, foto, senha) podem ser alteradas, mas ações administrativas são restritas.
            </AlertDescription>
          </Alert>
        )}

        {/* 1 — Perfil */}
        <SettingsSection title="Perfil" description="Foto, nome e telefone" icon={User} defaultOpen>
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl">{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    <span className="ml-2">Alterar foto</span>
                  </span>
                </Button>
              </Label>
              <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
              <p className="text-sm text-muted-foreground mt-2">JPG, PNG ou WEBP (máx. 5MB)</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="full-name">Nome Completo</Label>
            <div className="flex gap-2">
              <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como você gostaria de ser identificado" />
              <Button onClick={updateFullName} disabled={savingName}>
                {savingName ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Salvar'}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} disabled className="bg-muted" />
            <p className="text-sm text-muted-foreground">Entre em contato com o suporte para alterar seu email</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="flex gap-2">
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              <Button onClick={updatePhone} disabled={savingPhone}>
                {savingPhone ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Salvar'}
              </Button>
            </div>
          </div>
        </SettingsSection>

        {/* 2 — Asaas */}
        <SettingsSection
          title="Configuração de Boleto Asaas"
          description="Dados do emissor para emissão de boletos"
          icon={Receipt}
        >
          {isMember ? (
            <div className="flex items-start gap-2 p-3 bg-muted/50 border border-border rounded-lg">
              <Receipt className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Você é um usuário convidado. A configuração da conta Asaas para emissão de boletos deve ser feita pelo administrador (proprietário) da conta principal.
              </p>
            </div>
          ) : (
            <>
              {asaasAccountStatus === 'active' ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800">
                    ✓ Subconta Asaas ativa
                  </Badge>
                  {asaasAccountId && (
                    <span className="text-xs text-muted-foreground font-mono">{asaasAccountId}</span>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Não configurada — preencha e salve para ativar
                </Badge>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome / Razão Social</Label>
                  <Input
                    value={asaasConfig.name || ''}
                    onChange={(e) => setAsaasConfig({ ...asaasConfig, name: e.target.value })}
                    placeholder="Nome do emissor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF ou CNPJ</Label>
                  <Input
                    value={asaasConfig.cpf_cnpj || ''}
                    onChange={(e) => setAsaasConfig({ ...asaasConfig, cpf_cnpj: e.target.value })}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Pessoa</Label>
                  <Select
                    value={asaasConfig.person_type || ''}
                    onValueChange={(v) => setAsaasConfig({ ...asaasConfig, person_type: v as AsaasConfig['person_type'] })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FISICA">Pessoa Física</SelectItem>
                      <SelectItem value="MEI">MEI</SelectItem>
                      <SelectItem value="JURIDICA">Empresa (LTDA/SA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <Input
                    value={asaasConfig.mobile_phone || ''}
                    onChange={(e) => setAsaasConfig({ ...asaasConfig, mobile_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEP {fetchingCep && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</Label>
                  <Input
                    value={asaasConfig.postal_code || ''}
                    onChange={(e) => setAsaasConfig({ ...asaasConfig, postal_code: e.target.value })}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Logradouro</Label>
                  <Input
                    value={asaasConfig.address || ''}
                    onChange={(e) => setAsaasConfig({ ...asaasConfig, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={asaasConfig.address_number || ''}
                    onChange={(e) => setAsaasConfig({ ...asaasConfig, address_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={asaasConfig.province || ''}
                    onChange={(e) => setAsaasConfig({ ...asaasConfig, province: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={asaasConfig.city || ''}
                    onChange={(e) => setAsaasConfig({ ...asaasConfig, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={asaasConfig.state || ''}
                    onValueChange={(v) => setAsaasConfig({ ...asaasConfig, state: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {UF_OPTIONS.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-800">
                <Receipt className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-600 dark:text-blue-500">
                  Estes dados são usados para criar sua subconta no <strong>Asaas</strong> — https://www.asaas.com e identificar o emissor nos boletos.
                </p>
              </div>

              <Button onClick={saveAsaasConfig} disabled={savingAsaas || asaasAccountStatus === 'active'}>
                {savingAsaas
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Criando subconta...</>
                  : asaasAccountStatus === 'active'
                  ? '✓ Conta já configurada'
                  : 'Criar subconta e ativar cobrança'}
              </Button>

              <Separator />

              <div className="mt-4 space-y-3">
                <AsaasFinancialSeal size="sm" />
                <AsaasTransparencyNote />
              </div>
            </>
          )}
        </SettingsSection>

        {/* 3 — Segurança */}
        <SettingsSection title="Segurança da Conta" description="Senha e método de acesso" icon={Shield}>
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

          <p className="text-sm text-muted-foreground">
            {user?.app_metadata?.provider === 'google'
              ? 'Ao criar uma senha, você poderá fazer login tanto pelo Google quanto por email e senha.'
              : 'Defina uma nova senha para sua conta. A troca é imediata.'}
          </p>

          <div className="space-y-2">
            <Label htmlFor="settings-new-password">Nova senha</Label>
            <div className="relative">
              <Input
                id="settings-new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-confirm-password">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="settings-confirm-password"
                type={showConfirmNewPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                minLength={8}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={requestPasswordChange}
            disabled={sendingPasswordReset || !newPassword || !confirmNewPassword}
          >
            {sendingPasswordReset ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
            ) : user?.app_metadata?.provider === 'google' ? 'Criar senha de acesso' : 'Alterar Senha'}
          </Button>
        </SettingsSection>

        {/* 4 — Documentos */}
        <SettingsSection title="Documentos" description="CRECI e perfil profissional" icon={FileText}>
          <div className="space-y-2">
            <Label>CRECI</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {creciUrl && (
                <button
                  onClick={handleViewCreci}
                  disabled={loadingCreciView}
                  className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {loadingCreciView ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {loadingCreciView ? 'Abrindo...' : 'Ver documento'}
                </button>
              )}
              <Label htmlFor="creci-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploadingCreci} asChild>
                  <span>
                    {uploadingCreci ? <Loader2 className="h-4 w-4 animate-spin" /> : creciUrl ? 'Atualizar' : 'Enviar CRECI'}
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
            <p className="text-sm text-muted-foreground">Envie uma foto ou PDF do seu CRECI (máx. 10MB)</p>
          </div>

          {isSuperAdmin && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">Perfil de Autor</p>
                </div>
                <p className="text-xs text-muted-foreground">Dados exibidos nos artigos do blog (E-E-A-T)</p>

                <div className="space-y-2">
                  <Label htmlFor="author-role">Cargo / Especialidade</Label>
                  <Input id="author-role" value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} placeholder="Ex: CEO & Fundador" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio-mini">Mini Bio</Label>
                  <Textarea id="bio-mini" value={bioMini} onChange={(e) => setBioMini(e.target.value)} placeholder="Breve descrição..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin-url" className="flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</Label>
                  <Input id="linkedin-url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram-url" className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
                  <Input id="instagram-url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
                </div>
                <Button onClick={updateAuthorProfile} disabled={savingAuthor}>
                  {savingAuthor ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Salvar Perfil de Autor'}
                </Button>
              </div>
            </>
          )}
        </SettingsSection>

        {/* 5 — Preferências */}
        <SettingsSection title="Preferências e Notificações" description="Tema e configurações de alertas" icon={Bell}>
          <div className="space-y-2">
            <Label htmlFor="theme-select">Tema</Label>
            <Select value={theme} onValueChange={updateTheme}>
              <SelectTrigger id="theme-select"><SelectValue placeholder="Selecione um tema" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light-green">Claro — Verde</SelectItem>
                <SelectItem value="light-blue">Claro — Azul</SelectItem>
                <SelectItem value="light-purple">Claro — Roxo</SelectItem>
                <SelectItem value="dark-green">Escuro — Verde</SelectItem>
                <SelectItem value="dark-purple">Escuro — Roxo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <NotificationSettings />
        </SettingsSection>

        {/* 6 — Assinatura */}
        {!isAgent && !isMember && (
          <SettingsSection title="Gerenciar Assinatura" description="Plano, créditos IA e add-ons" icon={CreditCard}>
            <SubscriptionManagement />
          </SettingsSection>
        )}
        {isMember && (
          <SettingsSection title="Gerenciar Assinatura" description="Plano, créditos IA e add-ons" icon={CreditCard}>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                A assinatura da plataforma é gerenciada pelo administrador (proprietário) da sua conta.
              </p>
            </div>
          </SettingsSection>
        )}

        {/* 7 — Legal */}
        <SettingsSection title="Documentos Legais" description="Política de privacidade e termos de uso" icon={Scale}>
          <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/legal')}>
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
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
                <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={() => navigate('/admin/terms')}>
                  <Shield className="h-3 w-3" /> Gerenciar Versões dos Termos
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={() => navigate('/admin/users')}>
                  <Shield className="h-3 w-3" /> Gerenciar Usuários
                </Button>
              </div>
            </>
          )}
        </SettingsSection>

        {/* 8 — Exportar */}
        {!isMember && (
          <SettingsSection title="Exportar meus dados" description="Cópia completa dos seus dados" icon={Download}>
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/settings/data-export')}>
              <Download className="h-4 w-4" />
              Exportar meus dados
            </Button>
          </SettingsSection>
        )}

        {/* 9 — Zona de Perigo */}
        {!isMember && (
          <SettingsSection
            title="Zona de Perigo"
            description="Ações irreversíveis"
            icon={AlertTriangle}
            className="border border-destructive/50 rounded-lg overflow-hidden"
          >
            <DeleteAccountSection />
          </SettingsSection>
        )}
      </div>
    </AppLayout>
  );
};

export default Settings;
