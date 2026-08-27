import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useEmailVerification } from '@/hooks/useEmailVerification';

interface EmailVerificationStepProps {
  email: string;
  onVerified: () => void;
}

export default function EmailVerificationStep({ email, onVerified }: EmailVerificationStepProps) {
  const [code, setCode] = useState('');

  const {
    isSending,
    isVerifying,
    error,
    setError,
    cooldown,
    sendCode,
    sendCodeOnce,
    verifyCode,
  } = useEmailVerification({
    onVerified: () => {
      toast.success('E-mail confirmado com sucesso!');
      onVerified();
    },
  });

  // Primeiro envio automático, uma única vez
  useEffect(() => {
    sendCodeOnce();
  }, [sendCodeOnce]);

  // Envio automático ao completar os 6 dígitos
  useEffect(() => {
    if (code.length !== 6 || isVerifying) return;
    void verifyCode(code).then((ok) => {
      if (!ok) setCode('');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleChange = (value: string) => {
    if (error) setError(null);
    setCode(value.replace(/\D/g, ''));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <MailCheck className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">Confirme seu e-mail</h3>
          <p className="text-xs text-muted-foreground">
            Passo obrigatório antes do pagamento
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-section px-4 py-3">
        <p className="text-xs text-muted-foreground">Enviamos um código de 6 dígitos para</p>
        <p className="text-sm font-semibold text-foreground break-all">{email}</p>
        <Link
          to="/settings"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          não é seu e-mail?
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={handleChange}
            disabled={isVerifying}
            inputMode="numeric"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="h-12 w-11 text-lg font-semibold text-foreground border-border bg-card"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {isVerifying && (
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Validando código...
          </p>
        )}

        {error && !isVerifying && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground"
          disabled={cooldown > 0 || isSending || isVerifying}
          onClick={() => {
            setCode('');
            void sendCode();
          }}
        >
          {isSending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
              Enviando...
            </>
          ) : cooldown > 0 ? (
            `Reenviar em ${cooldown}s`
          ) : (
            'Reenviar código'
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          O código expira em 10 minutos. Verifique também a caixa de spam.
        </p>
      </div>
    </div>
  );
}
