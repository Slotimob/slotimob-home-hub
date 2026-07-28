import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { translateMfaError } from '@/hooks/useMfa';

interface MfaChallengeFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export function MfaChallengeForm({
  onSuccess,
  onCancel,
  title = 'Verificação em duas etapas',
  description = 'Digite o código de 6 dígitos do seu aplicativo autenticador.',
}: MfaChallengeFormProps) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isPreparing, setIsPreparing] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createChallenge = useCallback(async (id: string) => {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId: id });
    if (error || !data) throw new Error(translateMfaError(error));
    return data.id;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      setIsPreparing(true);
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw new Error(translateMfaError(error));
        const verified = (data?.totp ?? []).find((f) => f.status === 'verified');
        if (!verified) {
          if (!cancelled) {
            setErrorMessage('Nenhum aplicativo autenticador configurado nesta conta.');
          }
          return;
        }
        const newChallengeId = await createChallenge(verified.id);
        if (cancelled) return;
        setFactorId(verified.id);
        setChallengeId(newChallengeId);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : translateMfaError(err));
        }
      } finally {
        if (!cancelled) setIsPreparing(false);
      }
    };

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [createChallenge]);

  const handleChange = async (value: string) => {
    setCode(value);
    setErrorMessage(null);
    if (value.length !== 6 || !factorId || !challengeId || isVerifying) return;

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: value });
      if (error) throw new Error(translateMfaError(error));
      onSuccess();
    } catch (err) {
      setCode('');
      setErrorMessage(err instanceof Error ? err.message : translateMfaError(err));
      try {
        const newChallengeId = await createChallenge(factorId);
        setChallengeId(newChallengeId);
      } catch {
        setErrorMessage('Não foi possível concluir a operação. Tente novamente.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {isPreparing ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparando verificação...
        </div>
      ) : (
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={handleChange}
            disabled={isVerifying || !challengeId}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      )}

      {isVerifying && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando código...
        </p>
      )}

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {onCancel && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isVerifying}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
