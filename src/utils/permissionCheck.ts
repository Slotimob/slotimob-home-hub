import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side permission check via edge function.
 * Use this before performing sensitive mutations to ensure
 * the user's JSONB permissions allow the action.
 * 
 * Returns true if allowed, false if denied.
 * Owners always return true.
 */
export async function checkPermissionServer(
  module: string,
  action: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('check-permission', {
      body: { module, action },
    });

    if (error) {
      console.error('Permission check failed:', error);
      return false;
    }

    return data?.allowed === true;
  } catch (err) {
    console.error('Permission check error:', err);
    return false;
  }
}
