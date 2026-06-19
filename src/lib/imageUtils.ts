export function normalizePropertyImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const OLD_PROJECT = 'utmrwepmcjhhmoefrfjr';
  const CURRENT_URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? '';
  const currentProject = CURRENT_URL.replace('https://', '').replace('.supabase.co', '');

  if (url.includes(OLD_PROJECT) && currentProject) {
    return url.replace(OLD_PROJECT, currentProject);
  }

  return url;
}
