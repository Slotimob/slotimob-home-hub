import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service worker registration — gentle update without aggressive reload
if ('serviceWorker' in navigator) {
  // Check for SW updates when page becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) reg.update();
      });
    }
  });

  // Only reload when user explicitly accepts (or on next natural navigation)
  // Removed aggressive controllerchange reload that was closing dialogs and losing form data
}

createRoot(document.getElementById("root")!).render(<App />);
