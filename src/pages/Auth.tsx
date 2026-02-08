import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { SlotiLogo } from '@/components/SlotiLogo';
import { Separator } from '@/components/ui/separator';
import { SEOHead } from '@/components/SEOHead';
import { toast as sonnerToast } from 'sonner';
const loginSchema = z.object({
  email: z.string().email({
    message: 'Email inválido'
  }),
  password: z.string().min(6, {
    message: 'Senha deve ter no mínimo 6 caracteres'
  })
});
const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, {
    message: 'Nome deve ter no mínimo 2 caracteres'
  }),
  phone: z.string().optional()
});

// Mapeamento de erros Supabase para mensagens amigáveis
const getAuthErrorMessage = (error: any): { title: string; description: string } => {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';

  // Erros de credenciais inválidas (senha errada ou email não existe)
  if (
    errorMessage.includes('invalid login credentials') ||
    errorMessage.includes('invalid credentials') ||
    errorCode === 'invalid_credentials'
  ) {
    return {
      title: 'Credenciais inválidas',
      description: 'Email ou senha incorretos. Verifique e tente novamente.'
    };
  }

  // Email não confirmado
  if (
    errorMessage.includes('email not confirmed') ||
    errorCode === 'email_not_confirmed'
  ) {
    return {
      title: 'Email não verificado',
      description: 'Verifique sua caixa de entrada e clique no link de confirmação.'
    };
  }

  // Muitas tentativas
  if (
    errorMessage.includes('too many requests') ||
    errorMessage.includes('rate limit') ||
    errorCode === 'over_request_rate_limit'
  ) {
    return {
      title: 'Muitas tentativas',
      description: 'Aguarde alguns minutos antes de tentar novamente.'
    };
  }

  // Usuário não encontrado (alguns provedores retornam isso)
  if (
    errorMessage.includes('user not found') ||
    errorCode === 'user_not_found'
  ) {
    return {
      title: 'Email não cadastrado',
      description: 'Este email não está registrado. Crie uma conta primeiro.'
    };
  }

  // Erro genérico
  return {
    title: 'Erro ao fazer login',
    description: error?.message || 'Verifique suas credenciais e tente novamente.'
  };
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingPlan = searchParams.get('plan'); // Capture plan intent from URL
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // Anti-spam: honeypot field (should remain empty)
  const [honeypot, setHoneypot] = useState('');
  // Anti-spam: track when form was loaded
  const [formLoadTime] = useState(() => Date.now());

  // Show intent message if user came from pricing
  useEffect(() => {
    if (pendingPlan && ['ouro', 'diamante'].includes(pendingPlan)) {
      const planName = pendingPlan === 'ouro' ? 'Ouro' : 'Diamante';
      sonnerToast.info(`Faça login ou crie uma conta para assinar o plano ${planName}`);
    }
  }, [pendingPlan]);

  // Function to handle post-auth checkout redirect
  const handlePostAuthCheckout = async (planId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan_id: planId }
      });

      if (error) {
        console.error('Checkout error:', error);
        sonnerToast.error('Erro ao iniciar checkout. Você pode tentar novamente na página de planos.');
        navigate('/dashboard');
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Post-auth checkout error:', err);
      navigate('/dashboard');
    }
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !z.string().email().safeParse(resetEmail).success) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive'
      });
      return;
    }
    try {
      setResetLoading(true);
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.'
      });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar email',
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setResetLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      // Preserve plan intent in OAuth redirect
      const redirectUrl = pendingPlan && ['ouro', 'diamante'].includes(pendingPlan)
        ? `${window.location.origin}/?checkout_plan=${pendingPlan}`
        : `${window.location.origin}/`;
      const {
        error
      } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Erro ao entrar com Google',
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setGoogleLoading(false);
    }
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      loginSchema.parse(loginForm);
      setLoading(true);
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });
      if (error) throw error;
      toast({
        title: 'Login realizado!',
        description: 'Bem-vindo de volta.'
      });
      
      // Check if user had a pending plan purchase intent
      if (pendingPlan && ['ouro', 'diamante'].includes(pendingPlan)) {
        await handlePostAuthCheckout(pendingPlan);
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive'
        });
      } else {
        const friendlyError = getAuthErrorMessage(error);
        toast({
          title: friendlyError.title,
          description: friendlyError.description,
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast({
        title: 'Termos não aceitos',
        description: 'Você precisa aceitar os Termos de Uso e Política de Privacidade para criar uma conta.',
        variant: 'destructive'
      });
      return;
    }
    try {
      signupSchema.parse(signupForm);
      setLoading(true);
      
      // Anti-spam validation via Edge Function
      try {
        const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-signup', {
          body: {
            email: signupForm.email,
            honeypot,
            formLoadTime
          }
        });

        if (validationError) {
          console.warn('Signup validation error:', validationError);
          // Fail open - continue with signup if validation service fails
        } else if (validationResult && !validationResult.allowed) {
          toast({
            title: 'Não foi possível criar conta',
            description: validationResult.message || 'Tente novamente mais tarde.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
      } catch (validationErr) {
        console.warn('Signup validation request failed:', validationErr);
        // Fail open - continue with signup
      }
      
      const redirectUrl = `${window.location.origin}/`;
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupForm.fullName,
            phone: signupForm.phone,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '1.0'
          }
        }
      });
      if (error) throw error;

      // If user was created, also update the profile with terms acceptance
      if (data.user) {
        await supabase.from('profiles').update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0'
        }).eq('id', data.user.id);
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is required
        setPendingVerificationEmail(signupForm.email);
        setShowVerificationMessage(true);
        setSignupForm({
          email: '',
          password: '',
          fullName: '',
          phone: ''
        });
        setAcceptedTerms(false);
      } else {
        toast({
          title: 'Conta criada!',
          description: 'Sua conta foi criada com sucesso.'
        });
        
        // Check if user had a pending plan purchase intent
        if (pendingPlan && ['ouro', 'diamante'].includes(pendingPlan)) {
          await handlePostAuthCheckout(pendingPlan);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro ao criar conta',
          description: error.message || 'Tente novamente',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };
  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    try {
      setLoading(true);
      const {
        error
      } = await supabase.auth.resend({
        type: 'signup',
        email: pendingVerificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
      toast({
        title: 'Email reenviado!',
        description: 'Verifique sua caixa de entrada.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao reenviar',
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const GoogleIcon = () => <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>;
  return (
    <>
      <SEOHead 
        title="Login e Cadastro"
        description="Acesse sua conta SLOTIMOB ou crie uma nova conta para gerenciar seus imóveis e leads"
        path="/auth"
      />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <SlotiLogo size="lg" />
          </div>
          <CardTitle className="text-2xl">SLOTIMOB</CardTitle>
          <CardDescription>
            Sistema de gestão de ativos imobiliários.                     
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showVerificationMessage ? <div className="space-y-4 text-center">
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
                  Clique no link para ativar sua conta.
                </p>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={handleResendVerification} disabled={loading}>
                  {loading ? 'Reenviando...' : 'Reenviar email de verificação'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => {
              setShowVerificationMessage(false);
              setPendingVerificationEmail('');
            }}>
                  Voltar ao login
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Após verificar seu email, você poderá fazer login e usar a recuperação de senha.
              </p>
            </div> : <>
              <div className="mb-4">
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={googleLoading || loading}>
                  <GoogleIcon />
                  {googleLoading ? 'Conectando...' : 'Continuar com Google'}
                </Button>
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    ou continue com email
                  </span>
                </div>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  {showForgotPassword ? <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input id="reset-email" type="email" placeholder="seu@email.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Se sua conta estiver verificada, você receberá um link para redefinir sua senha.
                      </p>
                      <Button type="submit" className="w-full" disabled={resetLoading}>
                        {resetLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                      </Button>
                      <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                        Voltar ao login
                      </Button>
                    </form> : <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input id="login-email" type="email" placeholder="seu@email.com" value={loginForm.email} onChange={e => setLoginForm({
                    ...loginForm,
                    email: e.target.value
                  })} required />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Senha</Label>
                          <Button type="button" variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary" onClick={() => setShowForgotPassword(true)}>
                            Esqueceu a senha?
                          </Button>
                        </div>
                        <Input id="login-password" type="password" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({
                    ...loginForm,
                    password: e.target.value
                  })} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                      </Button>
                    </form>}
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome Completo</Label>
                      <Input id="signup-name" type="text" placeholder="Seu nome" value={signupForm.fullName} onChange={e => setSignupForm({
                    ...signupForm,
                    fullName: e.target.value
                  })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupForm.email} onChange={e => setSignupForm({
                    ...signupForm,
                    email: e.target.value
                  })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Telefone (opcional)</Label>
                      <Input id="signup-phone" type="tel" placeholder="(00) 00000-0000" value={signupForm.phone} onChange={e => setSignupForm({
                    ...signupForm,
                    phone: e.target.value
                  })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input id="signup-password" type="password" placeholder="••••••••" value={signupForm.password} onChange={e => setSignupForm({
                    ...signupForm,
                    password: e.target.value
                  })} required />
                    </div>
                    {/* Honeypot field - hidden from users, bots will fill it */}
                    <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
                      <Label htmlFor="signup-website">Website</Label>
                      <Input 
                        id="signup-website" 
                        type="text" 
                        tabIndex={-1} 
                        autoComplete="off"
                        value={honeypot} 
                        onChange={e => setHoneypot(e.target.value)} 
                      />
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox id="accept-terms" checked={acceptedTerms} onCheckedChange={checked => setAcceptedTerms(checked as boolean)} className="mt-0.5" />
                      <Label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        Li e aceito os{' '}
                        <Link to="/legal" className="text-primary hover:underline font-medium" target="_blank">
                          Termos de Uso
                        </Link>{' '}
                        e a{' '}
                        <Link to="/legal" className="text-primary hover:underline font-medium" target="_blank">
                          Política de Privacidade
                        </Link>
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Você receberá um email para verificar sua conta antes de poder fazer login.
                    </p>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={
                        loading || 
                        googleLoading || 
                        !acceptedTerms || 
                        !signupForm.fullName.trim() || 
                        !signupForm.email.trim() || 
                        !signupForm.password.trim() ||
                        signupForm.password.length < 6
                      }
                    >
                      {loading ? 'Criando conta...' : 'Criar conta'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>}
        </CardContent>
        <CardFooter className="justify-center border-t pt-4">
          <Link to="/legal" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Política de Privacidade e Termos de Uso
          </Link>
        </CardFooter>
      </Card>
    </div>
    </>
  );
};
export default Auth;