import { useCallback, useEffect, useState } from 'react';

export const COOKIE_CONSENT_KEY = 'slotimob_cookie_consent';
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_EVENT = 'slotimob:cookie-consent-changed';
export const COOKIE_PREFERENCES_OPEN_EVENT = 'slotimob:cookie-preferences-open';

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: number;
}

/** Read the saved consent from localStorage (null when the visitor never chose). */
export function readCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      necessary: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      timestamp: parsed.timestamp || new Date().toISOString(),
      version: parsed.version ?? COOKIE_CONSENT_VERSION,
    };
  } catch {
    return null;
  }
}

/** Push a Google Consent Mode v2 update reflecting the given choice. */
export function applyConsentToGtag(consent: Pick<CookieConsent, 'analytics' | 'marketing'>) {
  if (typeof window === 'undefined') return;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  const gtag = (...args: any[]) => w.dataLayer.push(args);
  gtag('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
  });
  w.dataLayer.push({
    event: 'cookie_consent_update',
    cookie_analytics: consent.analytics,
    cookie_marketing: consent.marketing,
  });
  // Meta Pixel consent (no-op when fbq is not loaded yet)
  if (typeof w.fbq === 'function') {
    w.fbq('consent', consent.marketing ? 'grant' : 'revoke');
  }
}

/** Persist a choice and notify listeners. */
export function saveCookieConsent(choice: { analytics: boolean; marketing: boolean }): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    timestamp: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    /* ignore storage failures (private mode) */
  }
  applyConsentToGtag(consent);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
  return consent;
}

/** Open the cookie preferences dialog from anywhere (e.g. footer link). */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_OPEN_EVENT));
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => readCookieConsent());

  useEffect(() => {
    const handler = (e: Event) => setConsent((e as CustomEvent).detail as CookieConsent);
    window.addEventListener(COOKIE_CONSENT_EVENT, handler);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handler);
  }, []);

  const save = useCallback((choice: { analytics: boolean; marketing: boolean }) => {
    setConsent(saveCookieConsent(choice));
  }, []);

  return {
    consent,
    hasChoice: consent !== null,
    analyticsAllowed: !!consent?.analytics,
    marketingAllowed: !!consent?.marketing,
    save,
  };
}
