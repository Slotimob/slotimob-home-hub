import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureKey } from '@/lib/help-features';

export interface HelpContent {
  id: string;
  feature_key: string;
  title: string;
  short_description: string | null;
  description: string | null;
  body_markdown: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  category: string | null;
}

export function useHelpContent(featureKey: FeatureKey | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['help-content', featureKey],
    queryFn: async () => {
      if (!featureKey) return null;
      const { data, error } = await supabase
        .from('training_content')
        .select('id, feature_key, title, short_description, description, body_markdown, video_url, duration_minutes, category')
        .eq('feature_key', featureKey)
        .eq('is_published', true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as HelpContent | null;
    },
    enabled: !!featureKey,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    content: data ?? null,
    isLoading,
    hasContent: !!data && !!(data.video_url || data.short_description),
  };
}
