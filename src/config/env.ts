/**
 * Configuração central de variáveis públicas do client.
 *
 * Em desenvolvimento local: lê de import.meta.env.VITE_* (arquivo .env).
 * Em produção (build do Lovable): usa os fallbacks abaixo.
 *
 * Todos os valores aqui são PÚBLICOS por design:
 * - VITE_SUPABASE_URL: URL pública do projeto Supabase.
 * - VITE_SUPABASE_PUBLISHABLE_KEY: anon key, desenhada pra exposição
 *   no client (segurança real está na RLS do Supabase).
 * - VITE_STRIPE_PUBLISHABLE_KEY: chave publishable do Stripe,
 *   também pública por design.
 *
 * Chaves SECRETAS (Stripe secret, Resend, OpenAI) NUNCA vão aqui.
 * Elas vivem em Supabase Secrets e são acessadas apenas por
 * Edge Functions.
 */

// Fallbacks usados em produção (Lovable não tem painel de env vars).
// Atualize aqui quando trocar projeto Supabase ou conta Stripe.
const FALLBACK = {
  SUPABASE_PROJECT_ID: 'nelmmrqdiycmdhhslxfz',
  SUPABASE_URL: 'https://nelmmrqdiycmdhhslxfz.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbG1tcnFkaXljbWRoaHNseGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzM2NTEsImV4cCI6MjA4NjA0OTY1MX0.JguIpjztfrbKMiHQq66ltc2ZviexKR3lUTJ3LUbmpsA',
  STRIPE_PUBLISHABLE_KEY: 'pk_live_51Q5u5lAUMiQcSICyoXYGQDaUqDtsRJEdvJvz37ZwqZrv9rBaMKMofxgdMLnqsYPshyPJHTKpvFNBykaXjg19idLV00XVIh9BWF',
} as const;

function getEnv(key: string, fallback: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  if (value && value.length > 0) return value;
  return fallback;
}

export const ENV = {
  SUPABASE_PROJECT_ID: getEnv('VITE_SUPABASE_PROJECT_ID', FALLBACK.SUPABASE_PROJECT_ID),
  SUPABASE_URL: getEnv('VITE_SUPABASE_URL', FALLBACK.SUPABASE_URL),
  SUPABASE_PUBLISHABLE_KEY: getEnv('VITE_SUPABASE_PUBLISHABLE_KEY', FALLBACK.SUPABASE_PUBLISHABLE_KEY),
  STRIPE_PUBLISHABLE_KEY: getEnv('VITE_STRIPE_PUBLISHABLE_KEY', FALLBACK.STRIPE_PUBLISHABLE_KEY),
} as const;

// Em dev local, avisa se algum env estiver faltando (não bloqueia,
// só dá visibilidade).
if (import.meta.env.DEV) {
  Object.entries(FALLBACK).forEach(([key, fallback]) => {
    const envKey = `VITE_${key}`;
    const value = (import.meta.env as Record<string, string | undefined>)[envKey];
    if (!value && fallback) {
      console.info(`[env] ${envKey} não encontrado no .env, usando fallback.`);
    }
  });
}
