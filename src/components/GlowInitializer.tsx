import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cleanupExpiredDrafts } from '@/hooks/useFormDraft';

export function GlowInitializer() {
  const [userId, setUserId] = useState<string | null>(null);

  // Listen to auth state without useAuth (avoids useNavigate hook)
  useEffect(() => {
    cleanupExpiredDrafts();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      loadGlowSettings(userId);
    } else {
      document.documentElement.style.setProperty('--glow-intensity', '0.5');
    }
  }, [userId]);

  const loadGlowSettings = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('glow_intensity')
        .eq('id', uid)
        .single();

      if (error) throw error;
      
      const intensity = (data?.glow_intensity ?? 50) / 100;
      document.documentElement.style.setProperty('--glow-intensity', intensity.toString());
      
      if (data?.glow_intensity === 0) {
        document.documentElement.classList.add('glow-disabled');
      } else {
        document.documentElement.classList.remove('glow-disabled');
      }
    } catch (error) {
      console.error('Error loading glow settings:', error);
      document.documentElement.style.setProperty('--glow-intensity', '0.5');
    }
  };

  return null;
}
