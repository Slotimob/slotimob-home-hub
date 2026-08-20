import { useEffect } from 'react';
import { normalizeTheme } from '@/lib/theme';

const FORCED_THEME = 'light';

/**
 * Forces a light theme on the current page regardless of saved or inherited
 * theme state. Restores the previous/saved theme on unmount so authenticated
 * pages keep the user's preference.
 */
export function useForceLightTheme() {
  useEffect(() => {
    const previousTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', FORCED_THEME);

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
}
