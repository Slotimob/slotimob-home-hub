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

  // Sync theme from profile to localStorage on auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user?.id) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('theme_preference')
              .eq('id', session.user.id)
              .maybeSingle();

            if (data?.theme_preference) {
              localStorage.setItem('slotimob-theme', data.theme_preference);
              document.documentElement.setAttribute('data-theme', data.theme_preference);
            }
          } catch {
            // fail silently
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
