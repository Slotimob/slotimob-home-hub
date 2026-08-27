import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const RESEND_COOLDOWN_SECONDS = 60;

interface UseEmailVerificationOptions {
  onVerified?: () => void;
}

/**
 * Lógica do passo de verificação de e-mail no checkout.
 * As edge functions respondem HTTP 200 mesmo em erro, com `{ error }` no body,
 * por isso tratamos `data?.error` explicitamente.
 */
export function useEmailVerification({ onVerified }: UseEmailVerificationOptions = {}) {
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const autoSentRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendCode = useCallback(async (): Promise<boolean> => {
    setIsSending(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-email-verification');

      if (fnError) {
        setError('Não foi possível enviar o código. Tente novamente.');
        return false;
      }
      if (data?.error) {
        setError(data.error);
        return false;
      }
      if (data?.already_verified) {
        onVerified?.();
        return true;
      }

      setCooldown(RESEND_COOLDOWN_SECONDS);
      return true;
    } catch {
      setError('Não foi possível enviar o código. Tente novamente.');
      return false;
    } finally {
      setIsSending(false);
    }
  }, [onVerified]);

  /** Dispara o primeiro envio uma única vez (seguro em StrictMode). */
  const sendCodeOnce = useCallback(() => {
    if (autoSentRef.current) return;
    autoSentRef.current = true;
    void sendCode();
  }, [sendCode]);

  const verifyCode = useCallback(
    async (code: string): Promise<boolean> => {
      setIsVerifying(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('verify-email-code', {
          body: { code },
        });

        if (fnError) {
          setError('Não foi possível validar o código. Tente novamente.');
          return false;
        }
        if (data?.error) {
          setError(data.error);
          return false;
        }
        if (data?.success) {
          onVerified?.();
          return true;
        }
        setError('Não foi possível validar o código. Tente novamente.');
        return false;
      } catch {
        setError('Não foi possível validar o código. Tente novamente.');
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [onVerified]
  );

  return {
    isSending,
    isVerifying,
    error,
    setError,
    cooldown,
    sendCode,
    sendCodeOnce,
    verifyCode,
  };
}
