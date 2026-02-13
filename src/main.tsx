import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service worker: gentle update without aggressive reload
if ('serviceWorker' in navigator) {
  // Check for SW updates when page becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.update();
      });
    }
  });

  // Clean up any stale caches from old SW versions on startup
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        // Remove old supabase-cache (renamed to supabase-data-cache)
        if (name === 'supabase-cache') {
          caches.delete(name);
        }
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
