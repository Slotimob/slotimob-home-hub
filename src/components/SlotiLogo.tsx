import { useEffect, useState } from 'react';
import slotiLogoDefault from '@/assets/sloti-logo.png';
import slotiLogoWhite from '@/assets/sloti-logo-white.png';

interface SlotiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SlotiLogo = ({ className = '', size = 'md' }: SlotiLogoProps) => {
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      setCurrentTheme(theme);
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  // Use white logo for dark themes
  const isDarkTheme = currentTheme.startsWith('dark-');
  const logoSrc = isDarkTheme ? slotiLogoWhite : slotiLogoDefault;

  return (
    <img
      src={logoSrc}
      alt="SLOTIMOB"
      className={`${sizeClasses[size]} object-contain shrink-0 ${className}`}
    />
  );
};
