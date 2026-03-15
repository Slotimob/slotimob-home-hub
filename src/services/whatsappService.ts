import { supabase } from '@/integrations/supabase/client';

interface SendMessageOptions {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'document';
  /** Simulate composing presence before sending (milliseconds). Helps with anti-ban. */
  composingDelay?: number;
}

/**
 * Send a WhatsApp message with optional anti-ban composing simulation.
 * The composing event is sent to Evolution API before the actual message.
 */
export async function sendWhatsAppMessage({
  conversationId,
  content,
  messageType = 'text',
  composingDelay = 0,
}: SendMessageOptions) {
  // Step 1: Simulate composing presence if delay > 0
  if (composingDelay > 0) {
    try {
      await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId,
          action: 'composing',
        },
      });
      await new Promise((resolve) => setTimeout(resolve, composingDelay));
    } catch (e) {
      // Non-critical — continue sending even if composing fails
      console.warn('Composing simulation failed:', e);
    }
  }

  // Step 2: Send the actual message
  const { data, error } = await supabase.functions.invoke('whatsapp-send', {
    body: {
      conversationId,
      messageType,
      content: content.trim(),
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Calculate a human-like composing delay based on message length.
 * Returns milliseconds (min 800ms, max 4000ms).
 */
export function calculateComposingDelay(messageLength: number): number {
  // ~50ms per character, clamped between 800ms and 4s
  const base = messageLength * 50;
  return Math.max(800, Math.min(base, 4000));
}
