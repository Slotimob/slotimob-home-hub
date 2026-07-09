import { z } from 'zod';

/**
 * Shared password policy (client-side).
 * Requirements: minimum 8 characters, at least 1 uppercase letter, at least 1 number.
 *
 * The Supabase Auth dashboard should be configured to match or exceed this policy;
 * this schema guarantees weak passwords are blocked before hitting the backend.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'A senha precisa ter no mínimo 8 caracteres' })
  .regex(/[A-Z]/, { message: 'A senha precisa ter pelo menos 1 letra maiúscula' })
  .regex(/[0-9]/, { message: 'A senha precisa ter pelo menos 1 número' });

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Mínimo 8 caracteres, com pelo menos 1 letra maiúscula e 1 número.';

/**
 * Validates a password and returns the first failing message, or null if valid.
 * Useful for imperative flows (non-react-hook-form) that just need one error string.
 */
export function validatePassword(value: string): string | null {
  const result = passwordSchema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? PASSWORD_REQUIREMENTS_MESSAGE;
}
