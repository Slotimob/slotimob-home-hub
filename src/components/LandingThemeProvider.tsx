import { useEffect } from 'react';
import { normalizeTheme } from '@/lib/theme';

/**
 * Forces a clean light theme on the landing page for enterprise SaaS aesthetics.
 * Restores the previous theme on unmount (when navigating to dashboard, etc.).
 */
const LANDING_THEME = 'light';

export function LandingThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const previousTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', LANDING_THEME);

    return () => {
      const savedTheme = localStorage.getItem('slotimob-theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', normalizeTheme(savedTheme));
      } else if (previousTheme) {
        document.documentElement.setAttribute('data-theme', previousTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };
  }, []);

  return <>{children}</>;
}
