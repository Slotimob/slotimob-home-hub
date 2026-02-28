import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cleanupExpiredDrafts } from '@/hooks/useFormDraft';

export function GlowInitializer() {
  useEffect(() => {
    cleanupExpiredDrafts();

    // Fix glow intensity at 50% — no user-configurable setting
    document.documentElement.style.setProperty('--glow-intensity', '0.5');
    document.documentElement.classList.remove('glow-disabled');
  }, []);

  // Sync theme from profile to localStorage on auth (non-blocking)
  useEffect(() => {
    let cancelled = false;

    const syncThemeFromProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('id', userId)
          .maybeSingle();

        if (!cancelled && data?.theme_preference) {
          localStorage.setItem('slotimob-theme', data.theme_preference);
          document.documentElement.setAttribute('data-theme', data.theme_preference);
        }
      } catch {
        // fail silently
      }
    };

    // Initial sync from restored session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        void syncThemeFromProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user?.id) {
          // IMPORTANT: fire-and-forget to avoid auth callback deadlocks
          void syncThemeFromProfile(session.user.id);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
