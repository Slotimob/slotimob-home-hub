import { useEffect } from 'react';
import { useUtmCapture } from '@/hooks/useUtmCapture';

/**
 * Component that initializes UTM capture on app load.
 * Add this component inside BrowserRouter to capture UTMs from the URL.
 */
export const UtmCaptureProvider = () => {
  // This hook captures UTMs from the URL on mount
  useUtmCapture();
  
  return null;
};
