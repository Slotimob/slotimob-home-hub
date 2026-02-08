import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cleanupExpiredDrafts } from '@/hooks/useFormDraft';

export function GlowInitializer() {
  const { user } = useAuth();

  // Cleanup expired drafts on app load
  useEffect(() => {
    cleanupExpiredDrafts();
  }, []);

  useEffect(() => {
    if (user) {
      loadGlowSettings();
    } else {
      // Default intensity for non-logged users
      document.documentElement.style.setProperty('--glow-intensity', '0.5');
    }
  }, [user]);

  const loadGlowSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('glow_intensity')
        .eq('id', user?.id)
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
