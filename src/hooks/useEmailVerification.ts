import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const queryClient = useQueryClient();

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
        await queryClient.invalidateQueries({ queryKey: ['email-verified'] });
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
  }, [onVerified, queryClient]);

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
          await queryClient.invalidateQueries({ queryKey: ['email-verified'] });
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
    [onVerified, queryClient]
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

/**
 * Status de verificação de e-mail lido de `profiles.email_verified_at`.
 * Em erro, `isVerified` fica `false` (o usuário pode pedir código; a edge
 * function responde `already_verified` se já estiver verificado).
 */
export function useEmailVerifiedStatus() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['email-verified', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('email_verified_at')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) return null;
      return data?.email_verified_at ?? null;
    },
  });

  return {
    isVerified: !!data,
    verifiedAt: (data as string | null) ?? null,
    isLoading,
    refetch,
  };
}
