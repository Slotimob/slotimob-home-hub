import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useGlowSettings = () => {
  const { user } = useAuth();
  const [glowIntensity, setGlowIntensity] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadGlowSettings();
    }
  }, [user]);

  useEffect(() => {
    // Apply glow intensity to CSS variable
    const intensity = glowIntensity / 100;
    document.documentElement.style.setProperty('--glow-intensity', intensity.toString());
    
    // Toggle glow-disabled class
    if (glowIntensity === 0) {
      document.documentElement.classList.add('glow-disabled');
    } else {
      document.documentElement.classList.remove('glow-disabled');
    }
  }, [glowIntensity]);

  const loadGlowSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('glow_intensity')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data?.glow_intensity !== null && data?.glow_intensity !== undefined) {
        setGlowIntensity(data.glow_intensity);
      }
    } catch (error) {
      console.error('Error loading glow settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGlowIntensity = async (intensity: number) => {
    setGlowIntensity(intensity);
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ glow_intensity: intensity })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating glow intensity:', error);
    }
  };

  return {
    glowIntensity,
    updateGlowIntensity,
    loading,
  };
};
