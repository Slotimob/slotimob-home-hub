import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const ddd = parseInt(cleaned.substring(2, 4), 10);
    if (ddd >= 11 && ddd <= 28) {
      // Remove the 5th character (index 4), which is the leading '9' after DDD
      cleaned = cleaned.substring(0, 4) + cleaned.substring(5);
    }
  }

  return cleaned;
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
