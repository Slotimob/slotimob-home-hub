import { MessageCircle } from 'lucide-react';

const WHATSAPP_LINK =
  'https://wa.me/554137987325?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20Slotimob%20e%20queria%20saber%20mais.';

export function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale com a Slotimob no WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-colors duration-200"
    >
      <span className="absolute inset-0 rounded-full bg-green-500 opacity-40 animate-ping" />
      <MessageCircle className="h-7 w-7 relative" fill="currentColor" />
    </a>
  );
}
