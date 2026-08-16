import * as React from "react";

/**
 * Navigation-specific breakpoint.
 * Tablets in portrait (768-1023px) should keep the mobile navigation pattern
 * (bottom nav + off-canvas sidebar). The shared `useIsMobile` hook stays at
 * 768px for every other layout decision in the app.
 */
export const NAV_MOBILE_BREAKPOINT = 1024;

export function useIsNavMobile() {
  const [isNavMobile, setIsNavMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${NAV_MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsNavMobile(window.innerWidth < NAV_MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsNavMobile(window.innerWidth < NAV_MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isNavMobile;
}
