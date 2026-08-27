import { useEffect } from 'react';
import { normalizeTheme } from '@/lib/theme';

/**
 * Forces the institutional site theme on public pages.
 * This theme is fully independent from the app (light/dark) tokens.
 * Restores the user's saved theme on unmount (when navigating to dashboard, etc.).
 */
const SITE_THEME = 'site';

export function SiteThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const previousTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', SITE_THEME);

    return () => {
      const savedTheme = localStorage.getItem('slotimob-theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', normalizeTheme(savedTheme));
      } else if (previousTheme && previousTheme !== SITE_THEME) {
        document.documentElement.setAttribute('data-theme', previousTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };
  }, []);

  return <>{children}</>;
}

/** Backwards-compatibility alias */
export const LandingThemeProvider = SiteThemeProvider;
