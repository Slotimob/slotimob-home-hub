// Shared WhatsApp support number used across all CTAs/support buttons.
export const WHATSAPP_SUPPORT_NUMBER = '554137987325';

export function buildWhatsAppLink(text: string): string {
  return `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(text)}`;
}
