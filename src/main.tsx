import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force update check on page visibility change (user returns to tab)
if ('serviceWorker' in navigator) {
  // Check for SW updates when page becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.update();
      });
    }
  });

  // Reload page when a new SW takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
