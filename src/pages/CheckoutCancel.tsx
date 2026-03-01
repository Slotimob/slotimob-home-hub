import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Checkout Cancelado</CardTitle>
          <CardDescription>
            Sua assinatura não foi processada. Nenhuma cobrança foi realizada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-amber-500/5 p-4 border border-amber-500/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Tem alguma dúvida?</strong>
              <br />
              Entre em contato conosco pelo chat ou email. Ficaremos felizes em ajudar!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/checkout?plan=pro&cycle=annual')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Planos
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Continuar com Plano Free
            </Button>
          </div>

          <div className="text-center">
            <Button variant="link" className="text-sm">
              <MessageCircle className="h-4 w-4 mr-1" />
              Precisa de ajuda? Fale conosco
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
