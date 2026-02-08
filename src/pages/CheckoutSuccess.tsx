import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simulate a small delay to let the webhook process
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

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
          <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">Próximos passos</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>✓ Configure seu perfil de corretor</li>
              <li>✓ Adicione seus primeiros imóveis</li>
              <li>✓ Importe seus contatos</li>
              <li>✓ Explore todas as funcionalidades</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Ir para o Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/settings')}
              className="w-full"
            >
              Configurar Perfil
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Um email de confirmação foi enviado para você com os detalhes da sua assinatura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
