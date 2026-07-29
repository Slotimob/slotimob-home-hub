/**
 * Traduz erros de captcha (Cloudflare Turnstile via Supabase) para pt-BR.
 * Retorna null quando o erro NÃO é de captcha, para que o tratamento
 * de erro existente da tela siga normalmente.
 */
export function translateCaptchaError(error: unknown): string | null {
  let raw = '';

  if (typeof error === 'string') {
    raw = error;
  } else if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown; error_description?: unknown; error?: unknown };
    raw = [maybe.message, maybe.error_description, maybe.error].filter((v) => typeof v === 'string').join(' ');
  }

  if (!raw) return null;
  const m = raw.toLowerCase();

  if (m.includes('timeout-or-duplicate')) {
    return 'A verificação de segurança expirou. Ela foi renovada automaticamente: confirme o "Não sou um robô" novamente e clique em continuar.';
  }

  if (m.includes('missing-input-response')) {
    return 'Complete a verificação de segurança antes de continuar.';
  }

  if (
    m.includes('captcha verification process failed') ||
    m.includes('invalid-input-response') ||
    m.includes('captcha protection')
  ) {
    return 'Não foi possível validar a verificação de segurança. Confirme o "Não sou um robô" novamente e tente de novo.';
  }

  return null;
}
