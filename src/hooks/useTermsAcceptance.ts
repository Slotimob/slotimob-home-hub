import { useEffect, useState, useCallback } from 'react';
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

  const checkTermsAcceptance = useCallback(async () => {
    if (!userId) {
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

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

      if (profileResult.error) {
        console.error('Error fetching profile for terms:', profileResult.error);
        setStatus(prev => ({ ...prev, loading: false, needsReaccept: false }));
        return;
      }

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
      console.error('Error checking terms acceptance:', error);
      setStatus(prev => ({ ...prev, loading: false, needsReaccept: false }));
    }
  }, [userId]);

  useEffect(() => {
    checkTermsAcceptance();
  }, [checkTermsAcceptance]);

  const acceptTerms = async (version: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('accept_latest_terms', {
        p_terms_version: version,
      });

      if (error) {
        console.error('Error accepting terms via RPC:', error);
        return false;
      }

      // Update local state immediately
      setStatus(prev => ({
        ...prev,
        needsReaccept: false,
        userVersion: version,
        acceptedAt: new Date().toISOString(),
      }));

      return true;
    } catch (error) {
      console.error('Error accepting terms:', error);
      return false;
    }
  };

  const markAccepted = () => {
    setStatus(prev => ({
      ...prev,
      needsReaccept: false,
      userVersion: prev.currentVersion,
      acceptedAt: new Date().toISOString(),
    }));
  };

  return { ...status, markAccepted, acceptTerms, refreshStatus: checkTermsAcceptance };
};
