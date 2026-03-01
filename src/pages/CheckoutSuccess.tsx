import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles, Mail, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Processando sua assinatura...</p>
              <p className="text-sm text-muted-foreground">
                Aguarde enquanto confirmamos seu pagamento.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Assinatura Confirmada!</CardTitle>
          <CardDescription>
            Bem-vindo ao Sloti! Sua assinatura foi ativada com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Guest checkout notice */}
          {isGuest && !isLoggedIn && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                <Mail className="h-5 w-5" />
                <span className="font-semibold">Verifique seu e-mail!</span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400/80">
                Enviamos um link para você definir sua senha de acesso. Confira sua caixa de entrada e spam.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">Próximos passos</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              {isGuest && !isLoggedIn && (
                <li>✓ Defina sua senha pelo link enviado no e-mail</li>
              )}
              <li>✓ Configure seu perfil de corretor</li>
              <li>✓ Adicione seus primeiros imóveis</li>
              <li>✓ Importe seus contatos</li>
              <li>✓ Explore todas as funcionalidades</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={handleAccess} className="w-full">
              {isLoggedIn ? (
                <>Ir para o Dashboard</>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Acessar Minha Conta
                </>
              )}
            </Button>
            {isLoggedIn && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/settings')}
                className="w-full"
              >
                Configurar Perfil
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Um email de confirmação foi enviado para você com os detalhes da sua assinatura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}