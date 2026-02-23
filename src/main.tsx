import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clean up stale caches from old SW versions on startup
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      if (name === 'supabase-cache') {
        caches.delete(name);
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
