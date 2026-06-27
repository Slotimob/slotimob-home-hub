import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, MessageCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckoutCancel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Preserve plan/cycle from referrer if available
  const plan = searchParams.get('plan') || 'pro';
  const cycle = searchParams.get('cycle') || 'annual';

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-primary font-bold text-lg">Slotimob</Link>
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← Voltar ao site
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Pagamento seguro via Asaas</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Cancel icon */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Pagamento não finalizado</h1>
            <p className="text-muted-foreground mt-2">
              Nenhuma cobrança foi realizada.
            </p>
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Ficou com dúvidas?</span>
              {' '}Entre em contato pelo WhatsApp. Nossa equipe responde em minutos.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full h-12"
              onClick={() => navigate(`/checkout?plan=${plan}&cycle=${cycle}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open('https://wa.me/5511999999999?text=Olá, tenho dúvidas sobre os planos do Slotimob', '_blank')}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar no WhatsApp
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate('/dashboard')}
            >
              Continuar com plano gratuito
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t bg-card py-4">
        <p className="text-center text-xs text-muted-foreground">© Slotimob · Pagamento processado pelo Asaas</p>
      </footer>
    </div>
  );
}
