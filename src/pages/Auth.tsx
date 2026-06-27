import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { SlotiLogo } from '@/components/SlotiLogo';
import { Separator } from '@/components/ui/separator';
import { SEOHead } from '@/components/SEOHead';
import { toast as sonnerToast } from 'sonner';
import { trackLeadSignup, trackStartTrial } from '@/components/TrackingProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, ArrowLeft, BarChart3, MessageSquare, Wallet, Building2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SITE_URL = window.location.origin;

// ─── Overlays & helpers ───

const OAuthLoadingOverlay = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in duration-300">
    <div className="flex flex-col items-center gap-6 max-w-xs text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
        <SlotiLogo size="lg" className="relative z-10 h-20 w-20" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">SLOTIMOB</h2>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">Conectando ao seu ambiente seguro...</span>
      </div>
      <div className="h-1 w-48 rounded-full bg-muted overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-primary animate-[shimmer_1.5s_ease-in-out_infinite]"
          style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  </div>
);

// ─── Schemas ───

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
});

// Unified signup schema (single step)
const signupSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  confirmPassword: z.string().min(1, { message: 'Confirme sua senha' }),
  fullName: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  phone: z.string().optional(),
  personType: z.enum(['pf', 'pj']),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  businessName: z.string().optional(),
  creci: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'As senhas não coincidem', path: ['confirmPassword'] });
  }
  if (data.personType === 'pf') {
    const cpfDigits = (data.cpf || '').replace(/\D/g, '');
    if (!cpfDigits || cpfDigits.length !== 11) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF deve ter 11 dígitos', path: ['cpf'] });
    } else if (!isValidCPF(cpfDigits)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF inválido', path: ['cpf'] });
    }
  } else {
    const cnpjDigits = (data.cnpj || '').replace(/\D/g, '');
    if (!cnpjDigits || cnpjDigits.length !== 14) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CNPJ deve ter 14 dígitos', path: ['cnpj'] });
    } else if (!isValidCNPJ(cnpjDigits)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CNPJ inválido', path: ['cnpj'] });
    }
    if (!data.businessName || data.businessName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Razão Social é obrigatória para PJ', path: ['businessName'] });
    }
  }
});

// Profile completion schema (Google OAuth users)
const completeProfileSchema = z.object({
  personType: z.enum(['pf', 'pj']),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  businessName: z.string().optional(),
  creci: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.personType === 'pf') {
    const cpfDigits = (data.cpf || '').replace(/\D/g, '');
    if (!cpfDigits || cpfDigits.length !== 11) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF deve ter 11 dígitos', path: ['cpf'] });
    } else if (!isValidCPF(cpfDigits)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF inválido', path: ['cpf'] });
    }
  } else {
    const cnpjDigits = (data.cnpj || '').replace(/\D/g, '');
    if (!cnpjDigits || cnpjDigits.length !== 14) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CNPJ deve ter 14 dígitos', path: ['cnpj'] });
    } else if (!isValidCNPJ(cnpjDigits)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CNPJ inválido', path: ['cnpj'] });
    }
    if (!data.businessName || data.businessName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Razão Social é obrigatória para PJ', path: ['businessName'] });
    }
  }
});

// ─── Validation helpers ───

const isValidCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(digits[10]);
};

const isValidCNPJ = (cnpj: string): boolean => {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let remainder = sum % 11;
  if (parseInt(digits[12]) !== (remainder < 2 ? 0 : 11 - remainder)) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  remainder = sum % 11;
  return parseInt(digits[13]) === (remainder < 2 ? 0 : 11 - remainder);
};

const getAuthErrorMessage = (error: any): { title: string; description: string } => {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid credentials') || errorCode === 'invalid_credentials') {
    return { title: 'Credenciais inválidas', description: 'Email ou senha incorretos. Verifique e tente novamente.' };
  }
  if (errorMessage.includes('email not confirmed') || errorCode === 'email_not_confirmed') {
    return { title: 'Email não verificado', description: 'Verifique sua caixa de entrada e clique no link de confirmação.' };
  }
  if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit') || errorCode === 'over_request_rate_limit') {
    return { title: 'Muitas tentativas', description: 'Aguarde alguns minutos antes de tentar novamente.' };
  }
  if (errorMessage.includes('user not found') || errorCode === 'user_not_found') {
    return { title: 'Email não cadastrado', description: 'Este email não está registrado. Crie uma conta primeiro.' };
  }
  return { title: 'Erro ao fazer login', description: error?.message || 'Verifique suas credenciais e tente novamente.' };
};

// ─── Mask helpers ───

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

// ─── Constants ───

const BENEFITS = [
  { icon: MessageSquare, label: 'CRM Conversacional com WhatsApp' },
  { icon: BarChart3, label: 'Funil de Vendas Inteligente' },
  { icon: Wallet, label: 'Gestão Financeira Completa' },
  { icon: Building2, label: 'Controle de Ativos e Contratos' },
];

const GoogleIcon = () => (
  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// ─── Component ───

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');
  const pendingPlan = searchParams.get('plan');
  const redirectToCheckout = searchParams.get('redirect') === 'checkout';
  const trialPro = searchParams.get('trial') === 'pro';
  const { toast } = useToast();

  // UI states
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(searchParams.get('token') ? 'signup' : (redirectToCheckout ? 'login' : 'login'));
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isCompleteProfileMode] = useState(searchParams.get('complete_profile') === 'true');

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    email: '', password: '', confirmPassword: '', fullName: '', phone: '', companyName: '', creci: '',
    personType: 'pf' as 'pf' | 'pj', cpf: '', cnpj: '', businessName: ''
  });
  const [acceptedTerms, setAcceptedTerms] = useState(searchParams.get('complete_profile') === 'true');
  const [honeypot, setHoneypot] = useState('');
  const [formLoadTime] = useState(() => Date.now());

  // Invitation
  const [invitation, setInvitation] = useState<{ email: string; invited_by_name: string; organization_owner_id: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    const fetchInvitation = async () => {
      setInviteLoading(true);
      try {
        const { data, error } = await supabase
          .rpc('get_invitation_by_token', { p_token: inviteToken });
        if (error || !data) {
          sonnerToast.error('Convite inválido, expirado ou já utilizado.');
        } else {
          const inviteData = data as unknown as { email: string; invited_by_name: string; organization_owner_id: string };
          setInvitation(inviteData);
          setSignupForm(prev => ({ ...prev, email: inviteData.email }));
          setActiveTab('signup');
        }
      } catch {
        sonnerToast.error('Erro ao verificar convite.');
      } finally {
        setInviteLoading(false);
      }
    };
    fetchInvitation();
  }, [inviteToken]);

  useEffect(() => {
    if (trialPro) {
      sonnerToast.info('Você está criando sua conta no Plano Start. Aproveite seus 14 dias de acesso PRO liberados agora!');
      if (activeTab !== 'signup') setActiveTab('signup');
    } else if (pendingPlan && ['essencial', 'pro', 'business'].includes(pendingPlan)) {
      const planNames: Record<string, string> = { essencial: 'Essencial', pro: 'Pro', business: 'Business' };
      const msg = redirectToCheckout
        ? `Faça login ou crie uma conta para assinar o plano ${planNames[pendingPlan] || pendingPlan}`
        : `Crie sua conta para testar o plano ${planNames[pendingPlan] || pendingPlan} grátis por 14 dias`;
      sonnerToast.info(msg);
    }
  }, [pendingPlan, redirectToCheckout, trialPro]);

  // ─── Auth handlers ───

  const handleAcceptInvite = useCallback(async () => {
    if (!inviteToken) return false;
    try {
      const { data, error } = await supabase.functions.invoke('accept-invite', { body: { token: inviteToken } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      sonnerToast.success(data?.message || 'Você foi adicionado à equipe!');
      return true;
    } catch (err: any) {
      sonnerToast.error(err.message || 'Erro ao aceitar convite');
      return false;
    }
  }, [inviteToken]);

  const handlePostAuthRedirect = (planId?: string) => {
    if (redirectToCheckout && planId && ['essencial', 'pro', 'business'].includes(planId)) {
      const cycle = searchParams.get('cycle') || 'annual';
      const mode = searchParams.get('mode') || 'immediate';
      navigate(`/checkout?plan=${planId}&cycle=${cycle}&mode=${mode}`);
    } else if (planId && ['essencial', 'pro', 'business'].includes(planId)) {
      navigate(`/checkout?plan=${planId}&cycle=annual`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !z.string().email().safeParse(resetEmail).success) {
      toast({ title: 'Email inválido', description: 'Por favor, insira um email válido.', variant: 'destructive' });
      return;
    }
    try {
      setResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: `${SITE_URL}/reset-password` });
      if (error) throw error;
      toast({ title: 'Email enviado!', description: 'Verifique sua caixa de entrada para redefinir sua senha.' });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast({ title: 'Erro ao enviar email', description: error.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setPopupBlocked(false);
    try {
      setGoogleLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${SITE_URL}/auth/callback`, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No auth URL returned');

      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(data.url, 'google-auth', `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);

      if (!popup || popup.closed) {
        setGoogleLoading(false);
        setPopupBlocked(true);
        return;
      }

      const pollInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollInterval);
          setTimeout(() => setGoogleLoading(false), 1500);
        }
      }, 500);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          clearInterval(pollInterval);
          subscription.unsubscribe();
          if (!popup.closed) popup.close();
          if (inviteToken) {
            handleAcceptInvite().then(() => navigate('/dashboard'));
          } else if (pendingPlan && ['essencial', 'pro', 'business'].includes(pendingPlan)) {
            handlePostAuthRedirect(pendingPlan || undefined);
          } else {
            navigate('/dashboard');
          }
        }
      });
    } catch (error: any) {
      const msg = error?.message?.toLowerCase() || '';
      let title = 'Erro ao entrar com Google';
      let description = 'Não foi possível conectar com o Google. Tente novamente.';
      if (msg.includes('popup') || msg.includes('closed')) { title = 'Login cancelado'; description = 'A janela de login do Google foi fechada. Tente novamente.'; }
      else if (msg.includes('network') || msg.includes('fetch')) { title = 'Erro de conexão'; description = 'Verifique sua conexão com a internet e tente novamente.'; }
      else if (msg.includes('403') || msg.includes('forbidden')) { title = 'Acesso negado'; description = 'O login com Google não está disponível no momento. Tente via email e senha.'; }
      toast({ title, description, variant: 'destructive' });
      setGoogleLoading(false);
    }
  };

  const handleGoogleLoginRedirect = async () => {
    try {
      setGoogleLoading(true);
      setPopupBlocked(false);
      const redirectUrl = pendingPlan && ['essencial', 'pro', 'business'].includes(pendingPlan)
        ? `${SITE_URL}/?checkout_plan=${pendingPlan}` : `${SITE_URL}/`;
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: 'Erro ao entrar com Google', description: error.message, variant: 'destructive' });
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      loginSchema.parse(loginForm);
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email: loginForm.email, password: loginForm.password });
      if (error) throw error;
      toast({ title: 'Login realizado!', description: 'Bem-vindo de volta.' });
      if (inviteToken) await handleAcceptInvite();
      if (pendingPlan && ['essencial', 'pro', 'business'].includes(pendingPlan)) {
        handlePostAuthRedirect(pendingPlan);
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Erro de validação', description: error.errors[0].message, variant: 'destructive' });
      } else {
        const friendlyError = getAuthErrorMessage(error);
        toast({ title: friendlyError.title, description: friendlyError.description, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Validate all fields at once
    const result = signupSchema.safeParse({
      email: signupForm.email,
      password: signupForm.password,
      confirmPassword: signupForm.confirmPassword,
      fullName: signupForm.fullName,
      phone: signupForm.phone,
      personType: signupForm.personType,
      cpf: signupForm.cpf,
      cnpj: signupForm.cnpj,
      businessName: signupForm.businessName,
      creci: signupForm.creci
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((e) => { if (e.path[0]) errors[String(e.path[0])] = e.message; });
      setFieldErrors(errors);
      // Find the first error field and scroll to it
      const firstKey = Object.keys(errors)[0];
      if (firstKey) {
        const el = document.getElementById(`signup-${firstKey}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!acceptedTerms) {
      toast({ title: 'Termos não aceitos', description: 'Aceite os Termos de Uso para continuar.', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      // Anti-spam
      try {
        const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-signup', {
          body: { email: signupForm.email, honeypot, formLoadTime }
        });
        if (!validationError && validationResult && !validationResult.allowed) {
          toast({ title: 'Não foi possível criar conta', description: validationResult.message || 'Tente novamente mais tarde.', variant: 'destructive' });
          setLoading(false);
          return;
        }
      } catch { /* fail open */ }

      const redirectUrl = invitation ? `${SITE_URL}/auth?token=${inviteToken}` : `${SITE_URL}/`;
      const { data, error } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupForm.fullName,
            phone: signupForm.phone,
            company_name: signupForm.personType === 'pj' ? signupForm.businessName : signupForm.companyName,
            creci: signupForm.creci,
            person_type: signupForm.personType,
            cpf: signupForm.personType === 'pf' ? signupForm.cpf.replace(/\D/g, '') : null,
            cnpj: signupForm.personType === 'pj' ? signupForm.cnpj.replace(/\D/g, '') : null,
            business_name: signupForm.personType === 'pj' ? signupForm.businessName : null,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0'
          }
        }
      });
      if (error) throw error;

      if (data.user) {
        const now = new Date().toISOString();
        const profileUpdate: Record<string, any> = {
          accepted_terms: true,
          terms_accepted_at: now,
          terms_version: '1.0',
          person_type: signupForm.personType,
        };
        if (signupForm.personType === 'pf') {
          profileUpdate.cpf = signupForm.cpf.replace(/\D/g, '');
        } else {
          profileUpdate.cnpj = signupForm.cnpj.replace(/\D/g, '');
          profileUpdate.business_name = signupForm.businessName;
        }
        await supabase.from('profiles').update(profileUpdate).eq('id', data.user.id);
        await supabase.from('consent_logs').insert({
          user_id: data.user.id,
          consent_type: 'terms_and_privacy',
          terms_version: '1.0',
          user_agent: navigator.userAgent,
          accepted_at: now,
        });
      }

      if (data.user && !data.session) {
        setPendingVerificationEmail(signupForm.email);
        setShowVerificationMessage(true);
        setSignupForm({ email: '', password: '', confirmPassword: '', fullName: '', phone: '', companyName: '', creci: '', personType: 'pf', cpf: '', cnpj: '', businessName: '' });
        setAcceptedTerms(false);
      } else {
        if (inviteToken) await handleAcceptInvite();
        trackLeadSignup(pendingPlan || 'organic');
        trackStartTrial(pendingPlan || 'start');
        toast({ title: 'Conta criada!', description: 'Sua conta foi criada com sucesso.' });
        if (pendingPlan && ['essencial', 'pro', 'business'].includes(pendingPlan)) {
          handlePostAuthRedirect(pendingPlan);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Erro de validação', description: error.errors[0].message, variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao criar conta', description: error.message || 'Tente novamente', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const result = completeProfileSchema.safeParse({
      personType: signupForm.personType,
      cpf: signupForm.cpf,
      cnpj: signupForm.cnpj,
      businessName: signupForm.businessName,
      creci: signupForm.creci,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((e) => { if (e.path[0]) errors[String(e.path[0])] = e.message; });
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada');
      const profileUpdate: Record<string, any> = { person_type: signupForm.personType };
      if (signupForm.personType === 'pf') {
        profileUpdate.cpf = signupForm.cpf.replace(/\D/g, '');
      } else {
        profileUpdate.cnpj = signupForm.cnpj.replace(/\D/g, '');
        profileUpdate.business_name = signupForm.businessName;
      }
      if (signupForm.creci) profileUpdate.creci = signupForm.creci;
      const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Cadastro completo!', description: 'Seus dados fiscais foram salvos.' });
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({ type: 'signup', email: pendingVerificationEmail, options: { emailRedirectTo: `${SITE_URL}/` } });
      if (error) throw error;
      toast({ title: 'Email reenviado!', description: 'Verifique sua caixa de entrada.' });
    } catch (error: any) {
      toast({ title: 'Erro ao reenviar', description: error.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───

  const renderVerificationMessage = () => (
    <div className="space-y-4 text-center py-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-semibold">Verifique seu email</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviamos um link de verificação para{' '}
          <span className="font-medium text-foreground">{pendingVerificationEmail}</span>.
        </p>
      </div>
      <div className="space-y-2">
        <Button variant="outline" className="w-full" onClick={handleResendVerification} disabled={loading}>
          {loading ? 'Reenviando...' : 'Reenviar email de verificação'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => { setShowVerificationMessage(false); setPendingVerificationEmail(''); setActiveTab('login'); }}>
          Voltar ao login
        </Button>
      </div>
    </div>
  );

  const renderSignupForm = () => (
    <form onSubmit={handleSignup} className="space-y-4">
      {invitation && (
        <Alert className="border-primary/30 bg-primary/5">
          <UserPlus className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>{invitation.invited_by_name}</strong> convidou você para a equipe.
          </AlertDescription>
        </Alert>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="signup-fullName">Nome Completo</Label>
        <Input
          id="signup-fullName"
          type="text"
          placeholder="Seu nome completo"
          value={signupForm.fullName}
          onChange={e => setSignupForm({ ...signupForm, fullName: e.target.value })}
          className={fieldErrors.fullName ? 'border-destructive' : ''}
          required
        />
        {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="seu@email.com"
          value={signupForm.email}
          onChange={e => !invitation && setSignupForm({ ...signupForm, email: e.target.value })}
          readOnly={!!invitation}
          className={`${invitation ? 'bg-muted cursor-not-allowed' : ''} ${fieldErrors.email ? 'border-destructive' : ''}`}
          required
        />
        {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
        {invitation && <p className="text-xs text-muted-foreground">Email bloqueado — deve corresponder ao convite.</p>}
      </div>




      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="signup-phone">Telefone <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <Input
          id="signup-phone"
          type="tel"
          placeholder="(00) 00000-0000"
          value={signupForm.phone}
          onChange={e => setSignupForm({ ...signupForm, phone: formatPhone(e.target.value) })}
        />
      </div>

      {/* Person type toggle */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <Label className="text-sm font-medium">Tipo de pessoa</Label>
        <div className="flex items-center justify-between">
          <span className={`text-sm ${signupForm.personType === 'pf' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            Pessoa Física (CPF)
          </span>
          <Switch
            checked={signupForm.personType === 'pj'}
            onCheckedChange={checked => setSignupForm({ ...signupForm, personType: checked ? 'pj' : 'pf' })}
          />
          <span className={`text-sm ${signupForm.personType === 'pj' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            Pessoa Jurídica (CNPJ)
          </span>
        </div>
      </div>

      {/* CPF or CNPJ fields */}
      <AnimatePresence mode="wait">
        {signupForm.personType === 'pf' ? (
          <motion.div
            key="pf"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 overflow-hidden"
          >
            <Label htmlFor="signup-cpf">CPF</Label>
            <Input
              id="signup-cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={signupForm.cpf}
              onChange={e => setSignupForm({ ...signupForm, cpf: formatCPF(e.target.value) })}
              className={fieldErrors.cpf ? 'border-destructive' : ''}
              required
            />
            {fieldErrors.cpf && <p className="text-xs text-destructive">{fieldErrors.cpf}</p>}
          </motion.div>
        ) : (
          <motion.div
            key="pj"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="space-y-2">
              <Label htmlFor="signup-cnpj">CNPJ</Label>
              <Input
                id="signup-cnpj"
                type="text"
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                value={signupForm.cnpj}
                onChange={e => setSignupForm({ ...signupForm, cnpj: formatCNPJ(e.target.value) })}
                className={fieldErrors.cnpj ? 'border-destructive' : ''}
                required
              />
              {fieldErrors.cnpj && <p className="text-xs text-destructive">{fieldErrors.cnpj}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-businessName">Razão Social / Nome da Imobiliária</Label>
              <Input
                id="signup-businessName"
                type="text"
                placeholder="Ex: Imobiliária Premium LTDA"
                value={signupForm.businessName}
                onChange={e => setSignupForm({ ...signupForm, businessName: e.target.value })}
                className={fieldErrors.businessName ? 'border-destructive' : ''}
                required
              />
              {fieldErrors.businessName && <p className="text-xs text-destructive">{fieldErrors.businessName}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRECI */}
      <div className="space-y-2">
        <Label htmlFor="signup-creci">CRECI <span className="text-muted-foreground font-normal">(opcional)</span></Label>
        <Input
          id="signup-creci"
          type="text"
          placeholder="Opcional"
          value={signupForm.creci}
          onChange={e => setSignupForm({ ...signupForm, creci: e.target.value })}
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="signup-password">Senha</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={signupForm.password}
          onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
          className={fieldErrors.password ? 'border-destructive' : ''}
          required
        />
        {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="signup-confirmPassword">Confirmar Senha</Label>
        <Input
          id="signup-confirmPassword"
          type="password"
          placeholder="Digite a senha novamente"
          value={signupForm.confirmPassword}
          onChange={e => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
          onPaste={e => e.preventDefault()}
          className={fieldErrors.confirmPassword ? 'border-destructive' : ''}
          required
        />
        {fieldErrors.confirmPassword && <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
      </div>


      <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
        <Label htmlFor="signup-website">Website</Label>
        <Input id="signup-website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
      </div>

      {/* Terms */}
      <div className="flex items-start space-x-2">
        <Checkbox id="accept-terms" checked={acceptedTerms} onCheckedChange={checked => setAcceptedTerms(checked as boolean)} className="mt-0.5" />
        <Label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
          Li e aceito os{' '}
          <Link to="/legal?tab=terms" className="text-primary hover:underline font-medium" target="_blank">Termos de Uso</Link>{' '}
          e a{' '}
          <Link to="/legal?tab=privacy" className="text-primary hover:underline font-medium" target="_blank">Política de Privacidade</Link>
          {' '}da SlotiMob, incluindo o uso de automação de mensagens via WhatsApp.
        </Label>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full h-11" disabled={loading || !acceptedTerms}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Criar minha conta'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Você receberá um email para verificar sua conta.
      </p>
    </form>
  );

  // ─── Main render ───

  return (
    <>
      {googleLoading && <OAuthLoadingOverlay />}
      <SEOHead title="Login e Cadastro" description="Acesse sua conta SLOTIMOB ou crie uma nova conta para gerenciar seus imóveis e leads" path="/auth" />

      <div className="flex min-h-[100dvh]">
        {/* Left column - informational (hidden on mobile) */}
        <motion.div layout transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} className={`hidden lg:flex flex-col justify-between p-10 xl:p-16 bg-primary text-primary-foreground relative overflow-hidden ${activeTab === 'login' ? 'lg:w-1/2 xl:w-[55%]' : 'lg:w-[45%] xl:w-[50%]'}`}>
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5" />
          <div className="absolute bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-1/4 h-32 w-32 rounded-full bg-white/[0.03]" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <SlotiLogo size="md" />
              <span className="text-2xl font-bold tracking-tight">SLOTIMOB</span>
            </div>
            <p className="text-sm text-primary-foreground/70">Sistema de gestão imobiliária</p>
          </div>

          <div className="relative z-10 space-y-8">
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
              Gerencie seus imóveis,<br />leads e finanças<br />em um só lugar.
            </h1>
            <div className="space-y-4">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                    <b.icon className="h-5 w-5 text-primary-foreground/80" />
                  </div>
                  <span className="text-sm font-medium text-primary-foreground/90">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} SLOTIMOB. Todos os direitos reservados.
          </p>
        </motion.div>

        {/* Right column - form (scrollable) */}
        <motion.div layout transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} className={`relative flex w-full bg-background ${activeTab === 'login' ? 'lg:w-1/2 xl:w-[45%]' : 'lg:w-[55%] xl:w-[50%]'}`}>
          <Link to="/" className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>

          <div className="w-full overflow-y-auto max-h-[100dvh] flex items-start justify-center p-6 sm:p-10 pt-14 sm:pt-16">
            <motion.div
              layout
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-md space-y-6 py-4"
            >
              {/* Mobile logo */}
              <div className="flex flex-col items-center lg:hidden mb-2">
                <SlotiLogo size="lg" />
                <h2 className="text-xl font-bold mt-2">SLOTIMOB</h2>
                <p className="text-xs text-muted-foreground">Sistema de gestão imobiliária</p>
              </div>

              {isCompleteProfileMode ? (
                <form onSubmit={handleCompleteProfile} className="space-y-5">
                  <Alert className="border-primary/30 bg-primary/5">
                    <UserPlus className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Bem-vindo! Para concluir seu cadastro e emitirmos suas notas fiscais, preencha os dados abaixo.
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <Label className="text-sm font-medium">Tipo de pessoa</Label>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${signupForm.personType === 'pf' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        Pessoa Física (CPF)
                      </span>
                      <Switch
                        checked={signupForm.personType === 'pj'}
                        onCheckedChange={checked => setSignupForm({ ...signupForm, personType: checked ? 'pj' : 'pf' })}
                      />
                      <span className={`text-sm ${signupForm.personType === 'pj' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        Pessoa Jurídica (CNPJ)
                      </span>
                    </div>
                  </div>

                  {signupForm.personType === 'pf' ? (
                    <div className="space-y-2">
                      <Label htmlFor="complete-cpf">CPF</Label>
                      <Input id="complete-cpf" type="text" inputMode="numeric" placeholder="000.000.000-00" value={signupForm.cpf}
                        onChange={e => setSignupForm({ ...signupForm, cpf: formatCPF(e.target.value) })}
                        className={fieldErrors.cpf ? 'border-destructive' : ''} required />
                      {fieldErrors.cpf && <p className="text-xs text-destructive">{fieldErrors.cpf}</p>}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="complete-cnpj">CNPJ</Label>
                        <Input id="complete-cnpj" type="text" inputMode="numeric" placeholder="00.000.000/0000-00" value={signupForm.cnpj}
                          onChange={e => setSignupForm({ ...signupForm, cnpj: formatCNPJ(e.target.value) })}
                          className={fieldErrors.cnpj ? 'border-destructive' : ''} required />
                        {fieldErrors.cnpj && <p className="text-xs text-destructive">{fieldErrors.cnpj}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complete-business-name">Razão Social / Nome da Imobiliária</Label>
                        <Input id="complete-business-name" type="text" placeholder="Ex: Imobiliária Premium LTDA" value={signupForm.businessName}
                          onChange={e => setSignupForm({ ...signupForm, businessName: e.target.value })}
                          className={fieldErrors.businessName ? 'border-destructive' : ''} required />
                        {fieldErrors.businessName && <p className="text-xs text-destructive">{fieldErrors.businessName}</p>}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="complete-creci">CRECI <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Input id="complete-creci" type="text" placeholder="Opcional" value={signupForm.creci}
                      onChange={e => setSignupForm({ ...signupForm, creci: e.target.value })} />
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Concluir Cadastro'}
                  </Button>
                </form>
              ) : showVerificationMessage ? (
                renderVerificationMessage()
              ) : (
                <>
                  {/* Google OAuth */}
                  <Button type="button" variant="outline" className="w-full h-12 gap-2 text-sm font-medium" onClick={handleGoogleLogin} disabled={googleLoading || loading}>
                    {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                    {googleLoading ? 'Conectando...' : 'Continuar com Google'}
                  </Button>

                  {popupBlocked && (
                    <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                      <AlertDescription className="text-sm">
                        Janela de autenticação bloqueada.{' '}
                        <button type="button" className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80" onClick={handleGoogleLoginRedirect}>
                          Clique aqui para prosseguir
                        </button>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-3 text-muted-foreground">ou continue com email</span>
                    </div>
                  </div>

                  {invitation ? (
                    // Invitation flow: keep signup form
                    <motion.div
                      key="signup"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {renderSignupForm()}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {showForgotPassword ? (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input id="reset-email" type="email" placeholder="seu@email.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                          </div>
                          <p className="text-xs text-muted-foreground">Você receberá um link para redefinir sua senha.</p>
                          <Button type="submit" className="w-full" disabled={resetLoading}>
                            {resetLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : 'Enviar link de recuperação'}
                          </Button>
                          <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>Voltar ao login</Button>
                        </form>
                      ) : (
                        <form onSubmit={handleLogin} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <Input id="login-email" type="email" placeholder="seu@email.com" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} required />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="login-password">Senha</Label>
                              <Button type="button" variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary" onClick={() => setShowForgotPassword(true)}>
                                Esqueceu a senha?
                              </Button>
                            </div>
                            <Input id="login-password" type="password" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
                          </div>
                          <Button type="submit" className="w-full h-11" disabled={loading || googleLoading}>
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
                          </Button>
                        </form>
                      )}

                      <div className="mt-6 text-center text-sm text-muted-foreground">
                        Ainda não tem conta?{' '}
                        <Link to="/checkout" className="text-primary font-medium hover:underline">
                          Comece grátis com 7 dias de PRO →
                        </Link>
                      </div>
                    </motion.div>
                  )}

                  <div className="text-center pt-2 space-x-3">
                    <Link to="/legal?tab=privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      Política de Privacidade
                    </Link>
                    <Link to="/legal?tab=terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      Termos de Uso
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Auth;
