import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles, Mail, LogIn, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const refreshSubscription = async () => {
      // Check auth state
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      // Detect guest checkout from URL or lack of session
      const guestParam = searchParams.get('guest');
      setIsGuest(guestParam === 'true' || !session);

      // Wait for webhook to process
      await new Promise((r) => setTimeout(r, 3000));

      // Invalidate all subscription-related caches
      queryClient.invalidateQueries({ queryKey: ['trial-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-details'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan-features'] });

      setIsLoading(false);
    };

    refreshSubscription();
  }, [sessionId, queryClient, searchParams]);

  const handleAccess = () => {
    if (isLoggedIn) {
      queryClient.invalidateQueries({ queryKey: ['trial-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-base font-medium text-foreground">Confirmando sua assinatura...</p>
          <p className="text-sm text-muted-foreground">Aguarde um instante.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-primary font-bold text-lg">Slotimob</Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Pagamento seguro via Asaas</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Success icon */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Assinatura ativada!</h1>
            <p className="text-muted-foreground mt-2">
              Bem-vindo ao Slotimob. Sua conta está pronta.
            </p>
          </div>

          {/* Guest email notice */}
          {isGuest && !isLoggedIn && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
                <Mail className="h-4 w-4" />
                <span className="font-semibold text-sm">Verifique seu e-mail</span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400/80">
                Enviamos um link para você definir sua senha de acesso. Verifique sua caixa de entrada e spam.
              </p>
            </div>
          )}

          {/* Next steps */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              Próximos passos
            </div>
            <ul className="space-y-2.5">
              {[
                isGuest && !isLoggedIn ? 'Defina sua senha pelo link enviado no e-mail' : null,
                'Configure seu perfil de proprietário',
                'Adicione seus primeiros imóveis',
                'Importe seus contatos e contratos',
                'Explore todas as funcionalidades',
              ]
                .filter(Boolean)
                .map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    {step}
                  </li>
                ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleAccess}
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12"
            >
              {isLoggedIn ? 'Ir para o Dashboard →' : (
                <><LogIn className="h-4 w-4 mr-2" />Acessar minha conta</>
              )}
            </Button>
            {isLoggedIn && (
              <Button variant="outline" onClick={() => navigate('/settings')} className="w-full">
                Configurar perfil
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Um e-mail de confirmação foi enviado com os detalhes da sua assinatura.
          </p>
        </div>
      </main>

      <footer className="border-t bg-card py-4">
        <p className="text-center text-xs text-muted-foreground">© Slotimob · Pagamento processado pelo Asaas</p>
      </footer>
    </div>
  );
}
