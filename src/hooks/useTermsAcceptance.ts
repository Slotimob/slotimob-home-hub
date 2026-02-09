import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Fallback version - will be overridden by active version from database
export const CURRENT_TERMS_VERSION = '1.0';

interface TermsStatus {
  needsReaccept: boolean;
  loading: boolean;
  userVersion: string | null;
  acceptedAt: string | null;
  currentVersion: string;
}

export const useTermsAcceptance = (userId: string | undefined) => {
  const [status, setStatus] = useState<TermsStatus>({
    needsReaccept: false,
    loading: true,
    userVersion: null,
    acceptedAt: null,
    currentVersion: CURRENT_TERMS_VERSION,
  });

  useEffect(() => {
    if (!userId) {
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    const checkTermsAcceptance = async () => {
      try {
        // Fetch user profile and active terms version in parallel
        const [profileResult, termsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('terms_accepted_at, terms_version')
            .eq('id', userId)
            .maybeSingle(),
          supabase
            .from('terms_versions')
            .select('version')
            .eq('is_active', true)
            .maybeSingle(),
        ]);

        if (profileResult.error) {
          console.error('Error fetching profile for terms:', profileResult.error);
          // On error, don't block the user - assume terms accepted
          setStatus(prev => ({ ...prev, loading: false, needsReaccept: false }));
          return;
        }

        const userVersion = profileResult.data?.terms_version || null;
        const acceptedAt = profileResult.data?.terms_accepted_at || null;
        const currentVersion = termsResult.data?.version || CURRENT_TERMS_VERSION;
        
        // Check if user needs to re-accept terms
        const needsReaccept = !userVersion || userVersion !== currentVersion;

        setStatus({
          needsReaccept,
          loading: false,
          userVersion,
          acceptedAt,
          currentVersion,
        });
      } catch (error) {
        console.error('Error checking terms acceptance:', error);
        // On error, don't block the user
        setStatus(prev => ({ ...prev, loading: false, needsReaccept: false }));
      }
    };

    checkTermsAcceptance();
  }, [userId]);

  const markAccepted = () => {
    setStatus(prev => ({
      ...prev,
      needsReaccept: false,
      userVersion: prev.currentVersion,
      acceptedAt: new Date().toISOString(),
    }));
  };

  const refreshStatus = async () => {
    if (!userId) return;

    setStatus(prev => ({ ...prev, loading: true }));

    try {
      const [profileResult, termsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('terms_accepted_at, terms_version')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('terms_versions')
          .select('version')
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      if (profileResult.error) throw profileResult.error;

      const userVersion = profileResult.data?.terms_version || null;
      const acceptedAt = profileResult.data?.terms_accepted_at || null;
      const currentVersion = termsResult.data?.version || CURRENT_TERMS_VERSION;
      const needsReaccept = !userVersion || userVersion !== currentVersion;

      setStatus({
        needsReaccept,
        loading: false,
        userVersion,
        acceptedAt,
        currentVersion,
      });
    } catch (error) {
      console.error('Error refreshing terms status:', error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  return { ...status, markAccepted, refreshStatus };
};

