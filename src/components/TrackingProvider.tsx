import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const GTM_ID = import.meta.env.VITE_GTM_ID;
const PIXEL_ID = import.meta.env.VITE_PIXEL_ID;

// Extend window for tracking globals
declare global {
  interface Window {
    dataLayer: any[];
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

function injectGTM(id: string) {
  if (!id || document.getElementById('gtm-script')) return;

  // GTM script
  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${id}');
  `;
  document.head.appendChild(script);

  // GTM noscript
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);
}

function injectPixel(id: string) {
  if (!id || document.getElementById('fb-pixel-script')) return;

  const script = document.createElement('script');
  script.id = 'fb-pixel-script';
  script.innerHTML = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','${id}');
    fbq('track','PageView');
  `;
  document.head.appendChild(script);

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/>`;
  document.body.appendChild(noscript);
}

/** Fire a custom tracking event to both GTM dataLayer and Facebook Pixel */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  // GTM
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({ event: eventName, ...params });
  }
  // Facebook Pixel
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, params);
  }
}

/** Convenience: track Lead signup */
export function trackLeadSignup(source?: string) {
  trackEvent('LeadSignup', { source });
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead', { source });
  }
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  // Inject scripts once
  useEffect(() => {
    if (GTM_ID) injectGTM(GTM_ID);
    if (PIXEL_ID) injectPixel(PIXEL_ID);
  }, []);

  // Track page views on route change
  useEffect(() => {
    // GTM virtual pageview
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'ViewPage',
        page_path: location.pathname + location.search,
      });
    }
    // FB Pixel pageview
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [location.pathname, location.search]);

  return <>{children}</>;
}
