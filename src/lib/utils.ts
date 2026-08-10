import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes a file name so it can be safely used inside a Supabase Storage
 * object key (S3-compatible). Removes diacritics and any character outside
 * [a-zA-Z0-9._-]. Only use for the storage key — keep the original name for display.
 */
export function sanitizeStorageFileName(name: string): string {
  const raw = (name ?? '').trim();
  const match = raw.match(/\.([a-zA-Z0-9]{1,10})$/);
  const ext = match ? match[1].toLowerCase() : '';
  const rawBase = match ? raw.slice(0, -(match[0].length)) : raw;

  let base = rawBase
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)
    .replace(/[-.]+$/g, '');

  if (!base) base = 'arquivo';

  return ext ? `${base}.${ext}` : base;
}

export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  // Add Brazil country code if missing
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }

  // 9th digit rule: DDDs 11-28 (São Paulo & surrounding) use 9-digit mobiles,
  // but WhatsApp's canonical JID often drops the leading 9.
  // If we have 55 + 2-digit DDD + 9 digits (13 total), and DDD is 11–28,
  // remove the 9th digit (first digit after DDD) to match the canonical format.
  // 9th digit rule: All Brazilian mobile numbers now use the 9th digit,
  // but WhatsApp's canonical JID often drops it. If we have 55 + 2-digit DDD
  // + 9 digits (13 total) and the first digit after DDD is '9', remove it.
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const fifthChar = cleaned.charAt(4);
    if (fifthChar === '9') {
      cleaned = cleaned.substring(0, 4) + cleaned.substring(5);
    }
  }

  return cleaned;
}

/**
 * Converts a WhatsApp JID/phone (e.g. +5511988887777, 5511988887777)
 * into CRM-friendly format: just DDD + number (e.g. 11988887777).
 * Removes country code 55 and any non-digit chars.
 */
export function formatWhatsAppToCrm(phone?: string | null): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  // Remove Brazilian country code prefix
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.substring(2);
  }
  return digits;
}

export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

export function sanitizeGalleryUrls(urls?: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();

  return (urls ?? [])
    .filter((url): url is string => typeof url === 'string')
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .filter((url) => /^https?:\/\//i.test(url))
    .filter((url) => !url.includes('undefined') && !url.includes('null'))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}
