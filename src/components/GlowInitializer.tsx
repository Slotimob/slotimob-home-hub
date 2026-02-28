import { useEffect } from 'react';
import { cleanupExpiredDrafts } from '@/hooks/useFormDraft';

/**
 * Lightweight initializer for glow effect and draft cleanup.
 * Theme syncing from user profile is now handled inside AppLayout
 * so the landing page stays on its fixed dark theme.
 */
export function GlowInitializer() {
  useEffect(() => {
    cleanupExpiredDrafts();

    // Fix glow intensity at 50% — no user-configurable setting
    document.documentElement.style.setProperty('--glow-intensity', '0.5');
    document.documentElement.classList.remove('glow-disabled');
  }, []);

  return null;
}
