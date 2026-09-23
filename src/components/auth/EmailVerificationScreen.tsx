import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SlotiLogo } from '@/components/SlotiLogo';
import EmailVerificationStep from '@/components/checkout/EmailVerificationStep';

export const EmailVerificationScreen = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center space-y-3">
          <SlotiLogo size="md" />
          <CardTitle className="text-xl">Confirme seu e-mail para continuar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Para proteger sua conta, precisamos confirmar que este e-mail é seu. Digite o código de 6
            dígitos que enviamos.
          </p>
        </CardHeader>

        <CardContent>
          <EmailVerificationStep
            email={user?.email ?? ''}
            subtitle="Confirme para começar a usar a Slotimob"
            secondaryAction={
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Sair e usar outro e-mail
              </button>
            }
            onVerified={() => {
              // O hook já invalida ['email-verified']; o guard libera sozinho.
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerificationScreen;
