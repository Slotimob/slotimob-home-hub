import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MfaEnrollResult {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

/** Converte qualquer erro da API em mensagem amigável em português. */
export function translateMfaError(error: unknown): string {
  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : '';
  const m = raw.toLowerCase();

  if (
    m.includes('invalid totp code') ||
    m.includes('invalid code') ||
    m.includes('expired') ||
    m.includes('code is invalid') ||
    m.includes('invalid_code')
  ) {
    return 'Código inválido ou expirado. Gere um novo código no seu app e tente novamente.';
  }

  if (
    m.includes('too many requests') ||
    m.includes('rate limit') ||
    m.includes('over_request_rate_limit') ||
    m.includes('429')
  ) {
    return 'Muitas tentativas. Aguarde um instante e tente novamente.';
  }

  return 'Não foi possível concluir a operação. Tente novamente.';
}

export function useMfa() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mfa-factors'],
    queryFn: async (): Promise<MfaFactor[]> => {
      const { data: result, error } = await supabase.auth.mfa.listFactors();
      if (error) throw new Error(translateMfaError(error));
      return (result?.totp ?? []) as MfaFactor[];
    },
    staleTime: 30_000,
  });

  const factors: MfaFactor[] = data ?? [];
  const verifiedFactor = factors.find((f) => f.status === 'verified') ?? null;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });
  }, [queryClient]);

  const enroll = useCallback(async (friendlyName: string): Promise<MfaEnrollResult> => {
    const { data: result, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });
    if (error || !result) throw new Error(translateMfaError(error));
    return {
      factorId: result.id,
      qrCode: result.totp.qr_code,
      secret: result.totp.secret,
      uri: result.totp.uri,
    };
  }, []);

  const verifyEnrollment = useCallback(
    async (factorId: string, code: string): Promise<void> => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw new Error(translateMfaError(error));
      invalidate();
    },
    [invalidate],
  );

  const unenroll = useCallback(
    async (factorId: string): Promise<void> => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw new Error(translateMfaError(error));
      invalidate();
    },
    [invalidate],
  );

  return {
    factors,
    verifiedFactor,
    hasVerifiedFactor: !!verifiedFactor,
    isLoading,
    enroll,
    verifyEnrollment,
    unenroll,
    refetch,
  };
}
