import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ENV_GTM_ID = import.meta.env.VITE_GTM_ID || 'GTM-PPNZLQM5';
const ENV_PIXEL_ID = import.meta.env.VITE_PIXEL_ID;

// Strict format validation for each tracking provider.
// Any character outside the pattern (including quotes, parentheses,
// HTML tags, scripts) causes the ID to be rejected and silently ignored.
const isValidGtmId = (id: string): boolean =>
  /^GTM-[A-Z0-9]{4,12}$/.test(id);

// GA4 starts with G-, Universal Analytics with UA-, Google Ads with AW-
const isValidGaId = (id: string): boolean =>
  /^(G|UA|AW)-[A-Z0-9-]{6,20}$/.test(id);

// Facebook Pixel ID: 15 or 16 digits
const isValidPixelId = (id: string): boolean =>
  /^[0-9]{15,16}$/.test(id);

// Extend window for tracking globals
declare global {
  interface Window {
    dataLayer: any[];
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

function injectGTM(id: string) {
  if (!isValidGtmId(id)) return;
  if (document.getElementById('gtm-script')) return;

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

  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);
}

function injectPixel(id: string) {
  if (!isValidPixelId(id)) return;
  if (document.getElementById('fb-pixel-script')) return;

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

function injectGA(id: string) {
  if (!isValidGaId(id)) return;
  if (document.getElementById('ga-script')) return;

  const script = document.createElement('script');
  script.id = 'ga-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  const inline = document.createElement('script');
  inline.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id}');
  `;
  document.head.appendChild(inline);
}

/** Fire a custom tracking event to both GTM dataLayer and Facebook Pixel */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({ event: eventName, ...params });
  }
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

/** Convenience: track StartTrial */
export function trackStartTrial(planId?: string) {
  trackEvent('StartTrial', { plan: planId });
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'StartTrial', { plan: planId });
  }
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [injected, setInjected] = useState(false);

  // Fetch marketing settings from DB with error fallback
  const { data: dbSettings, isError, isFetched } = useQuery({
    queryKey: ['marketing-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('category', 'marketing');
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        if (row.value) map[row.key] = row.value;
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Inject scripts once DB settings are resolved OR on error (env fallback)
  useEffect(() => {
    if (injected) return;
    // Wait until query has settled (success or error)
    if (!isFetched) return;

    const settings = isError ? {} : (dbSettings || {});
    const gtmId = settings.gtm_id || ENV_GTM_ID || '';
    const pixelId = settings.pixel_id || ENV_PIXEL_ID || '';
    const gaId = settings.ga_id || '';

    if (gtmId && isValidGtmId(gtmId)) {
      injectGTM(gtmId);
    } else if (gtmId) {
      console.warn('[Tracking] GTM ID inválido, ignorado por segurança.');
    }

    if (pixelId && isValidPixelId(pixelId)) {
      injectPixel(pixelId);
    } else if (pixelId) {
      console.warn('[Tracking] Pixel ID inválido, ignorado por segurança.');
    }

    if (gaId && isValidGaId(gaId)) {
      injectGA(gaId);
    } else if (gaId) {
      console.warn('[Tracking] GA ID inválido, ignorado por segurança.');
    }

    setInjected(true);
  }, [dbSettings, isError, isFetched, injected]);

  // Track page views on route change
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'virtual_page_view',
      page_path: location.pathname + location.search,
    });
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [location.pathname, location.search]);

  return <>{children}</>;
}
