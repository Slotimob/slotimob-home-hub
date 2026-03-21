import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const BUCKET_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/`;
const SIGNED_PREFIX = `${SUPABASE_URL}/storage/v1/object/sign/whatsapp-media/`;

// Cache signed URLs to avoid re-fetching
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Resolves a media URL — if it's from our private whatsapp-media bucket,
 * generates a signed URL. External URLs pass through unchanged.
 */
export function useSignedMediaUrl(rawUrl: string | null | undefined): string | null {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!rawUrl) {
      setResolvedUrl(null);
      return;
    }

    // If it's already a signed URL, pass through
    if (rawUrl.includes(SIGNED_PREFIX) || rawUrl.includes('/object/sign/')) {
      setResolvedUrl(rawUrl);
      return;
    }

    // If it's a public bucket URL from our Supabase, extract path and sign it
    if (rawUrl.startsWith(BUCKET_PREFIX)) {
      const filePath = decodeURIComponent(rawUrl.replace(BUCKET_PREFIX, ''));

      // Check cache
      const cached = signedUrlCache.get(filePath);
      if (cached && cached.expiresAt > Date.now()) {
        setResolvedUrl(cached.url);
        return;
      }

      // Generate signed URL (1 hour)
      supabase.storage
        .from('whatsapp-media')
        .createSignedUrl(filePath, 3600)
        .then(({ data, error }) => {
          if (data?.signedUrl) {
            signedUrlCache.set(filePath, {
              url: data.signedUrl,
              expiresAt: Date.now() + 55 * 60 * 1000, // 55 min buffer
            });
            setResolvedUrl(data.signedUrl);
          } else {
            // Fallback to raw URL (may fail, but error state will handle it)
            console.warn('Failed to sign media URL:', error?.message);
            setResolvedUrl(rawUrl);
          }
        });
      return;
    }

    // External URL (WhatsApp CDN, etc.) — pass through
    setResolvedUrl(rawUrl);
  }, [rawUrl]);

  return resolvedUrl;
}
