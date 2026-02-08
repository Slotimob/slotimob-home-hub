import { useEffect, useState } from 'react';

export interface CapturedUtmData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  landing_page: string | null;
  referrer_url: string | null;
}

const UTM_STORAGE_KEY = 'sloti_utm_data';
const UTM_EXPIRY_KEY = 'sloti_utm_expiry';
const UTM_EXPIRY_HOURS = 24; // UTM data expires after 24 hours

/**
 * Hook to capture and persist UTM parameters from URL
 * UTM data is stored in sessionStorage and persists across page navigations
 */
export const useUtmCapture = () => {
  const [utmData, setUtmData] = useState<CapturedUtmData | null>(null);

  useEffect(() => {
    // Check for existing UTM data first
    const existingData = getStoredUtmData();
    
    // Capture new UTM params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const newUtmData: CapturedUtmData = {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      utm_content: urlParams.get('utm_content'),
      gclid: urlParams.get('gclid'),
      landing_page: window.location.pathname + window.location.search,
      referrer_url: document.referrer || null,
    };

    // Check if there's any new UTM data in the URL
    const hasNewUtmData = Object.entries(newUtmData).some(([key, value]) => {
      if (key === 'landing_page' || key === 'referrer_url') return false;
      return value !== null;
    });

    if (hasNewUtmData) {
      // New UTM data found, store it
      storeUtmData(newUtmData);
      setUtmData(newUtmData);
    } else if (existingData) {
      // Use existing stored data
      setUtmData(existingData);
    }
  }, []);

  return utmData;
};

/**
 * Get stored UTM data from sessionStorage
 */
export const getStoredUtmData = (): CapturedUtmData | null => {
  try {
    const expiry = sessionStorage.getItem(UTM_EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      // Data expired, clear it
      sessionStorage.removeItem(UTM_STORAGE_KEY);
      sessionStorage.removeItem(UTM_EXPIRY_KEY);
      return null;
    }

    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as CapturedUtmData;
    }
  } catch (error) {
    console.error('Error reading UTM data from storage:', error);
  }
  return null;
};

/**
 * Store UTM data in sessionStorage
 */
export const storeUtmData = (data: CapturedUtmData): void => {
  try {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(data));
    const expiryTime = Date.now() + UTM_EXPIRY_HOURS * 60 * 60 * 1000;
    sessionStorage.setItem(UTM_EXPIRY_KEY, expiryTime.toString());
  } catch (error) {
    console.error('Error storing UTM data:', error);
  }
};

/**
 * Clear stored UTM data (call after lead is created)
 */
export const clearStoredUtmData = (): void => {
  try {
    sessionStorage.removeItem(UTM_STORAGE_KEY);
    sessionStorage.removeItem(UTM_EXPIRY_KEY);
  } catch (error) {
    console.error('Error clearing UTM data:', error);
  }
};

/**
 * Merge stored UTM data with manual form data
 * Manual data takes precedence over stored data
 */
export const mergeUtmData = (
  manualData: Partial<CapturedUtmData>,
  storedData: CapturedUtmData | null
): Partial<CapturedUtmData> => {
  if (!storedData) return manualData;

  return {
    utm_source: manualData.utm_source || storedData.utm_source,
    utm_medium: manualData.utm_medium || storedData.utm_medium,
    utm_campaign: manualData.utm_campaign || storedData.utm_campaign,
    utm_term: manualData.utm_term || storedData.utm_term,
    utm_content: manualData.utm_content || storedData.utm_content,
    gclid: manualData.gclid || storedData.gclid,
    landing_page: storedData.landing_page, // Always use stored landing page
    referrer_url: storedData.referrer_url, // Always use stored referrer
  };
};
