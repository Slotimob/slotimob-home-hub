import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Cache cleanup is handled by Workbox (cleanupOutdatedCaches: true).



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
