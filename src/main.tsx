import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service worker: force update and clean stale caches
if ('serviceWorker' in navigator) {
  // Force SW update check on every page load
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg) {
      reg.update();
      // If there's a waiting SW, activate it immediately
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    }
  });

  // Check for SW updates when page becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.update();
      });
    }
  });

  // Clean up ALL stale caches from old SW versions on startup
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name === 'supabase-cache' || name.startsWith('workbox-precache')) {
          caches.delete(name);
        }
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
