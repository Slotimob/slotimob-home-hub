import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Aggressively clean up ALL SW caches on startup
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      // Keep only the current supabase-data-cache; purge everything else stale
      if (
        name === 'supabase-cache' ||
        name.startsWith('workbox-precache') ||
        name.startsWith('workbox-runtime')
      ) {
        caches.delete(name);
      }
    });
  });
}

// Listen for SW controller change (new SW activated) → force reload
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
